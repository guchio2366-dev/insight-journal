"""Offline, pinned INEGI water vectors. No interpolated boundaries or connectors."""
from pathlib import Path
import argparse
from collections import Counter
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
from shapely.geometry import shape, mapping
from shapely.ops import transform as geometry_transform

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "public/assets/atlas/mexico-water-v1"
TERMS = "https://www.inegi.org.mx/inegi/terminos.html"
LICENSE = {"name": "Términos de Libre Uso de la Información del INEGI", "url": TERMS,
           "creditRequired": True, "preserveMetadata": True, "discloseTransformations": True}
SOURCES = {
    "basins": ("inegi-national-cuencas-original.zip", "Cuencas", "16ca94d89239ebe9b78b2b64a364caa514818923381b53387c047291d2282dff"),
    "rivers": ("inegi-national-rivers-orderge7-original.zip", "RedHidrografica", "44a62b16c6b4ba40bfeaf4030d79e8d2d6f95feea5bf0b7a0b212fcd5dedb5d2"),
    "groundwater": ("inegi-national-groundwater-original.zip", "continuo_u", "ee94ce02297c9d910d3b1d20ea531cbdd11ca37d2c7baaf304fd68a0f08bcffe"),
}
GROUND_CLASSES = [
    ("1A", "固結材料・収量高（>40 L/s）", "consolidated", "yield", "high", "#155e75"),
    ("2M", "固結材料・収量中（10–40 L/s）", "consolidated", "yield", "medium", "#0891b2"),
    ("3B", "固結材料・収量低（<10 L/s）", "consolidated", "yield", "low", "#67e8f9"),
    ("4PM", "固結材料・賦存可能性中", "consolidated", "potential", "medium", "#a16207"),
    ("5PB", "固結材料・賦存可能性低", "consolidated", "potential", "low", "#fde68a"),
    ("6a", "非固結材料・収量高（>40 L/s）", "unconsolidated", "yield", "high", "#3730a3"),
    ("7m", "非固結材料・収量中（10–40 L/s）", "unconsolidated", "yield", "medium", "#818cf8"),
    ("8b", "非固結材料・収量低（<10 L/s）", "unconsolidated", "yield", "low", "#c7d2fe"),
    ("9pm", "非固結材料・賦存可能性中", "unconsolidated", "potential", "medium", "#be185d"),
    ("10pb", "非固結材料・賦存可能性低", "unconsolidated", "potential", "low", "#fbcfe8"),
]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def save(file, value):
    raw = (json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")
    file.write_bytes(raw)
    return {"file": file.name, "bytes": len(raw), "sha256": sha(raw)}


def round_coords(value):
    if not value:
        return value
    if isinstance(value[0], (int, float)):
        x, y = value[:2]
        assert math.isfinite(x) and math.isfinite(y) and -120 < x < -85 and 13 < y < 34
        return [round(x, 6), round(y, 6)]
    return [round_coords(child) for child in value]


def vertex_count(value):
    return 1 if value and isinstance(value[0], (int, float)) else sum(vertex_count(child) for child in value)


def bbox(features):
    out = [math.inf, math.inf, -math.inf, -math.inf]
    def visit(coords):
        if not coords:
            return
        if isinstance(coords[0], (int, float)):
            x, y = coords[:2]
            out[0], out[1] = min(out[0], x), min(out[1], y)
            out[2], out[3] = max(out[2], x), max(out[3], y)
        else:
            for child in coords:
                visit(child)
    for feature in features:
        visit(feature["geometry"]["coordinates"])
    return out


def open_source(folder, kind):
    filename, prefix, expected = SOURCES[kind]
    raw = (folder / filename).read_bytes()
    assert sha(raw) == expected, f"Pinned {kind} source changed"
    z = zipfile.ZipFile(io.BytesIO(raw))
    names = {n.rsplit("/", 1)[-1]: n for n in z.namelist()}
    reader = shapefile.Reader(shp=io.BytesIO(z.read(names[prefix + ".shp"])),
                             shx=io.BytesIO(z.read(names[prefix + ".shx"])),
                             dbf=io.BytesIO(z.read(names[prefix + ".dbf"])), encoding="cp1252" if kind == "groundwater" else "utf-8")
    prj_name = prefix + ".prj" if kind != "groundwater" else "continuo_a.prj"
    wkt = z.read(names[prj_name]).decode("ascii")
    return reader, wkt, {"sourceArchive": filename, "sourceArchiveBytes": len(raw), "sourceArchiveSha256": expected}


def common(kind, wkt, source):
    return {"id": kind, "publisher": "INEGI", "file": kind + ".geojson", "edition": None,
            "observedPeriod": None, "retrievedAt": "2026-10-02", "unit": "source classification",
            "license": LICENSE, "sourceCrsWkt": wkt, "outputCrs": "EPSG:4326", **source}


def write_layer(kind, features, metadata):
    bounds = bbox(features)
    asset = save(OUT / (kind + ".geojson"), {"type": "FeatureCollection", "bbox": bounds, "features": features})
    metadata.update({"asset": asset, "featureCount": len(features), "bounds4326": bounds,
                     "outputVertexCount": sum(vertex_count(f["geometry"]["coordinates"]) for f in features)})
    source_asset = save(OUT / (kind + ".source.json"), metadata)
    print(json.dumps({"id": kind, "asset": asset, "metadata": source_asset,
                      "featureCount": len(features), "vertices": metadata["outputVertexCount"]}), flush=True)


def prepare_basins(folder):
    r, wkt, source = open_source(folder, "basins")
    assert r.shapeType == 5 and len(r) == 158 and CRS.from_wkt(wkt).is_geographic and '"EPSG","4326"' in wkt
    features, source_vertices, invalid_ids, types = [], 0, [], Counter()
    for item in r.iterShapeRecords():
        rec = item.record.as_dict()
        geom = shape(item.shape.__geo_interface__)
        source_vertices += len(item.shape.points)
        # Keep any invalid source unchanged rather than silently repairing it.
        if geom.is_valid:
            geom = geom.simplify(0.002, preserve_topology=True)
        else:
            invalid_ids.append(rec["CVE_CUE"])
        geometry = dict(mapping(geom))
        geometry["coordinates"] = round_coords(geometry["coordinates"])
        types[rec["TIPO"]] += 1
        identifier = "basin-" + rec["CVE_CUE"]
        features.append({"type": "Feature", "id": identifier,
                         "properties": {"id": identifier, "sourceId": rec["CVE_CUE"], "name": rec["NOMB"],
                                        "nameJa": rec["NOMB"], "sourceName": rec["NOMB"], "basinType": rec["TIPO"],
                                        "sourceArea": rec["AREA"], "sourcePerimeter": rec["PERIMETRO"],
                                        "unit": "domestic basin boundary", "observedPeriod": None}, "geometry": geometry})
    assert len({f["id"] for f in features}) == 158
    metadata = common("basins", wkt, source)
    metadata.update({"name": "国内流域区分", "sourceUrl": "https://antares.inegi.org.mx/analisis/red_hidro/siatl/",
        "downloadUrl": "https://antares.inegi.org.mx/geoserver/AnalisisEspacial/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=AnalisisEspacial:Cuencas&outputFormat=shape-zip&srsName=EPSG:4326",
        "geometryMeaning": "INEGI SIATL Cuencas domestic basin divisions; original domestic extent retained.",
        "periodNote": "取得日は2026-10-02。WFS配信の図版年・統一観測期は未確認で、取得年を観測年に置き換えない。",
        "coverage": "158 domestic Mexican basin divisions; foreign upstream catchment areas are not provided by this layer.",
        "originalRecordCount": 158, "excludedRecordCount": 0, "sourceVertexCount": source_vertices,
        "sourceTypeCounts": dict(types), "sourceInvalidGeometryIds": invalid_ids,
        "unit": "domestic basin division", "legend": [{"id": "basins", "label": "国内流域界（158区分）", "color": "#0e7490"}],
        "method": "Read original WFS 1.0 longitude/latitude WGS84 polygons and source CVE_CUE/name/type. Preserve every basin and original domestic scope. Simplify valid polygons only with Shapely preserve_topology=True at 0.002 degrees for national display; retain invalid source polygons unchanged, without repair. Round coordinates to six decimals. No clipping, overseas catchment construction or interpolation.",
        "displaySimplification": {"toleranceDegrees": 0.002, "preserveTopology": True, "invalidSourceGeometryChanged": False},
        "limitations": ["Domestic divisions are not complete international upstream catchments.", "Simplified national display is not a survey boundary or a flood-risk map.", "Source type and source-reported area/perimeter remain attributes; displayed geometry does not recalculate hydrological quantities."]})
    write_layer("basins", features, metadata)


def prepare_rivers(folder):
    r, wkt, source = open_source(folder, "rivers")
    assert r.shapeType == 3 and len(r) == 61350 and CRS.from_wkt(wkt).is_geographic and '"EPSG","4326"' in wkt
    groups = {n: {"lines": [], "sourceIds": [], "subbasins": set(), "conditions": Counter()} for n in (7, 8, 9)}
    source_vertices, source_parts, source_dates = 0, 0, set()
    for item in r.iterShapeRecords():
        rec, raw = item.record.as_dict(), item.shape
        order = rec["order_1"]
        assert order in groups
        group = groups[order]
        starts = list(raw.parts) + [len(raw.points)]
        for start, end in zip(starts, starts[1:]):
            assert end - start >= 2
            group["lines"].append(round_coords(raw.points[start:end]))
            source_vertices += end - start
            source_parts += 1
        group["sourceIds"].append(rec["id"])
        group["subbasins"].add(rec["cve_subc"])
        group["conditions"][rec["condicion"]] += 1
        if rec["fecha"]:
            source_dates.add(str(rec["fecha"]))
    assert {n: len(g["sourceIds"]) for n, g in groups.items()} == {7: 51277, 8: 9866, 9: 207}
    features, legend = [], []
    for order, group in groups.items():
        identifier = f"rivers-order-{order}"
        label = f"小流域内Strahler次数{order}（{len(group['sourceIds']):,}セグメント）"
        color = {7: "#0284c7", 8: "#0369a1", 9: "#075985"}[order]
        properties = {"id": identifier, "name": label, "nameJa": label, "order": order,
                      "sourceIds": group["sourceIds"], "sourceSegmentCount": len(group["sourceIds"]),
                      "sourcePartCount": len(group["lines"]), "sourceSubbasins": sorted(group["subbasins"]),
                      "conditionCounts": dict(group["conditions"]), "color": color, "unit": "subbasin Strahler order"}
        features.append({"type": "Feature", "id": identifier, "properties": properties,
                         "geometry": {"type": "MultiLineString", "coordinates": group["lines"]}})
        legend.append({"id": identifier, "label": label, "color": color})
    metadata = common("rivers", wkt, source)
    metadata.update({"name": "河川線（小流域内次数7以上）", "sourceUrl": "https://antares.inegi.org.mx/analisis/red_hidro/siatl/",
        "downloadUrl": "https://antares.inegi.org.mx/geoserver/inegiRedHidro_wfs/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=inegiRedHidro_wfs:RedHidrografica&outputFormat=shape-zip&srsName=EPSG:4326&CQL_FILTER=order_1%3E%3D7",
        "geometryMeaning": "Actual INEGI river-network source segments selected by ORDER_1 >= 7, grouped without added connections.",
        "unit": "subbasin Strahler order", "originalRecordCount": 61350, "excludedRecordCount": 0,
        "selection": "ORDER_1 >= 7 source-side WFS query; not all Mexican rivers or all river-network segments.",
        "sourceVertexCount": source_vertices, "sourcePartCount": source_parts, "legend": legend,
        "sourceAttributeDateRange": [min(source_dates), max(source_dates)], "observedPeriod": None,
        "periodNote": "原セグメントの日付属性は統一観測期ではない。図版年・観測対象期間を取得年で補わない。",
        "coverage": "National INEGI source query, limited to subbasin ORDER_1 >= 7. Lower-order rivers are outside the displayed selection.",
        "valueDefinitionSource": {"url": "https://antares.inegi.org.mx/analisis/red_hidro/PDF/Doc.pdf", "printedPages": [23, 35]},
        "method": "Retain every source line part and vertex; group separate parts into three MultiLineString features by exact ORDER_1=7,8,9. Preserve all original segment IDs, source subbasin codes and condition counts. Round coordinates to six decimals. No snapping, union, line joining, simplification, clipping or connector creation.",
        "limitations": ["Strahler order restarts within source subbasins; it is not a continuous national or whole-river order.", "Source attributes have no river-name field. Display labels name the source classification, not inferred rivers.", "Order is network hierarchy, not discharge, available water, navigability or flood risk.", "Selected orders omit lower-order streams, including streams in areas with no displayed selected lines."]})
    write_layer("rivers", features, metadata)


def prepare_groundwater(folder):
    r, wkt, source = open_source(folder, "groundwater")
    assert r.shapeType == 5 and len(r) == 34551
    # National source metadata section 5.1 declares ITRF92/GRS80 Lambert parameters.
    # The supplied continuo_a.prj matches that declaration; continuo_v.prj is NAD27 and is not used.
    transformer = Transformer.from_crs(CRS.from_wkt(wkt), CRS.from_epsg(4326), always_xy=True, allow_ballpark=False)
    assert transformer.accuracy >= 0
    groups = {c[0]: {"polygons": [], "sourceOrdinals": [], "description": None, "invalid": []} for c in GROUND_CLASSES}
    excluded, source_vertices, source_rings = Counter(), 0, 0
    shapefile.VERBOSE = False
    for index, item in enumerate(r.iterShapeRecords()):
        rec = item.record.as_dict()
        code = rec["CLAVE"]
        if code not in groups:
            excluded[(code, rec["DESCRIPCIO"])] += 1
            continue
        group = groups[code]
        if group["description"] is None:
            group["description"] = rec["DESCRIPCIO"]
        assert group["description"] == rec["DESCRIPCIO"], "Same code has multiple meanings; split by description"
        raw_geom = item.shape.__geo_interface__
        geom = shape(raw_geom)
        if not geom.is_valid:
            group["invalid"].append(index + 1)
        transformed = geometry_transform(transformer.transform, geom)
        mapped = mapping(transformed)
        assert mapped["type"] in ("Polygon", "MultiPolygon")
        polygons = [mapped["coordinates"]] if mapped["type"] == "Polygon" else mapped["coordinates"]
        group["polygons"].extend(round_coords(polygons))
        group["sourceOrdinals"].append(index + 1)
        source_vertices += len(item.shape.points)
        source_rings += len(item.shape.parts)
    assert sum(len(g["sourceOrdinals"]) for g in groups.values()) == 29479 and sum(excluded.values()) == 5072
    features, legend, class_counts = [], [], {}
    for code, label, material, measure, band, color in GROUND_CLASSES:
        group = groups[code]
        identifier = "groundwater-" + code
        class_counts[code] = len(group["sourceOrdinals"])
        props = {"id": identifier, "name": label, "nameJa": label, "sourceClass": code,
                 "sourceName": group["description"], "material": material, "measure": measure, "band": band,
                 "color": color, "unit": "L/s yield class" if measure == "yield" else "occurrence potential class",
                 "sourceMemberCount": len(group["sourceOrdinals"]), "sourceRecordOrdinals": group["sourceOrdinals"]}
        features.append({"type": "Feature", "id": identifier, "properties": props,
                         "geometry": {"type": "MultiPolygon", "coordinates": group["polygons"]}})
        legend.append({"id": identifier, "label": label, "color": color})
    assert sum(sum(len(polygon) for polygon in g["polygons"]) for g in groups.values()) == source_rings, "Source rings lost"
    metadata = common("groundwater", wkt, source)
    metadata.update({"name": "地下水の水文地質区分（収量・賦存可能性）",
        "sourceUrl": "https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=889463598411",
        "downloadUrl": "https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/geografia/tematicas/Aguas_sub_Serie_II/1_250_000/889463598411_s.zip",
        "edition": "Serie II", "sourceCreationDate": "1996-03-01", "sourceRevisionDate": "2008-12-01", "observedPeriod": None,
        "periodNote": "1996年は原典作成、2008-12-01は原典改訂の日付。全国共通の観測期や現在の地下水量を示さない。",
        "geometryMeaning": "INEGI continuo_u geohydrological units, classified by consolidated/unconsolidated materials and source yield/occurrence potential. Not legal aquifer boundaries.",
        "unit": "L/s yield class or qualitative occurrence potential (distinct source categories)", "scale": 250000,
        "transform": {"operation": transformer.description, "accuracyMetres": transformer.accuracy, "ballparkAllowed": False, "alwaysXY": True},
        "sourceCrsEvidence": "Bundled national metadata section 5.1: ITRF92 epoch1988.0, GRS80, Lambert std17.5/29.5 lon0-102 lat0-12 falseE2500000 falseN0. Supplied continuo_a.prj matches these parameters; continuo_v NAD27 CRS is excluded.",
        "originalRecordCount": 34551, "selectedSourceRecordCount": 29479, "excludedRecordCount": 5072,
        "excludedBySourceClassAndDescription": [{"code": code, "description": description, "count": count} for (code, description), count in excluded.items()],
        "sourceVertexCount": source_vertices, "sourceRingCount": source_rings, "sourceClassCounts": class_counts,
        "sourceInvalidRecordOrdinals": [i for g in groups.values() for i in g["invalid"]],
        "legend": legend, "legendColorMeaning": "Display palette assigned by this site; formal ten source classes are unchanged. Colors are not claimed to be INEGI's original palette.",
        "valueDefinitionSource": {"url": "https://www.inegi.org.mx/contenidos/temas/mapas/hidrologia/metadatos/dd_hidrosub_v1_250k.pdf", "printedPages": [20, 21]},
        "coverage": "National source geohydrological unit layer, ten groundwater classes. Source water-body/foreign-area polygons are excluded and recorded.",
        "method": "Group by exact source CLAVE and DESCRIPCIO into ten MultiPolygons without dissolve, repair or adding geometry. Preserve every selected original polygon, hole, part and record ordinal. Apply named ITRF92 Lambert to WGS84 PROJ datum operation with ballpark disabled; round to six decimals. No simplification, interpolation, clipping or arbitrary aquifer construction.",
        "limitations": ["These hydrogeological units are not CONAGUA's 653 legal aquifer units.", "Yield classes (>40,10–40,<10 L/s) and qualitative occurrence-potential classes are distinct source concepts; neither is reservoir volume or current water availability.", "Source records have only class/description; record ordinals identify preserved archive records, not invented official feature IDs.", "Original invalid polygons remain unchanged in topology rather than silently repaired."]})
    write_layer("groundwater", features, metadata)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--layer", choices=["basins", "rivers", "groundwater", "all"], default="all")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    handlers = {"basins": prepare_basins, "rivers": prepare_rivers, "groundwater": prepare_groundwater}
    for key, handler in handlers.items():
        if args.layer in (key, "all"):
            handler(args.input)


if __name__ == "__main__":
    main()
