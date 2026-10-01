"""Extract all source-defined Oceania urban centres from pinned UCDB caches.

Offline, standard-library only. No population raster or national totals are made.
Usage: python scripts/prepare-oceania-centres.py --urban-cache PATH
"""
from pathlib import Path
import argparse
import csv
import hashlib
import io
import json
import math
import sqlite3
import struct
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/atlas/oceania-population-v1"
YEARS = (2000, 2010, 2020)
RADIUS = 6378137.0
BASE = "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_UCDB_GLOBE_R2024A/GHS_UCDB_THEME_GLOBE_R2024A/"
SOURCES = {
    "GENERAL_CHARACTERISTICS": {
        "file": "GHS_UCDB_THEME_GENERAL_CHARACTERISTICS_GLOBE_R2024A_V1_2.zip",
        "sha256": "bc879d82320504f89df2041b7936221c8239cd808abe93980493aed062b4f3d6",
    },
    "GHSL": {
        "file": "GHS_UCDB_THEME_GHSL_GLOBE_R2024A_V1_2.zip",
        "sha256": "df8844961b663104e8e51ee656eafebed5336e5a946d92f6d7f31d4be75a9032",
    },
}
EXPECTED_COUNTS = {"AUS": 35, "NZL": 9, "PNG": 10, "FJI": 2,
                   "SLB": 1, "VUT": 1, "NCL": 1, "WSM": 1, "TON": 1, "PYF": 1}
EXPECTED_CODES = set("AUS NZL PNG FJI SLB VUT NCL FSM MHL PLW NRU KIR GUM MNP WSM ASM TON TUV COK NIU PYF WLF PCN NFK ATC".split())


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1048576):
            digest.update(chunk)
    return digest.hexdigest()


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"),
                               allow_nan=False) + "\n", encoding="utf-8", newline="\n")


def population(value):
    if value.strip() in ("", "NA", "-9999"):
        return None
    result = float(value)
    if not math.isfinite(result) or result < 0:
        raise ValueError(f"Unexpected population value: {value}")
    return result


def inverse_mollweide(x, y):
    """Inverse spherical Mollweide of the declared ESRI:54009 source CRS.

    The source CRS has WGS84 semi-major axis 6378137 m, central meridian 0,
    false easting/northing 0. Its GC_UCC_LON/LAT attributes are metres.
    """
    theta = math.asin(y / (math.sqrt(2) * RADIUS))
    latitude = math.asin((2 * theta + math.sin(2 * theta)) / math.pi)
    longitude = math.pi * x / (2 * math.sqrt(2) * RADIUS * math.cos(theta))
    return math.degrees(longitude), math.degrees(latitude)


def forward_mollweide(longitude, latitude):
    phi = math.radians(latitude)
    theta = phi
    for _ in range(30):
        step = (2 * theta + math.sin(2 * theta) - math.pi * math.sin(phi)) / (2 + 2 * math.cos(2 * theta))
        theta -= step
        if abs(step) < 1e-14:
            break
    return (2 * math.sqrt(2) * RADIUS * math.radians(longitude) * math.cos(theta) / math.pi,
            math.sqrt(2) * RADIUS * math.sin(theta))


def point_from_geopackage(raw):
    if raw[:2] != b"GP":
        raise ValueError("Invalid GeoPackage geometry header")
    flags = raw[3]
    endian = "<" if flags & 1 else ">"
    if struct.unpack(endian + "i", raw[4:8])[0] != 54009:
        raise ValueError("Unexpected point CRS")
    envelope = (flags >> 1) & 7
    offset = 8 + {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[envelope]
    wkb = raw[offset:]
    endian = "<" if wkb[0] == 1 else ">"
    if struct.unpack(endian + "I", wkb[1:5])[0] != 1:
        raise ValueError("Expected 2D point WKB")
    return struct.unpack(endian + "dd", wkb[5:21])


def read_member(archive, member, ledger, encoding=None):
    raw = archive.read(member)
    ledger.append({"name": member, "sha256": hashlib.sha256(raw).hexdigest(),
                   "bytes": len(raw), **({"encoding": encoding} if encoding else {})})
    return raw


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--urban-cache", required=True, type=Path)
    args = parser.parse_args()
    geography = json.loads((ROOT / "src/data/atlas/oceania-countries.json").read_text(encoding="utf-8"))
    targets = {f["properties"]["code"]: f["properties"]["name"] for f in geography["features"]
               if f["properties"]["kind"] == "oceania"}
    if set(targets) != EXPECTED_CODES:
        raise ValueError("Unexpected Oceania scope; review the explicit 25-target contract")
    names = {name: code for code, name in targets.items()}
    inputs = []
    general_rows = []
    histories = {}
    centroids = {}
    for theme, source in SOURCES.items():
        path = args.urban_cache / source["file"]
        actual_sha = sha(path)
        if actual_sha != source["sha256"]:
            raise ValueError(f"Pinned input hash mismatch: {path.name}")
        entry = {"file": path.name, "sha256": actual_sha, "bytes": path.stat().st_size,
                 "url": BASE + "GHS_UCDB_THEME_" + theme + "_GLOBE_R2024A/V1-2/" + path.name,
                 "members": []}
        with zipfile.ZipFile(path) as archive:
            member = "GHS_UCDB_THEME_" + theme + "_GLOBE_R2024A.csv"
            encoding = "utf-8-sig" if theme == "GENERAL_CHARACTERISTICS" else "latin-1"
            raw = read_member(archive, member, entry["members"], encoding)
            rows = list(csv.DictReader(io.StringIO(raw.decode(encoding))))
            if len({r["ID_UC_G0"] for r in rows}) != len(rows):
                raise ValueError(f"Duplicate source IDs: {member}")
            if theme == "GHSL":
                histories = {int(r["ID_UC_G0"]): {str(y): population(r["GH_POP_TOT_" + str(y)])
                             for y in YEARS} for r in rows}
            else:
                general_rows = [r for r in rows if r["GC_CNT_GAD_2025"] in names]
                member = "GHS_UCDB_THEME_GENERAL_CHARACTERISTICS_GLOBE_R2024A.gpkg"
                gpkg_raw = read_member(archive, member, entry["members"])
                with tempfile.TemporaryDirectory(prefix="oceania-centres-") as directory:
                    gpkg = Path(directory) / "general.gpkg"
                    gpkg.write_bytes(gpkg_raw)
                    db = sqlite3.connect(f"file:{gpkg.as_posix()}?mode=ro", uri=True)
                    try:
                        srs = db.execute("select definition from gpkg_spatial_ref_sys where srs_id=54009").fetchone()[0]
                        if not all(token in srs for token in ('PROJECTION["Mollweide"]', '6378137',
                                   'PARAMETER["central_meridian",0]', 'PARAMETER["false_easting",0]',
                                   'PARAMETER["false_northing",0]')):
                            raise ValueError("Unsupported source Mollweide definition")
                        crs = db.execute("select srs_id from gpkg_geometry_columns where table_name='UC_centroids'").fetchone()[0]
                        if crs != 54009:
                            raise ValueError("Unexpected centroid layer CRS")
                        for uid, x, y, geom in db.execute("select ID_UC_G0,GC_UCC_LON_2025,GC_UCC_LAT_2025,geom from UC_centroids").fetchall():
                            gx, gy = point_from_geopackage(geom)
                            if math.hypot(gx - x, gy - y) > .02:
                                raise ValueError("Centroid attributes disagree with source point")
                            if uid in centroids:
                                raise ValueError("Duplicate centroid ID")
                            centroids[uid] = (x, y)
                    finally:
                        db.close()
                entry["coordinateCrs"] = "ESRI:54009"
                entry["crsDefinition"] = srs
        inputs.append(entry)
    centres = []
    max_roundtrip = 0.0
    for row in general_rows:
        uid = int(row["ID_UC_G0"])
        if uid not in histories or uid not in centroids:
            raise ValueError(f"Missing exact-ID join: {uid}")
        x, y = centroids[uid]
        longitude, latitude = inverse_mollweide(x, y)
        if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
            raise ValueError(f"Invalid transformed coordinate: {uid}")
        fx, fy = forward_mollweide(longitude, latitude)
        max_roundtrip = max(max_roundtrip, math.hypot(fx - x, fy - y))
        centres.append({"id": "uc-" + str(uid), "sourceId": uid,
                        "name": row["GC_UCN_MAI_2025"], "sourceName": row["GC_UCN_MAI_2025"],
                        "country": names[row["GC_CNT_GAD_2025"]],
                        "coordinates": [longitude, latitude], "population": histories[uid]["2020"],
                        "history": histories[uid], "areaKm2_2025": float(row["GC_UCA_KM2_2025"]),
                        "sourceCentroid54009": [x, y]})
    centres.sort(key=lambda c: (c["country"], -(c["population"] or 0), c["sourceId"]))
    coverage = {}
    for code, name in sorted(targets.items()):
        matches = [c for c in centres if c["country"] == code]
        count = len(matches)
        if count != EXPECTED_COUNTS.get(code, 0):
            raise ValueError(f"Unexpected source coverage: {code} {count}")
        coverage[code] = {"name": name, "sourceUrbanCentres": count, "listedUrbanCentres": count,
                          "centresWithPopulation2020": sum(c["population"] is not None for c in matches),
                          "status": "source-defined-centres-listed" if count else "no-source-defined-centre-record",
                          "message": "収録されている都市中心をすべて表示。国・地域全体の人口ではありません。" if count else
                          "定義を満たす都市中心が本データに未収録。人口ゼロや居住地がないことを意味しません。"}
    # Independent place-range checks include both sides of the date line.
    checks = {"Sydney": (150, -35, 152, -33), "Auckland": (174, -38, 176, -36),
              "Suva": (177, -19, 180, -17), "Papeete": (-151, -19, -148, -16),
              "Port Moresby": (146, -11, 149, -8)}
    check_coordinates = {}
    for name, bounds in checks.items():
        chosen = [c for c in centres if c["sourceName"] == name]
        if len(chosen) != 1:
            raise ValueError(f"Expected unique known-place check: {name}")
        lon, lat = chosen[0]["coordinates"]
        if not bounds[0] < lon < bounds[2] or not bounds[1] < lat < bounds[3]:
            raise ValueError(f"Known-place transform failed: {name}")
        check_coordinates[name] = [lon, lat]
    if max_roundtrip > 1e-6:
        raise ValueError("Projection roundtrip failed")
    OUT.mkdir(parents=True, exist_ok=True)
    write(OUT / "centres.json", {"schemaVersion": 1, "sourceEdition": "GHS-UCDB R2024A V1.2",
          "populationYear": 2020, "populationYears": list(YEARS), "urbanBoundaryYear": 2025,
          "coordinateCrs": "EPSG:4326", "unit": "people within source-defined urban centre",
          "centres": centres, "countryCoverage": coverage})
    output = OUT / "centres.json"
    write(OUT / "manifest.json", {"schemaVersion": 1, "sourceEdition": "GHS-UCDB R2024A V1.2",
          "sourceUrl": "https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php",
          "license": "CC BY 4.0", "licenseUrl": "https://human-settlement.emergency.copernicus.eu/GHSLhowToCite.php",
          "populationYears": list(YEARS), "urbanBoundaryYear": 2025,
          "sourceCoordinateCrs": "ESRI:54009", "outputCoordinateCrs": "EPSG:4326",
          "unit": "people within source-defined urban centre", "inputs": inputs,
          "method": "Exact ID_UC_G0 join of general CSV, general GeoPackage UC_centroids and GHSL CSV. All source-defined centres assigned by GC_CNT_GAD_2025 to the 25 adopted Oceania countries/territories are retained. No top-N selection. Source centroid metre coordinates are converted by inverse spherical Mollweide with radius 6378137 m, central meridian and false offsets 0, as declared in the GeoPackage; original negative western longitudes are retained. No nearest-land imputation, raster-derived values, country totals or population rounding.",
          "limitations": ["Urban centres are publisher-defined population concentrations, not municipalities, all settlements or all capitals.",
             "Population years 2000, 2010 and 2020 use the fixed 2025 urban footprint. Changes do not measure expansion of the urban boundary.",
             "No source-defined centre for a country/territory does not mean zero population. This subset cannot replace a population-distribution grid or national/island population statistics.",
             "Country attribution is the source GC_CNT_GAD_2025 name matched to the adopted regional scope. The scope includes territories and is not a list of 25 sovereign states.",
             "Map consumers must wrap EPSG:4326 longitudes consistently with the Pacific-centred basemap; Papeete retains longitude about -149.58 degrees."],
          "countryCoverage": coverage,
          "validation": {"pinnedArchiveSha256Verified": True, "uniqueExactIdJoin": True,
             "urbanCentreCount": len(centres), "targetCount": len(targets),
             "allPopulationYearsPresent": all(all(v is not None for v in c["history"].values()) for c in centres),
             "centroidAttributesMatchGpkgPointWithinMetres": .02,
             "maximumProjectionRoundtripErrorMetres": max_roundtrip, "knownPlaceCoordinates": check_coordinates},
          "files": {output.name: {"bytes": output.stat().st_size, "sha256": sha(output)}}})
    print(json.dumps({"centres": len(centres), "targets": len(targets),
                      "noSourceCentre": [code for code, rec in coverage.items() if rec["sourceUrbanCentres"] == 0],
                      "maximumProjectionRoundtripErrorMetres": max_roundtrip,
                      "outputSha256": sha(output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
