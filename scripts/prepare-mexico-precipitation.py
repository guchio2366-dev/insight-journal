"""Derive actual INEGI annual isohyet lines; never interpolate rainfall areas.

Offline preparation only. The original archive, metadata and free-use terms
remain in the supplied input directory. No application build needs GIS tools.
"""
from pathlib import Path
import argparse
import hashlib
import io
import json
import math
import sys
import zipfile

WORKSPACE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WORKSPACE / "runtime" / "python-geodata"))
import shapefile
from pyproj import CRS, Transformer

REPO = Path(__file__).resolve().parents[1]
LICENSE_URL = "https://www.inegi.org.mx/inegi/terminos.html"
PRODUCT_URL = "https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=702825267544"
GUIDE_URL = "https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/historicos/1329/702825231781/702825231781_1.pdf"
EXPECTED_ZIP_SHA256 = "0d1d22d690d84e032b3488f6e337bcafcd95f02319250d014316656a7565c0e3"
EXPECTED_LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 1000, 1100, 1200, 1300, 1500, 2000, 2500, 3000, 3500, 4000, 4500]


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def save(file, value):
    raw = (json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")
    file.write_bytes(raw)
    return {"file": file.name, "bytes": len(raw), "sha256": digest(raw)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    args = parser.parse_args()
    archive_bytes = (args.input / "precipitation-2006.zip").read_bytes()
    assert digest(archive_bytes) == EXPECTED_ZIP_SHA256, "Pinned source changed"
    catalog = json.loads((args.input / "precipitation-2006-metadata.json").read_text("utf-8"))["info"]["generales"]
    assert catalog["upc"] == "702825267544" and catalog["edicion"] == 2006
    archive = zipfile.ZipFile(io.BytesIO(archive_bytes))
    original_wkt = archive.read("precipitacionMediaAnual.prj").decode("ascii")
    source_crs = CRS.from_wkt(original_wkt)
    transform = Transformer.from_crs(source_crs, CRS.from_epsg(4326), always_xy=True, allow_ballpark=False)
    assert transform.accuracy >= 0, "Only a ballpark datum transformation is available"
    reader = shapefile.Reader(
        shp=io.BytesIO(archive.read("precipitacionMediaAnual.shp")),
        shx=io.BytesIO(archive.read("precipitacionMediaAnual.shx")),
        dbf=io.BytesIO(archive.read("precipitacionMediaAnual.dbf")),
        encoding="cp1252",
    )
    assert reader.shapeType == 3 and len(reader) == 847
    features, excluded, source_points = [], {}, 0
    levels = set()
    bounds = [math.inf, math.inf, -math.inf, -math.inf]
    for item in reader.iterShapeRecords():
        record = item.record.as_dict()
        if record["FC"] != 30301:
            key = str(record["CLAVE"])
            excluded[key] = excluded.get(key, 0) + 1
            continue
        value = int(record["CLAVE"])
        assert value in EXPECTED_LEVELS
        levels.add(value)
        raw_shape = item.shape
        starts = list(raw_shape.parts) + [len(raw_shape.points)]
        lines = []
        for start, end in zip(starts, starts[1:]):
            assert end - start >= 2
            source_points += end - start
            xs, ys = zip(*raw_shape.points[start:end])
            lons, lats = transform.transform(xs, ys)
            line = []
            for lon, lat in zip(lons, lats):
                assert math.isfinite(lon) and math.isfinite(lat)
                assert -119 < lon < -85 and 13 < lat < 34, "Coordinate/datum/axis mismatch"
                # Decimal precision is storage precision, not source accuracy.
                point = [round(lon, 6), round(lat, 6)]
                bounds[0] = min(bounds[0], point[0])
                bounds[1] = min(bounds[1], point[1])
                bounds[2] = max(bounds[2], point[0])
                bounds[3] = max(bounds[3], point[1])
                line.append(point)
            lines.append(line)
        source_id = record["OBJECTID"]
        features.append({
            "type": "Feature", "id": f"precipitation-{source_id}",
            "properties": {
                "id": f"precipitation-{source_id}", "sourceId": source_id,
                "name": f"{value:,} mm/年の等雨量線", "nameJa": f"{value:,} mm/年の等雨量線",
                "sourceName": record["CLAVE"], "sourceFeatureCode": record["FC"],
                "value": value, "annualMm": value, "unit": "mm/year",
                "edition": 2006, "observedPeriod": None,
            },
            "geometry": {"type": "LineString", "coordinates": lines[0]} if len(lines) == 1 else {"type": "MultiLineString", "coordinates": lines},
        })
    assert len(features) == 492 and sorted(levels) == EXPECTED_LEVELS
    assert excluded == {"CANEVA": 3, "H2O": 350, "P/E": 2}
    out = REPO / "public" / "assets" / "atlas" / "mexico-water-v1"
    out.mkdir(parents=True, exist_ok=True)
    asset = save(out / "precipitation.geojson", {"type": "FeatureCollection", "bbox": bounds, "features": features})
    metadata = {
        "id": "precipitation", "name": "年降水量の等雨量線", "file": asset["file"],
        "publisher": "INEGI", "product": catalog["titulo"], "productUpc": catalog["upc"],
        "sourceUrl": PRODUCT_URL, "downloadUrl": "https://www.inegi.org.mx" + catalog["formatos"][0]["url"]["valor"],
        "edition": 2006, "observedPeriod": None,
        "periodNote": "2006年は刊行年。関連する2005年作成ガイド§3.3（印刷15頁）は1921–1975年の観測を説明するが、この配布版の統一観測期間との対応は未確認。近年の降水量や1991–2020平年値として扱わない。",
        "unit": "mm/year", "geometryMeaning": "Actual source isohyet lines; not rainfall polygons or station observations.",
        "scale": 1000000, "sourceCrsWkt": original_wkt, "outputCrs": "EPSG:4326",
        "transform": {"operation": transform.description, "accuracyMetres": transform.accuracy, "ballparkAllowed": False, "alwaysXY": True},
        "bounds4326": bounds, "levels": EXPECTED_LEVELS,
        "sourceArchiveSha256": EXPECTED_ZIP_SHA256,
        "sourceMetadataSha256": digest((args.input / "precipitation-2006-metadata.json").read_bytes()),
        "featureCount": len(features), "originalRecordCount": len(reader), "excludedRecordCount": sum(excluded.values()),
        "excludedBySourceClass": excluded, "sourceVertexCount": source_points,
        "method": "Read original PolyLine parts. Select only FC=30301 actual isohyet features. Reproject ITRF92 Lambert to WGS84 using the named PROJ datum operation with ballpark disabled. Retain every part, vertex, original OBJECTID and line value; round output coordinates to six decimals. No simplification, interpolation, area generation, clipping or connector lines. Temporal evidence: related 2005 guide section3.3 printed page15 states 1921–1975 observations, but its correspondence to this 2006 archive is unconfirmed; do not assign that period to every vector feature.",
        "valueDefinitionSource": {"url": GUIDE_URL, "printedPage": 14, "meaning": "CLAVE is the total annual precipitation value of the isohyet, in mm."},
        "observationPeriodEvidence": {"url": GUIDE_URL, "guideEdition": 2005, "section": "3.3 Metodología de elaboración", "printedPage": 15, "pdfPage": 19, "reportedPeriod": "1921–1975", "thisArchiveCorrespondence": "unconfirmed", "bundledExplanation": "climas1m.htm refers to approximately 4000 stations during cartographic compilation but gives no numerical observation period."},
        "license": {"name": "Términos de Libre Uso de la Información del INEGI", "url": LICENSE_URL, "creditRequired": True, "preserveMetadata": True, "discloseTransformations": True},
        "limitations": ["Line values apply to the corresponding source isohyet, not every point in an adjacent area.", "National cartographic scale 1:1,000,000; storage decimals do not imply local measurement precision.", "The related 2005 primary guide explicitly describes 1921–1975 observations for annual precipitation. Correspondence between that period and this 2006 distributed vector archive is not established; observedPeriod remains null. These data are not current rainfall or 1991–2020 normals."],
        "asset": asset,
    }
    source_asset = save(out / "precipitation.source.json", metadata)
    print(json.dumps({"asset": asset, "metadata": source_asset, "featureCount": len(features), "vertexCount": source_points, "bounds": bounds, "transformAccuracyMetres": transform.accuracy}))


if __name__ == "__main__":
    main()
