#!/usr/bin/env python3
"""Prepare the GA 2025 Australian operating-mine point subset, without network IO.

Example:
  python scripts/prepare-oceania-mines.py --source /path/to/ga-operating-mines-layer0-source.json \
    --metadata /path/to/ga-operating-mines-layer0-metadata.json \
    --retrieval /path/to/ga-operating-mines-retrieval.json

The input bytes and metadata are pinned. A newly updated live service must not be
silently substituted for this 2025 reference. Ports and transport routes are not
part of this data. Names are not unique mine identifiers; distinct same-name
records are kept when their coordinates differ.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path

SOURCE_SHA256 = "65d720cab1228efe147b2e069c7b7862318c90d474310d5baacd8fdf992fb14d"
METADATA_SHA256 = "5aa0b676c68d57948d83317da3e4ddb827c4140bc875e0f6028c3fe01fde9e35"
QUERY_URL = "https://services.ga.gov.au/gis/rest/services/AustralianOperatingMines/MapServer/0/query?where=1%3D1&outFields=%2A&returnGeometry=true&outSR=4326&f=pjson"
LAYER_URL = "https://services.ga.gov.au/gis/rest/services/AustralianOperatingMines/MapServer/0"
SOURCE_LABEL = "Australian Operating Mines Map 2025, https://doi.org/10.26186/150821"
EXPECTED_COUNT = 347


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def canonical_script_bytes(raw: bytes) -> bytes:
    """Hash the same UTF-8 script identically after Git newline conversion."""
    return raw.replace(b"\r\n", b"\n").replace(b"\r", b"\n")


def pinned_json(path: Path, expected_hash: str) -> tuple[dict, bytes]:
    raw = path.read_bytes()
    if sha256(raw) != expected_hash:
        raise ValueError(f"Source hash mismatch: {path.name}")
    value = json.loads(raw)
    if "error" in value:
        raise ValueError(f"ArcGIS error response: {path.name}")
    return value, raw


def validate_source(source: dict, metadata: dict) -> tuple[list[dict], dict]:
    if source.get("exceededTransferLimit"):
        raise ValueError("Incomplete source: exceededTransferLimit")
    if metadata.get("id") != 0 or metadata.get("name") != "Operating_Mines":
        raise ValueError("Only the Operating_Mines layer 0 may be used")
    if "Creative Commons Attribution 4.0" not in metadata.get("copyrightText", ""):
        raise ValueError("Expected GA CC BY 4.0 license not found")
    if source.get("spatialReference", {}).get("wkid") != 4326:
        raise ValueError("The queried point geometry must use EPSG:4326")
    features = source.get("features", [])
    if len(features) != EXPECTED_COUNT:
        raise ValueError(f"Expected {EXPECTED_COUNT} points, found {len(features)}")
    records = []
    object_ids: set[int] = set()
    coordinates: set[tuple[float, float]] = set()
    record_keys: set[tuple] = set()
    max_geometry_field_difference = 0.0
    for feature in features:
        a = feature["attributes"]
        if a.get("status") != "Operating mine":
            raise ValueError(f"Non-operating record: {a.get('name')}")
        if a.get("source") != SOURCE_LABEL:
            raise ValueError(f"Unexpected source version: {a.get('name')}")
        identity = a["objectid"]
        if identity in object_ids:
            raise ValueError(f"Duplicate source objectid: {identity}")
        object_ids.add(identity)
        # Use the service's requested WGS84 geometry. The original GDA94 fields
        # remain unchanged in the pinned source; their agreement is diagnosed.
        lon, lat = feature["geometry"]["x"], feature["geometry"]["y"]
        if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in (lon, lat)):
            raise ValueError(f"Invalid point: {a.get('name')}")
        if not (105 <= lon <= 156 and -44 <= lat <= -10):
            raise ValueError(f"Point outside Australian source extent: {a.get('name')}")
        if (lon, lat) in coordinates:
            raise ValueError(f"Duplicate coordinate: {a.get('name')}")
        coordinates.add((lon, lat))
        for field in ("name", "commodity_group", "source"):
            if not isinstance(a.get(field), str) or not a[field].strip():
                raise ValueError(f"Missing {field}: source objectid {identity}")
        key = (a["name"], lon, lat, a["commodity_group"])
        if key in record_keys:
            raise ValueError(f"Duplicate record: {a['name']}")
        record_keys.add(key)
        max_geometry_field_difference = max(max_geometry_field_difference, abs(lon-a["longitude"]), abs(lat-a["latitude"]))
        records.append({"country": "AUS", "latitude": lat, "longitude": lon,
                        "name": a["name"], "commodity_group": a["commodity_group"], "source": a["source"]})
    records.sort(key=lambda r: (r["commodity_group"], r["name"], r["longitude"], r["latitude"]))
    name_counts = Counter(r["name"] for r in records)
    diagnostics = {
        "inputCount": len(features), "outputCount": len(records),
        "invalidCoordinates": 0, "duplicateObjectIds": 0,
        "duplicateCoordinates": 0, "duplicateRecords": 0,
        "repeatedNamesRetained": {name: count for name, count in sorted(name_counts.items()) if count > 1},
        "commodityGroupCounts": dict(sorted(Counter(r["commodity_group"] for r in records).items())),
        "maxGeometryFieldDifferenceDegrees": max_geometry_field_difference,
    }
    return records, diagnostics


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--retrieval", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1] / "public/assets/atlas/oceania-industry-v1")
    args = parser.parse_args()
    source, raw_source = pinned_json(args.source, SOURCE_SHA256)
    metadata, raw_metadata = pinned_json(args.metadata, METADATA_SHA256)
    retrieval = json.loads(args.retrieval.read_bytes())
    source_retrieval = next((r for r in retrieval if r.get("sha256") == SOURCE_SHA256), None)
    if not source_retrieval or source_retrieval.get("url") != QUERY_URL or source_retrieval.get("exceededTransferLimit"):
        raise ValueError("A matching complete source retrieval record is required")
    records, diagnostics = validate_source(source, metadata)
    data = {"version": 1, "referenceYear": 2025, "records": records}
    data_text = json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n"
    data_bytes = data_text.encode("utf-8")
    manifest = {
        "version": 1, "region": "oceania", "field": "industry", "dataset": "australian-operating-mines",
        "referenceYear": 2025, "retrievedAt": source_retrieval["retrievedAt"],
        "publisher": "Geoscience Australia", "source": SOURCE_LABEL,
        "url": LAYER_URL, "queryUrl": QUERY_URL, "doi": "https://doi.org/10.26186/150821",
        "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
        "copyrightText": metadata["copyrightText"], "sourceStatus": "Operating mine", "sourceLayer": 0,
        "sourceSha256": SOURCE_SHA256, "sourceBytes": len(raw_source),
        "metadataSha256": METADATA_SHA256, "metadataBytes": len(raw_metadata),
        "sourceFieldCrs": "EPSG:4283 (GDA94)", "outputCrs": "EPSG:4326 (WGS84 geometry returned by the source query)",
        "coordinateMethod": "Use query geometry x/y with outSR=4326; preserve names, commodity_group and source without translation.",
        "data": "mines.json", "dataSha256": sha256(data_bytes), "dataBytes": len(data_bytes),
        "preparation": {
            "script": "scripts/prepare-oceania-mines.py",
            "scriptSha256": sha256(canonical_script_bytes(Path(__file__).read_bytes())),
            "scriptHashNormalization": "Normalize CRLF and CR to LF; all other UTF-8 source bytes are unchanged.",
            "generatedJsonNewline": "LF",
            "rawSourceHashNormalization": "None: hash the exact downloaded bytes.",
        },
        "recordCount": len(records), "pointQuantity": "One registered operating mine location; no production, reserves or capacity measure.",
        "coverage": "Australian Operating Mines Map 2025 only; not an Oceania-wide mining inventory.",
        "limitations": ["Excludes developing and care-and-maintenance layers.", "Point counts and symbol sizes must not imply production or reserves.", "No ports, freight relationships or transport routes are included.", "Two Blackwater records are distinct source points and are retained."],
        "diagnostics": diagnostics,
    }
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "mines.json").write_text(data_text, encoding="utf-8", newline="\n")
    (args.out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"recordCount": len(records), "dataSha256": manifest["dataSha256"], "dataBytes": len(data_bytes), "diagnostics": diagnostics}, ensure_ascii=True))


if __name__ == "__main__":
    main()
