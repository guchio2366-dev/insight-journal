"""Derive West Asia presentation bands from checked-in source grids; no downloads.

Reuse the published East Asia fill/line algorithm without editing that generator.
Run: python3 scripts/prepare-west-asia-natural-bands.py
"""
from pathlib import Path
import gzip
import base64
import hashlib
import importlib.util
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/atlas"
OUT = ASSETS / "west-asia-natural-presentation-v1"
ALGORITHM = ROOT / "scripts/prepare-east-asia-contour-bands.py"
EXPECTED = {
    "rainfall": "a38c40a4c9b81b59c4fc16eef047e18fef61aa2fd0d2d3d4f37336bc92d8373a",
    "elevation": "0a88c86e19fdf7d04c275c7b44a82da8a10365d59b650e15050f06b6951764fc",
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def algorithm():
    spec = importlib.util.spec_from_file_location("published_contour_bands", ALGORITHM)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def normalize(values, nodata, kind):
    """Translate only the original missing sentinel; zero/below-sea land survive."""
    valid = values != nodata
    if not np.all(np.isfinite(values)) or (kind == "rainfall" and np.any(values[valid] < 0)):
        raise ValueError("Invalid source values")
    normalized = values.astype("float64")
    normalized[~valid] = -32768
    return normalized


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rain = json.loads((ASSETS / "west-asia-precipitation-v1/manifest.json").read_text())
    raster = json.loads((ASSETS / "west-asia-v1/raster-manifest.json").read_text())
    elevation = next(x for x in raster["layers"] if x["id"] == "elevation")
    source_specs = [
        ("rainfall", "west-asia-precipitation-v1/values.bin.gz", rain, -1, 250, 12000,
         rain["sourceUrl"], "mm／年", "1991–2020年平年値", "GPCC / DWD v2025・0.25°"),
        ("elevation", "west-asia-v1/elevation.values.gz", elevation, -9999, 500, 6000,
         elevation["sourceUrl"], "m", "ETOPO 2022", "NOAA ETOPO 2022・1分格子"),
    ]
    manifest = dict(schemaVersion=1, region="west-asia", generator="scripts/prepare-west-asia-natural-bands.py",
                    algorithm=str(ALGORITHM.relative_to(ROOT)), algorithmSHA256=sha(ALGORITHM.read_bytes()),
                    algorithmPublishedCommit="155e4096f2269a682557c9abb0701afc187e35c9", layers={})
    shared = algorithm()
    fixtures = []
    for value, nodata, kind, interval in [(0, -1, "rainfall", 250), (250, -1, "rainfall", 250), (-100, -9999, "terrain", 500)]:
        grid = np.full((5, 5), value, dtype=float)
        grid[2, 2] = nodata
        normalized = normalize(grid, nodata, "rainfall" if kind == "rainfall" else "elevation")
        bands, lines, meta = shared.geometry(normalized, [0, 0, 500, 500], interval, kind, 1)
        expected = 0 if value == 0 else 250 if value == 250 else -500
        assert {f["properties"]["lower"] for f in bands["features"]} == {expected}
        assert meta["validCellCount"] == 24 and meta["maskedCellCount"] == 1
        assert any(len(f["geometry"]["coordinates"]) > 1 for f in bands["features"])
        fixtures.append(dict(value=value, noData=nodata, input=grid.tolist(), metadata=meta, bands=bands,
                             missingPoint=shared.lonlat(np.asarray([[250., 250.]]))[0],
                             validPoint=shared.lonlat(np.asarray([[100., 100.]]))[0]))
    fixture_bytes = (json.dumps(fixtures, separators=(",", ":"), allow_nan=False)+"\n").encode()
    (OUT / "validation-fixtures.json").write_bytes(fixture_bytes)
    manifest["validationFixturesSHA256"] = sha(fixture_bytes)
    for kind, source_path, frame, nodata, interval, radius_m, url, unit, year, source in source_specs:
        raw = (ASSETS / source_path).read_bytes()
        if sha(raw) != EXPECTED[kind]:
            raise ValueError(f"Source hash changed: {source_path}")
        values = np.frombuffer(gzip.decompress(raw), dtype="<f4").reshape(frame["height"], frame["width"])
        normalized = normalize(values, nodata, kind)
        w, s, e, n = frame["bounds3857"]
        radius = max(1, round(radius_m / min((e-w)/frame["width"], (n-s)/frame["height"])))
        bands, lines, meta = shared.geometry(normalized, frame["bounds3857"], interval,
                                            "rainfall" if kind == "rainfall" else "terrain", radius)
        for suffix, collection in [("bands", bands), ("lines", lines)]:
            name = f"{kind}-{suffix}.json.gz"
            encoded = (json.dumps(collection, ensure_ascii=False, separators=(",", ":"), allow_nan=False)+"\n").encode()
            encoded = gzip.compress(encoded, mtime=0)
            chunks = []
            for index, offset in enumerate(range(0, len(encoded), 32768)):
                part = encoded[offset:offset+32768]
                chunk_name = f"{kind}-{suffix}.{index:02d}.txt"
                (OUT / chunk_name).write_text(base64.b64encode(part).decode()+"\n")
                chunks.append(dict(file=chunk_name, bytes=len(part), sha256=sha(part)))
            meta["bandChunks" if suffix == "bands" else "lineChunks"] = chunks
            meta["file" if suffix == "bands" else "lineFile"] = name
            meta["bandSHA256" if suffix == "bands" else "lineSHA256"] = sha(encoded)
            meta["bandRawSHA256" if suffix == "bands" else "lineRawSHA256"] = sha(gzip.decompress(encoded))
            meta["bandCount" if suffix == "bands" else "lineCount"] = len(collection["features"])
        meta.update(sourceGrid="public/assets/atlas/"+source_path, sourceGridSHA256=sha(raw),
                    sourceNoData=nodata, originalValidRange=[float(values[values != nodata].min()), float(values[values != nodata].max())],
                    width=frame["width"], height=frame["height"], bounds=frame["bounds"], bounds3857=frame["bounds3857"],
                    sourceURL=url, source=source, year=year, unit=unit, smoothingRadiusMetres3857=radius_m,
                    method="Same land-valid moving-mean field and contourpy interpolation for fills and lines. No independent line filtering or simplification. Original missing cells remain masked. Point lookup retains the saved unsmoothed float32 grid; this presentation adds no source resolution.")
        manifest["layers"][kind] = meta
        print(kind, "bands", len(bands["features"]), "lines", len(lines["features"]), "breaks", meta["breaks"], flush=True)
    manifest["packaging"] = "Pinned gzip bytes split into 32 KiB base64 UTF-8 files for the existing GitHub connection. Each decoded chunk and the reassembled gzip are SHA-256 checked. Geometry and source grids are unchanged."
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":"), allow_nan=False)+"\n")


if __name__ == "__main__":
    main()
