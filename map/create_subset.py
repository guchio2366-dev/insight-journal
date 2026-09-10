#!/usr/bin/env python3
"""Create the pinned South Asia subset used by the sample map.

The input is Natural Earth's unmodified
``geojson/ne_110m_admin_0_countries.geojson`` at the blob recorded below.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterator

BOUNDS = {"west": 61, "south": 5, "east": 101, "north": 38}
SOURCE_REPOSITORY = "https://github.com/nvkelso/natural-earth-vector"
SOURCE_PATH = "geojson/ne_110m_admin_0_countries.geojson"
SOURCE_BLOB = "1e6ab74c7042f97013be69ceec798be8e1aff27d"


def points(value: Any) -> Iterator[tuple[float, float]]:
    if (
        isinstance(value, list)
        and len(value) >= 2
        and isinstance(value[0], (int, float))
        and isinstance(value[1], (int, float))
    ):
        yield float(value[0]), float(value[1])
        return
    if isinstance(value, list):
        for child in value:
            yield from points(child)


def intersects_bounds(feature: dict[str, Any]) -> bool:
    coordinates = list(points(feature.get("geometry", {}).get("coordinates", [])))
    if not coordinates:
        return False
    longitudes = [point[0] for point in coordinates]
    latitudes = [point[1] for point in coordinates]
    return (
        max(longitudes) >= BOUNDS["west"]
        and min(longitudes) <= BOUNDS["east"]
        and max(latitudes) >= BOUNDS["south"]
        and min(latitudes) <= BOUNDS["north"]
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    world = json.loads(args.input.read_text(encoding="utf-8"))
    subset = {
        "type": "FeatureCollection",
        "name": "Natural Earth 1:110m Admin 0 countries — South Asia subset",
        "source": {
            "repository": SOURCE_REPOSITORY,
            "path": SOURCE_PATH,
            "blob": SOURCE_BLOB,
        },
        "features": [
            feature for feature in world.get("features", []) if intersects_bounds(feature)
        ],
    }
    if len(subset["features"]) != 17:
        raise ValueError(f"expected 17 intersecting features, got {len(subset['features'])}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(subset, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
