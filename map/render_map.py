#!/usr/bin/env python3
"""Render a deterministic, publication-ready locator map from Natural Earth GeoJSON."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any, Iterable

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASEMAP = ROOT / "map" / "vendor" / "ne_110m_admin_0_south_asia.geojson"
FONT_CANDIDATES = [
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    Path("/root/.fonts/NotoSansCJKjp-Regular.otf"),
    Path("/root/.local/share/fonts/NotoSansCJKjp-Regular.otf"),
]


def iter_rings(geometry: dict[str, Any]) -> Iterable[list[list[float]]]:
    if geometry.get("type") == "Polygon":
        yield from geometry.get("coordinates", [])
    elif geometry.get("type") == "MultiPolygon":
        for polygon in geometry.get("coordinates", []):
            yield from polygon


def pick_font() -> font_manager.FontProperties:
    for path in FONT_CANDIDATES:
        if path.exists():
            return font_manager.FontProperties(fname=str(path))
    return font_manager.FontProperties(family="sans-serif")


def render(spec_path: Path, output_root: Path) -> dict[str, Any]:
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    basemap_path = Path(spec.get("baseMapFile", DEFAULT_BASEMAP))
    if not basemap_path.is_absolute():
        basemap_path = ROOT / basemap_path
    basemap_bytes = basemap_path.read_bytes()
    expected_basemap_hash = spec.get("baseMap", {}).get("sha256")
    actual_basemap_hash = hashlib.sha256(basemap_bytes).hexdigest()
    if not expected_basemap_hash or actual_basemap_hash != expected_basemap_hash:
        raise ValueError(
            "base map SHA-256 does not match the pinned specification: "
            f"expected {expected_basemap_hash!r}, got {actual_basemap_hash}"
        )
    world = json.loads(basemap_bytes)

    width = int(spec.get("width", 1600))
    height = int(spec.get("height", 900))
    if width < 800 or height < 450:
        raise ValueError("map must be at least 800×450 pixels")

    bounds = spec["bounds"]
    if not (-180 <= bounds["west"] <= 180 and -180 <= bounds["east"] <= 180):
        raise ValueError("longitude is outside -180..180")
    if not (-90 <= bounds["south"] <= 90 and -90 <= bounds["north"] <= 90):
        raise ValueError("latitude is outside -90..90")
    if bounds["west"] >= bounds["east"]:
        raise ValueError("west must be left of east; dateline-crossing maps are not supported")
    if bounds["south"] >= bounds["north"]:
        raise ValueError("south must be below north")

    font = pick_font()
    fig, ax = plt.subplots(figsize=(width / 100, height / 100), dpi=100)
    fig.patch.set_facecolor("#f5f3ed")
    ax.set_facecolor("#dce8ec")

    highlighted = set(spec.get("highlightCountries", []))
    for feature in world.get("features", []):
        props = feature.get("properties", {})
        code = props.get("ISO_A2_EH") or props.get("ISO_A2")
        face = "#e6a23c" if code in highlighted else "#ece9df"
        edge = "#8a877f"
        for ring in iter_rings(feature.get("geometry", {})):
            if len(ring) < 3:
                continue
            xs = [point[0] for point in ring]
            ys = [point[1] for point in ring]
            ax.fill(xs, ys, facecolor=face, edgecolor=edge, linewidth=0.55, zorder=1)

    ax.set_xlim(bounds["west"], bounds["east"])
    ax.set_ylim(bounds["south"], bounds["north"])
    ax.grid(color="#91a3aa", linewidth=0.45, alpha=0.45)
    ax.tick_params(colors="#59676d", labelsize=9)

    for point in spec.get("points", []):
        lon = float(point["longitude"])
        lat = float(point["latitude"])
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise ValueError(f"invalid point coordinates: {point.get('label', '')}")
        ax.scatter([lon], [lat], s=78, color="#9f2f25", edgecolors="#ffffff", linewidths=1.5, zorder=4)
        ax.annotate(
            point["label"],
            (lon, lat),
            xytext=(8, 8),
            textcoords="offset points",
            fontproperties=font,
            fontsize=11,
            color="#242824",
            bbox={"boxstyle": "round,pad=0.25", "fc": "#fffdf7", "ec": "#9f2f25", "lw": 0.8},
            zorder=5,
        )

    ax.set_title(spec["caption"], fontproperties=font, fontsize=18, loc="left", color="#172423", pad=14)
    fig.text(
        0.99,
        0.012,
        f"Base map: Natural Earth {spec['baseMap']['version']} · {spec['baseMap']['scale']}",
        ha="right",
        va="bottom",
        fontsize=8,
        color="#59676d",
    )
    fig.subplots_adjust(left=0.055, right=0.985, top=0.91, bottom=0.075)

    tmp = output_root / f"{spec['publicId']}-map.png"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(tmp, dpi=100, format="png", metadata={"Software": "Insight Journal map renderer"})
    plt.close(fig)

    payload = tmp.read_bytes()
    digest = hashlib.sha256(payload).hexdigest()
    relative = Path("assets") / spec["publicId"] / f"{digest[:12]}.png"
    final_path = output_root / relative
    final_path.parent.mkdir(parents=True, exist_ok=True)
    tmp.replace(final_path)
    byte_count = final_path.stat().st_size
    if byte_count >= 5_000_000:
        final_path.unlink(missing_ok=True)
        raise ValueError("rendered image must be smaller than 5MB")

    return {
        "path": relative.as_posix(),
        "sha256": digest,
        "width": width,
        "height": height,
        "bytes": byte_count,
        "alt": spec["alt"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("spec", type=Path)
    parser.add_argument("--output-root", type=Path, default=ROOT / "public")
    parser.add_argument("--metadata", type=Path)
    args = parser.parse_args()
    metadata = render(args.spec, args.output_root)
    serialized = json.dumps(metadata, ensure_ascii=False, indent=2) + "\n"
    if args.metadata:
        args.metadata.parent.mkdir(parents=True, exist_ok=True)
        args.metadata.write_text(serialized, encoding="utf-8")
    print(serialized, end="")


if __name__ == "__main__":
    main()
