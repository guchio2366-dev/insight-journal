"""Generate South/Central Asia bands from checked-in original lookup grids.

Reuse the confirmed East Asia geometry engine without editing it. All source
values, masks and the agricultural line assets remain intact. No downloads.
"""
from pathlib import Path
import gzip
import hashlib
import importlib.util
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / "scripts/prepare-east-asia-contour-bands.py"
spec = importlib.util.spec_from_file_location("confirmed_asia_contours", ENGINE)
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)
REGION = "south-central-asia"
original_color = engine.color


def rainfall_color(value, kind):
    # Preserve the common absolute scale through 8,000 mm/year. The existing
    # South/Central source exceeds that anchor; distinguish its upper intervals.
    if kind != "rainfall" or value <= 8000:
        return original_color(value, kind)
    start, end = np.array([11, 49, 90]), np.array([6, 28, 55])
    fraction = min(1, (value - 8000) / 2000)
    return "#" + bytes(round(float(v)) for v in start + (end - start) * fraction).hex()


def write_parts(stem, collection):
    # Preserve feature order and every vertex. The connected GitHub transfer
    # accepts these smaller regional files, which the reader can concatenate.
    parts = []
    def emit(features):
        raw = (json.dumps(dict(type="FeatureCollection", features=features),
                          ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode()
        compressed = gzip.compress(raw, mtime=0)
        if len(compressed) > 550000:
            assert len(features) > 1
            middle = len(features) // 2
            emit(features[:middle])
            emit(features[middle:])
            return
        name = f"{REGION}.{stem}-part{len(parts)+1}.json.gz"
        (engine.OUT / name).write_bytes(compressed)
        parts.append(dict(file=name, sha256=hashlib.sha256(compressed).hexdigest(),
                          featureCount=len(features)))
    group, size = [], 0
    for feature in collection["features"]:
        encoded = len(json.dumps(feature, ensure_ascii=False, separators=(",", ":")).encode())
        if group and size + encoded > 1250000:
            emit(group)
            group, size = [], 0
        group.append(feature)
        size += encoded
    if group:
        emit(group)
    return parts


def main():
    engine.color = rainfall_color
    path = engine.OUT / "manifest.json"
    manifest = json.loads(path.read_text())
    for kind, directory, interval, radius_m in [
            ("rainfall", "asia-water-v1", 250, 12000),
            ("terrain", "asia-physical-v1", 500, 6000)]:
        source = json.loads((engine.ASSETS / directory / "manifest.json").read_text())
        record = source["regions"][REGION]
        if kind == "rainfall":
            record = record["precipitation"]
        grid_path = engine.ASSETS / directory / record["grid"]
        raw = grid_path.read_bytes()
        values = np.frombuffer(gzip.decompress(raw), dtype="<i2").reshape(record["height"], record["width"])
        w, s, e, n = record["bounds3857"]
        radius = max(1, round(radius_m / min((e - w) / values.shape[1], (n - s) / values.shape[0])))
        bands, lines, metadata = engine.geometry(values, record["bounds3857"], interval, kind, radius)
        band_parts = write_parts(f"{kind}-bands", bands)
        if kind == "rainfall":
            line_name = f"{REGION}.rainfall-aligned.json.gz"
            engine.write(line_name, lines)
            line_parts = [dict(file=line_name,
                               sha256=hashlib.sha256((engine.OUT / line_name).read_bytes()).hexdigest(),
                               featureCount=len(lines["features"]))]
        else:
            line_parts = write_parts(f"{kind}-aligned", lines)
        metadata.update(
            bandParts=band_parts, lineParts=line_parts, sourceGrid=str(grid_path.relative_to(ROOT)),
            sourceGridSHA256=hashlib.sha256(raw).hexdigest(),
            sourceURL="https://www.chelsa-climate.org/datasets/chelsa_bioclim" if kind == "rainfall" else source["sourceUrl"],
            unit="mm/年" if kind == "rainfall" else "m", smoothingRadiusMetres3857=radius_m,
            method="Same land-valid moving-mean field and contourpy marching-quadrilateral interpolation for fills and lines. No line filtering or independent simplification. Missing corners stay masked. Coordinates rounded to 0.000001 degree; point lookup retains the original unsmoothed grid.",
            geometryEngine=str(ENGINE.relative_to(ROOT)),
            geometryEngineSHA256=hashlib.sha256(ENGINE.read_bytes()).hexdigest(),
            paletteNote="Common absolute scale through 8000 mm/year; South/Central source upper intervals continue to a darker blue at 10000 mm/year." if kind == "rainfall" else "Confirmed East Asia elevation palette with retained below-sea-level interval.",
            bandFeatureCount=len(bands["features"]), lineFeatureCount=len(lines["features"]))
        assert len(set(metadata["colors"])) == len(metadata["colors"])
        manifest["regions"][REGION][kind]["bands"] = metadata
        print(kind, "bands", len(bands["features"]), "lines", len(lines["features"]), "range", metadata["minimum"], metadata["maximum"], flush=True)
    path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
