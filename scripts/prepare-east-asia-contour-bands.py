"""Align East Asia isobands and isolines from pinned, checked-in grids.

Uses numpy and contourpy already used by atlas generators. No downloads. The
lookup grids, existing agricultural overlays and all other regions stay intact.
Run: python3 scripts/prepare-east-asia-contour-bands.py
"""
from pathlib import Path
import gzip
import hashlib
import json
import math
import numpy as np
import contourpy

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/atlas"
OUT = ASSETS / "asia-presentation-v1"


def box_mean(a, radius):
    out = a.astype("float64")
    for axis in (0, 1):
        pads = [(0, 0), (0, 0)]
        pads[axis] = (radius, radius)
        summed = np.cumsum(np.pad(out, pads), axis=axis)
        pads[axis] = (1, 0)
        summed = np.pad(summed, pads)
        hi = [slice(None), slice(None)]
        lo = hi.copy()
        hi[axis] = slice(2 * radius + 1, None)
        lo[axis] = slice(None, -(2 * radius + 1))
        out = (summed[tuple(hi)] - summed[tuple(lo)]) / (2 * radius + 1)
    return out


def display_field(values, radius):
    valid = values != -32768
    weights = box_mean(valid, radius)
    smooth = np.divide(box_mean(np.where(valid, values, 0), radius), weights,
                       out=np.zeros_like(weights), where=weights > 0)
    # contourpy fills lower < z <= upper. One representable increment makes
    # threshold plateaus belong to [lower, upper), including published zero.
    return np.ma.masked_where(~valid, np.nextafter(smooth, np.inf))


def lonlat(points):
    result = np.empty_like(points)
    result[:, 0] = points[:, 0] / 6378137 * 180 / math.pi
    result[:, 1] = (2 * np.arctan(np.exp(points[:, 1] / 6378137)) - math.pi / 2) * 180 / math.pi
    return np.round(result, 6).tolist()


def color(value, kind):
    anchors = ([(0, "edf5fc"), (1000, "a8d0e8"), (2500, "4d9aca"),
                (5000, "185f97"), (8000, "0b315a")] if kind == "rainfall" else
               [(-500, "d5e4ed"), (0, "c7dcb5"), (1000, "e5d59a"),
                (2500, "c5a074"), (4500, "a99183"), (6500, "d7cfc7"),
                (8500, "f6f4ef")])
    channels = np.asarray([list(bytes.fromhex(c)) for _, c in anchors])
    rgb = [round(float(np.interp(value, [n for n, _ in anchors], channels[:, i]))) for i in range(3)]
    return "#" + bytes(rgb).hex()


def geometry(values, bounds, interval, kind, radius):
    field = display_field(values, radius)
    west, south, east, north = bounds
    h, w = values.shape
    x = west + (np.arange(w) + .5) * (east - west) / w
    y = north - (np.arange(h) + .5) * (north - south) / h
    gen = contourpy.contour_generator(x=x, y=y, z=field, corner_mask=False,
                                     line_type="Separate", fill_type="OuterOffset")
    minimum = 0 if kind == "rainfall" else math.floor(float(field.min()) / interval) * interval
    maximum = (math.floor(float(field.max()) / interval) + 1) * interval
    breaks = list(range(minimum, maximum + 1, interval))
    bands, lines, labels, colors = [], [], [], []
    for lower, upper in zip(breaks, breaks[1:]):
        shade = color((lower + upper) / 2, kind)
        colors.append(shade)
        points, offsets = gen.filled(lower, upper)
        for polygon, rings in zip(points, offsets):
            converted = lonlat(polygon)
            coordinates = []
            for start, end in zip(rings, rings[1:]):
                ring = converted[int(start):int(end)]
                if len({tuple(p) for p in ring}) < 3:
                    continue
                signed = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:]))
                if (signed < 0) == (not coordinates):
                    ring.reverse()
                coordinates.append(ring)
            if coordinates:
                bands.append(dict(type="Feature", geometry=dict(type="Polygon", coordinates=coordinates),
                                  properties=dict(lower=lower, upper=upper, color=shade)))
    for value in breaks[1:-1]:
        candidates = []
        for points in gen.lines(value):
            coordinates = lonlat(points)
            if len({tuple(p) for p in coordinates}) < 2:
                continue
            lines.append(dict(type="Feature", geometry=dict(type="LineString", coordinates=coordinates),
                              properties=dict(value=value)))
            distances = np.hypot(*(points[1:] - points[:-1]).T)
            cumulative = np.r_[0, np.cumsum(distances)]
            halfway = cumulative[-1] / 2
            index = max(0, min(len(points) - 2, int(np.searchsorted(cumulative, halfway) - 1)))
            fraction = (halfway - cumulative[index]) / max(distances[index], 1e-12)
            point = points[index] + fraction * (points[index + 1] - points[index])
            candidates.append((cumulative[-1], lonlat(point[None, :])[0]))
        if candidates:
            labels.append(dict(id=f"{kind}-{value}-aligned", text=f"{value:,}", value=value,
                               coordinate=max(candidates)[1]))
    return dict(type="FeatureCollection", features=bands), dict(type="FeatureCollection", features=lines), dict(
        interval=interval, breaks=breaks, colors=colors, labels=labels,
        minimum=minimum, maximum=maximum, smoothingRadiusCells=radius,
        validCellCount=int(np.sum(~field.mask)), maskedCellCount=int(np.sum(field.mask)),
        coordinatePrecisionDegrees=.000001, thresholdRule="lower inclusive, upper exclusive")


def write(name, data):
    raw = (json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode()
    (OUT / name).write_bytes(gzip.compress(raw, mtime=0))


def main():
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for kind, directory, interval, radius_m in [("rainfall", "asia-water-v1", 250, 12000),
                                                ("terrain", "asia-physical-v1", 500, 6000)]:
        source = json.loads((ASSETS / directory / "manifest.json").read_text())
        record = source["regions"]["east-asia"]
        if kind == "rainfall":
            record = record["precipitation"]
        path = ASSETS / directory / record["grid"]
        raw = path.read_bytes()
        values = np.frombuffer(gzip.decompress(raw), dtype="<i2").reshape(record["height"], record["width"])
        w, s, e, n = record["bounds3857"]
        radius = max(1, round(radius_m / min((e - w) / values.shape[1], (n - s) / values.shape[0])))
        bands, lines, metadata = geometry(values, record["bounds3857"], interval, kind, radius)
        band_name = f"east-asia.{kind}-bands.json.gz"
        line_name = f"east-asia.{kind}-aligned.json.gz"
        write(band_name, bands)
        write(line_name, lines)
        metadata.update(file=band_name, lineFile=line_name, sourceGrid=str(path.relative_to(ROOT)),
                        sourceGridSHA256=hashlib.sha256(raw).hexdigest(),
                        sourceURL="https://www.chelsa-climate.org/datasets/chelsa_bioclim" if kind == "rainfall" else source["sourceUrl"],
                        unit="mm/年" if kind == "rainfall" else "m", smoothingRadiusMetres3857=radius_m,
                        method="Same land-valid moving-mean field and contourpy marching-quadrilateral interpolation for fills and lines. No line filtering or independent simplification. Missing corners stay masked. Coordinates rounded to 0.000001 degree; point lookup retains the original unsmoothed grid.",
                        bandSHA256=hashlib.sha256((OUT / band_name).read_bytes()).hexdigest(),
                        lineSHA256=hashlib.sha256((OUT / line_name).read_bytes()).hexdigest())
        manifest["regions"]["east-asia"][kind]["bands"] = metadata
        print(kind, "bands", len(bands["features"]), "lines", len(lines["features"]), flush=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
