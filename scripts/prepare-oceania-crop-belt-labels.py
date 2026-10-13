"""Pin four missing crop-belt reading anchors to saved native positive cells.

Locations follow the already adopted regional readings, not a new country list,
production ranking or a small-item threshold. No network requests are made.
"""
from pathlib import Path
import gzip
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/atlas/oceania-crops-v1"
manifest = json.loads((SOURCE / "manifest.json").read_text())
targets = [
    ("wheat-southeast", "wheat", "AUS", "豪州南東部", [420, 717], [-12, 40]),
    ("wheat-nz", "wheat", "NZL", "NZ南島", [738, 826], [140, -26]),
    ("coconut-png-islands", "coconut", "PNG", "PNG島嶼部", [484, 366], [120, -26]),
    ("cacao-solomon-west", "cacao", "SLB", "ソロモン西部", [560, 393], [88, -42]),
]
records = []
for identifier, crop, country, name, cell, offset in targets:
    layer = next(item for item in manifest["layers"] if item["id"] == crop)
    path = SOURCE / layer["grid"]
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest == manifest["files"][layer["grid"]]["sha256"]
    raw = gzip.decompress(path.read_bytes())
    col, row = cell
    assert len(raw) == layer["width"] * layer["height"] * 4
    value = struct.unpack_from("<f", raw, 4 * (row * layer["width"] + col))[0]
    assert value > 0, (identifier, "source cell is not positive")
    native_columns = [index for start, end in manifest["display"]["sourceColumnSpans"] for index in range(start, end)]
    native_col = native_columns[col]
    native_row = manifest["display"]["sourceRowRange"][0] + row
    tags = layer["nativeGeoTiffTags"]
    coordinates = [tags["modelTiepoint"][3] + (native_col + .5) * tags["pixelScale"][0],
                   tags["modelTiepoint"][4] - (native_row + .5) * tags["pixelScale"][1]]
    records.append({"id": identifier, "product": crop, "country": country, "name": name,
                    "coordinates": coordinates, "offset": offset, "displayCell": cell,
                    "nativeSourceCell": [native_col, native_row], "sourceCellHa": value,
                    "sourceGrid": str(path.relative_to(ROOT)), "sourceGridSha256": digest})
output = {"year": 2020, "unit": "harvested ha/native 5 arc-minute source cell",
          "source": manifest["source"]["catalogUrl"], "license": manifest["source"]["license"],
          "method": "Native source-cell centre and positive Float32 value from the saved grid. The positions identify regional positive harvested-area distributions, not farm boundaries, production quantity or national rank. Surrounding zero and missing cells remain unchanged. No new inclusion threshold is applied.",
          "places": records}
(ROOT / "src/data/atlas/oceania-crop-belt-labels.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
print("Pinned", len(records), "positive native-cell crop reading anchors")
