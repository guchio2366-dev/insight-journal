#!/usr/bin/env python3
"""Create the compact state geometry used by the North America Atlas.

The checked-in source is a Natural Earth 1:110m administrative-1 extract. The
output is deliberately small and is used for interaction and labels; crop
classes are editorial metadata in the TypeScript data file and are not inferred
from the geometry.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable


CONTIGUOUS = {
    "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "IA", "ID",
    "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS",
    "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR",
    "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"
}

BOUNDS = {"west": -125.0, "south": 24.0, "east": -66.0, "north": 50.0}
WIDTH = 1200
HEIGHT = 620
MARGIN_X = 44
MARGIN_Y = 30


def project(lon: float, lat: float) -> tuple[float, float]:
    x = MARGIN_X + (lon - BOUNDS["west"]) / (BOUNDS["east"] - BOUNDS["west"]) * (WIDTH - 2 * MARGIN_X)
    y = MARGIN_Y + (BOUNDS["north"] - lat) / (BOUNDS["north"] - BOUNDS["south"]) * (HEIGHT - 2 * MARGIN_Y)
    return round(x, 2), round(y, 2)


def rings(geometry: dict[str, Any]) -> Iterable[list[list[float]]]:
    kind = geometry.get("type")
    if kind == "Polygon":
        yield from geometry.get("coordinates", [])
    elif kind == "MultiPolygon":
        for polygon in geometry.get("coordinates", []):
            yield from polygon


def path_for(geometry: dict[str, Any]) -> str:
    commands: list[str] = []
    for ring in rings(geometry):
        if len(ring) < 3:
            continue
        points = [project(float(point[0]), float(point[1])) for point in ring]
        commands.append("M" + " ".join(f"{x},{y}" for x, y in points) + "Z")
    return " ".join(commands)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    source = json.loads(args.source.read_text(encoding="utf-8"))
    states = []
    for feature in source.get("features", []):
        props = feature.get("properties", {})
        postal = props.get("postal")
        if postal not in CONTIGUOUS:
            continue
        path = path_for(feature.get("geometry", {}))
        if not path:
            continue
        lon = float(props.get("longitude"))
        lat = float(props.get("latitude"))
        name = props.get("name_ja") or props.get("name")
        states.append({
            "id": f"US-{postal}",
            "postal": postal,
            "nameJa": name,
            "nameEn": props.get("name_en") or props.get("name"),
            "path": path,
            "labelX": project(lon, lat)[0],
            "labelY": project(lon, lat)[1],
        })

    states.sort(key=lambda item: item["postal"])
    if len(states) != 49:
        raise SystemExit(f"expected 49 contiguous states/DC, got {len(states)}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({
        "schemaVersion": 1,
        "viewBox": f"0 0 {WIDTH} {HEIGHT}",
        "bounds": BOUNDS,
        "states": states,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
