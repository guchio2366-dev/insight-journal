#!/usr/bin/env python3
"""Build lightweight SVG fallbacks for the non-quantitative livestock markers."""
from __future__ import annotations

import html
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "src/data/atlas/livestock.ts"
OUTPUT = ROOT / "public/assets/atlas/livestock/v2"
WIDTH, HEIGHT = 1800, 1084
BOUNDS = (-128.0, 22.0, -64.0, 52.0)


def mercator_y(latitude: float) -> float:
    value = math.radians(latitude)
    return math.log(math.tan(math.pi / 4 + value / 2))


def project(longitude: float, latitude: float) -> tuple[float, float]:
    west, south, east, north = BOUNDS
    x = (longitude - west) / (east - west) * WIDTH
    y = (mercator_y(north) - mercator_y(latitude)) / (mercator_y(north) - mercator_y(south)) * HEIGHT
    return x, y


def parse_source() -> tuple[dict[str, tuple[str, str, str]], list[tuple[str, str, float, float]]]:
    source = SOURCE.read_text(encoding="utf-8")
    kinds = {
        kind_id: (label, symbol, color)
        for kind_id, label, symbol, color in re.findall(
            r"\{id:'([^']+)',label:'([^']+)',symbol:'([^']+)',color:'([^']+)'\}", source
        )
    }
    regions = [
        (kind_id, label, float(longitude), float(latitude))
        for kind_id, label, longitude, latitude in re.findall(
            r"\{id:'[^']+',kindId:'([^']+)',label:'([^']+)',anchor:\[(-?[\d.]+),(-?[\d.]+)\]", source
        )
    ]
    if len(kinds) != 5 or len(regions) != 15:
        raise RuntimeError(f"Unexpected livestock source: {len(kinds)} kinds, {len(regions)} regions")
    return kinds, regions


def svg(kinds: dict[str, tuple[str, str, str]], regions: list[tuple[str, str, float, float]]) -> str:
    marker_nodes = []
    for kind_id, label, longitude, latitude in regions:
        kind_label, symbol, color = kinds[kind_id]
        x, y = project(longitude, latitude)
        marker_nodes.append(
            f'<g transform="translate({x:.1f} {y:.1f})"><title>{html.escape(label)}の{html.escape(kind_label)}</title>'
            f'<circle r="25" fill="{color}" stroke="#fffaf0" stroke-width="5" opacity=".94"/>'
            f'<text text-anchor="middle" dy=".36em" fill="white" font-size="22" font-weight="800">{html.escape(symbol)}</text></g>'
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" '
        'aria-labelledby="title desc"><title id="title">米国本土の主要な畜産集積地域</title>'
        '<desc id="desc">USDAの郡別統計で確認した主要な集積を説明用の代表点で示します。農場位置、地域境界、頭羽数を表す記号ではありません。</desc>'
        '<g font-family="system-ui, sans-serif">' + ''.join(marker_nodes) + '</g></svg>\n'
    )


def main() -> None:
    kinds, regions = parse_source()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name in ("agriculture-livestock-fallback.svg", "livestock-fallback.svg"):
        (OUTPUT / name).write_text(svg(kinds, regions), encoding="utf-8")


if __name__ == "__main__":
    main()
