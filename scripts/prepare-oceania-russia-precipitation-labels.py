"""Annotate verified 250 mm contours in the pinned regional GPCC images, offline.

The native source is not in this checkout. Anchors use an existing contour pixel,
verified against the exact lower/upper palette classes on its two sides. This
adds cartographic labels without inventing or resampling rainfall values.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {
    "oceania": [
        ("australia-inland", 250, [263, 981], [0, 18]),
        ("australia-north", 500, [387, 812], [0, -16]),
        ("australia-east", 750, [684, 1005], [24, 0]),
        ("australia-tropical-coast", 1000, [605, 792], [22, -8]),
        ("papua-new-guinea", 2500, [578, 555], [0, -44]),
        ("new-zealand", 1000, [1085, 1228], [34, 20]),
    ],
    "russia": [
        ("european-russia", 500, [319, 876], [0, 0]),
        ("ural", 750, [521, 618], [0, 0]),
        ("west-siberia", 500, [800, 708], [0, 0]),
        ("north-siberia", 250, [1136, 229], [0, 0]),
        ("east-siberia", 250, [1536, 444], [0, 0]),
        ("far-east", 500, [1709, 641], [0, 0]),
        ("kamchatka", 1000, [1985, 782], [26, 8]),
    ],
}


def inside_ring(point, ring, centre):
    longitude, latitude = point
    points = [(lon + round((centre - lon) / 360) * 360, lat) for lon, lat in ring]
    inside = False
    previous = points[-1]
    for current in points:
        x1, y1 = previous
        x2, y2 = current
        if (y1 > latitude) != (y2 > latitude):
            if longitude < (x2 - x1) * (latitude - y1) / (y2 - y1) + x1:
                inside = not inside
        previous = current
    return inside


def on_land(point, geography, region):
    centre = 180 if region == "oceania" else 105
    for feature in geography["features"]:
        if feature["properties"]["kind"] != region:
            continue
        geometry = feature["geometry"]
        polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
        for polygon in polygons:
            if inside_ring(point, polygon[0], centre) and not any(inside_ring(point, hole, centre) for hole in polygon[1:]):
                return True
    return False


for region, targets in TARGETS.items():
    source = ROOT / f"public/assets/atlas/{region}-physical-v1/precipitation.png"
    manifest = json.loads((source.parent / "manifest.json").read_text())["gpcc"]
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert digest == manifest["imageSha256"]
    image = Image.open(source).convert("RGBA")
    assert list(image.size) == manifest["size"]
    geography = json.loads((ROOT / f"src/data/atlas/{region}-countries.json").read_text())
    palette = [tuple(bytes.fromhex(color[1:])) + (255,) for color in manifest["colors"]]
    west, south, east, north = manifest["bounds"]
    labels = []
    for name, mm, pixel, offset in targets:
        x, y = pixel
        assert image.getpixel((x, y)) == (36, 75, 105, 255), (region, name, "not a saved contour pixel")
        neighbors = {image.getpixel((x + dx, y + dy)) for dx in range(-5, 6) for dy in range(-5, 6)}
        adjacent = [i for i, color in enumerate(palette) if color in neighbors]
        assert adjacent == [mm // 250 - 1, mm // 250], (region, name, mm, adjacent)
        coordinates = [west + x / image.width * (east - west), north - y / image.height * (north - south)]
        assert on_land(coordinates, geography, region), (region, name, "outside displayed land")
        labels.append({"id": name, "mm": mm, "pixel": pixel, "coordinates": coordinates, "offsetPx": offset,
                       "adjacentBandIndices": adjacent})
    output = {"imageSha256": digest, "period": manifest["period"], "unit": manifest["unit"],
              "method": "Anchor is an exact saved #244b69 contour pixel; its 11×11 pixel neighborhood contains only the adjacent lower and upper 250 mm palette classes. Anchor is inside the displayed target-country land. Offsets are screen pixels for legibility; leaders retain the contour anchor. Coordinates identify a rendered pixel, not a station or new native-grid observation.",
              "labels": labels}
    destination = ROOT / f"src/data/atlas/{region}-precipitation-labels.json"
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(region, len(labels), "verified contour labels")
