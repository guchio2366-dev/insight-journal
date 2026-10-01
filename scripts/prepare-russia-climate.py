"""Prepare Russia's broad climate map from the pinned 0.1-degree source.

Uses original categorical cells, including both sides of the date line.
Requires NumPy and Pillow; no network requests or boundary edits are made.
--source accepts the publisher archive or the preserved TIFF source member.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image

from atlas_asia_climate_palette import display_classes, palette_record

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/atlas/russia-climate-v1"
SOURCE_OUT = ROOT / "data-source/atlas/russia/nature"
ARCHIVE_SHA256 = "d37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d"
MEMBER = "1991_2020/koppen_geiger_0p1.tif"
MEMBER_SHA256 = "7db968672815435562b8428f0752c2e67af7e6bb235e2969eb2db28bce428361"
ARCHIVE_URL = "https://ndownloader.figshare.com/files/45057352"
BOUNDS = [18, 40, 191, 83]
WIDTH, HEIGHT = 1730, 430
ROW_START, ROW_STOP = 70, 500
WEST_START, WEST_STOP, EAST_STOP = 1980, 3600, 110


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def file_digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def text_digest(path: Path) -> str:
    return digest(path.read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n"))


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
                    encoding="utf-8", newline="\n")


def load_source(path: Path) -> tuple[bytes, bool]:
    if zipfile.is_zipfile(path):
        if file_digest(path) != ARCHIVE_SHA256:
            raise ValueError("Publisher archive SHA256 differs from pinned source")
        with zipfile.ZipFile(path) as archive:
            raw = archive.read(MEMBER)
        archive_verified = True
    else:
        raw = path.read_bytes()
        archive_verified = False
    if digest(raw) != MEMBER_SHA256:
        raise ValueError("Climate TIFF SHA256 differs from pinned source member")
    return raw, archive_verified


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()
    raw, archive_verified = load_source(args.source)
    with Image.open(io.BytesIO(raw)) as image:
        if image.size != (3600, 1800) or image.mode != "L":
            raise ValueError("Expected publisher 0.1-degree uint8 global source")
        scale = list(image.tag_v2[33550])
        tie = list(image.tag_v2[33922])
        keys = list(image.tag_v2[34735])
        directory = {keys[i]: keys[i + 3] for i in range(4, len(keys), 4)}
        if scale != [0.1, 0.1, 0.0] or tie != [0.0, 0.0, 0.0, -180.0, 90.0, 0.0]:
            raise ValueError("Unexpected original source transform")
        if directory.get(2048) != 4326 or directory.get(1025) != 1 or str(image.tag_v2[42113]) != "0":
            raise ValueError("Expected EPSG:4326 pixel-is-area, no-data 0")
        source = np.asarray(image, dtype=np.uint8).copy()
    if source.shape != (1800, 3600) or source.max() > 30:
        raise ValueError("Unexpected source class IDs")
    west = source[ROW_START:ROW_STOP, WEST_START:WEST_STOP]
    east = source[ROW_START:ROW_STOP, :EAST_STOP]
    grid = np.concatenate((west, east), axis=1)
    if grid.shape != (HEIGHT, WIDTH) or not np.array_equal(grid[:, :1620], west) or not np.array_equal(grid[:, 1620:], east):
        raise ValueError("Original date-line cell slices were changed")
    classes = display_classes()
    if {item["id"] for item in classes} != set(range(1, 31)):
        raise ValueError("Expected all 30 original class IDs")
    by_id = {item["id"]: item for item in classes}
    palette = np.zeros((31, 4), dtype=np.uint8)
    for item in classes:
        palette[item["id"]] = [*bytes.fromhex(item["color"][1:]), 255]
    actual_ids = sorted(int(value) for value in np.unique(grid) if value != 0)
    OUT.mkdir(parents=True, exist_ok=True)
    SOURCE_OUT.mkdir(parents=True, exist_ok=True)
    preserved = SOURCE_OUT / "koppen_geiger_0p1_1991_2020.tif"
    if preserved.exists() and digest(preserved.read_bytes()) != MEMBER_SHA256:
        raise ValueError("Existing preserved source differs from the pinned member")
    preserved.write_bytes(raw)
    rgba = palette[grid]
    Image.fromarray(rgba).save(OUT / "climate.png", optimize=True)
    (OUT / "climate-grid.bin.gz").write_bytes(gzip.compress(grid.tobytes(), mtime=0))
    write_json(OUT / "legend.json", classes)
    if not np.array_equal(np.asarray(Image.open(OUT / "climate.png")), rgba):
        raise ValueError("PNG values do not match classification grid")
    if gzip.decompress((OUT / "climate-grid.bin.gz").read_bytes()) != grid.tobytes():
        raise ValueError("Classification grid roundtrip failed")
    anchors = []
    for name, longitude, latitude in [
        ("Kaliningrad", 20.51, 54.70), ("Moscow", 37.62, 55.75),
        ("Novosibirsk", 82.92, 55.03), ("Yakutsk", 129.73, 62.03),
        ("Vladivostok", 131.89, 43.12), ("Chukotka west of 180", 177.0, 66.0),
        ("Chukotka east of 180", -173.0, 66.0),
    ]:
        source_col = int(np.floor((longitude + 180) * 10))
        source_row = int(np.floor((90 - latitude) * 10))
        col = (source_col - WEST_START) % 3600
        row = source_row - ROW_START
        identifier = int(grid[row, col])
        if identifier != int(source[source_row, source_col]):
            raise ValueError("Source-cell anchor identity failed: " + name)
        anchors.append({"name": name, "longitude": longitude, "latitude": latitude,
                        "longitudeUnwrapped": longitude if longitude >= 0 else longitude + 360,
                        "sourceRow": source_row, "sourceColumn": source_col,
                        "outputRow": row, "outputColumn": col, "classId": identifier,
                        "code": by_id[identifier]["code"] if identifier else None})
    source_record = {
        "dataset": "Beck et al. (2023), Koppen-Geiger maps", "period": "1991-2020",
        "archiveUrl": ARCHIVE_URL, "archiveSha256": ARCHIVE_SHA256,
        "member": MEMBER, "memberSha256": MEMBER_SHA256, "memberBytes": len(raw),
        "citation": "https://doi.org/10.1038/s41597-023-02549-6",
        "metadataUrl": "https://api.figshare.com/v2/articles/21789074/versions/1",
        "license": "CC BY 4.0", "licenseUrl": "https://www.gloh2o.org/koppen/",
        "preservedMember": preserved.relative_to(ROOT).as_posix(),
        "sourceGrid": {"crs": "EPSG:4326", "width": 3600, "height": 1800,
                       "resolutionDegrees": 0.1, "pixelScale": scale, "tiepoint": tie,
                       "geoKeyDirectory": keys, "noData": 0},
        "reproduction": "python scripts/prepare-russia-climate.py --source data-source/atlas/russia/nature/koppen_geiger_0p1_1991_2020.tif",
    }
    write_json(SOURCE_OUT / "climate-source-record.json", source_record)
    files = {name: {"bytes": (OUT / name).stat().st_size, "sha256": file_digest(OUT / name)}
             for name in ["climate.png", "climate-grid.bin.gz", "legend.json"]}
    display_palette = palette_record()
    for key, hash_key in [("reference", "referenceSha256"), ("legend", "legendSha256"), ("script", "scriptSha256")]:
        display_palette[hash_key] = text_digest(ROOT / display_palette[key])
    display_palette["digestMethod"] = "SHA256 of UTF-8 text normalized from CRLF/CR to LF"
    manifest = {
        "schemaVersion": 1, "region": "russia", "version": "1.0.0",
        "period": "1991-2020", "unit": "Koppen-Geiger categorical class ID",
        "boundsUnwrapped": BOUNDS, "width": WIDTH, "height": HEIGHT,
        "actualClassIds": actual_ids, "actualClassIdsScope": "Nonzero IDs in the unmasked source cutout, before political-boundary clipping",
        "image": "climate.png", "grid": "climate-grid.bin.gz", "legend": "legend.json",
        "source": source_record,
        "lookup": {"encoding": "uint8-gzip", "width": WIDTH, "height": HEIGHT,
                   "boundsUnwrapped": BOUNDS, "noData": 0, "unit": "categorical class ID, not a numerical magnitude"},
        "display": {"crs": "EPSG:4326 with unwrapped east longitudes 18 to 191",
                    "projection": "Consumer must use the same frame and projection for raster and vector geometry; no map projection is baked into the source grid",
                    "resolutionDegrees": 0.1, "sourceResolution": "Publisher 0.1-degree broad-view product, not the 1 km product",
                    "dateLineColumn": 1620, "missing": "Class 0 is transparent and means unclassified/no-data; never a climate zone. Water and unclassified small land can both be 0.",
                    "clip": "UI boundary treatment belongs to the regional geometry owner. This asset does not clip, assign sovereignty or compute country totals.",
                    "palette": display_palette},
        "processing": {"script": "scripts/prepare-russia-climate.py", "scriptSha256": text_digest(Path(__file__)),
                       "scriptDigestMethod": "SHA256 of UTF-8 script normalized from CRLF/CR to LF",
                       "method": "Exact original array slices, half-open rows [70,500), columns [1980,3600) then [0,110). No interpolation, averaging, class merging, nearest-land imputation or replacement of missing values.",
                       "sourceRows": [ROW_START, ROW_STOP], "sourceColumnSpans": [[WEST_START, WEST_STOP], [0, EAST_STOP]],
                       "jsonEncoding": "UTF-8, LF; binary hashes use exact bytes"},
        "verification": {"pinnedMemberSha256": True, "sourceTransformAndCrs": True,
                         "bothDateLineHalvesMatchSource": True, "allPngPixelsMatchGrid": True,
                         "gridRoundTrip": True, "knownSourceCellSamples": anchors},
        "coverage": {"classifiedCells": int(np.count_nonzero(grid)), "noDataCells": int((grid == 0).sum()),
                     "scope": "Rectangular source-window diagnostics, including surrounding countries; not Russia land area or population coverage"},
        "limitations": ["0.1-degree source cells can omit narrow islands and coastlines; zooming the image cannot create finer climate information.",
                        "Any later detailed regional view needs the pinned 1 km product and fresh coverage checks. No detail is fabricated in this first edition.",
                        "The map describes long-term 1991-2020 climate classes, not current weather, temperature, rainfall totals or crop production.",
                        "Classification IDs are labels; never average or sum them, and never treat pixel counts as land area.",
                        "Political boundaries and disputed-territory presentation require separate evidence. The rectangular cutout contains context countries."],
        "files": files,
    }
    write_json(OUT / "manifest.json", manifest)
    print(json.dumps({"shape": [HEIGHT, WIDTH], "actualClassIds": actual_ids, "archiveVerifiedThisRun": archive_verified,
                      "sourceMemberSha256": MEMBER_SHA256, "files": files}, ensure_ascii=True))


if __name__ == "__main__":
    main()
