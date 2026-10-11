"""Build regional annual-rainfall and elevation overview images from pinned public data.

Run with --gpcc <official .nc.gz> --etopo-dir <directory with the four GDAL subsets>.
The original downloads stay outside the checkout. No network calls occur here.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path

import contourpy
import numpy as np
from osgeo import gdal
from PIL import Image, ImageDraw
from scipy.io import netcdf_file

ROOT = Path(__file__).resolve().parents[1]
GPCC_SHA = "3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5"
GPCC_URL = "https://opendata.dwd.de/climate_environment/GPCC/GPCC_Precipitation_Analysis_Climatology/Version_2025/gpcc_precipitation_analysis_climatology_1991_2020_v2025_025.nc.gz"
ETOPO_URL = "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif"
REGIONS = {
    "russia": {"bounds": [18, 40, 191, 83], "size": [1200, 597], "etopo": ["russia-west.tif", "russia-east.tif"]},
    "oceania": {"bounds": [110, -58, 250, 25], "size": [1200, 757], "etopo": ["oceania-west.tif", "oceania-east.tif"]},
}
RAIN_BREAKS = list(range(250, 4250, 250))
RAIN_COLORS = [
    "#f0f8fc", "#e2f1fa", "#d4eaf7", "#c4e2f3", "#b4d9ef", "#a2d0e9",
    "#90c5e2", "#7dbad9", "#6aadd0", "#58a0c5", "#498fb8", "#3c7da9",
    "#306c99", "#285b88", "#214b76", "#1b3c65", "#162e53",
]
ELEV_BREAKS = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000]
ELEV_COLORS = [
    "#bcccd1", "#e2ebce", "#c9dda9", "#a9ce8b", "#b9cf86", "#d4c588",
    "#d8b278", "#cd9c6e", "#be8564", "#a96f5d", "#925c59", "#7b4b57",
    "#624155", "#483851",
]


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def source_annual(gpcc_path: Path) -> np.ndarray:
    if sha(gpcc_path) != GPCC_SHA:
        raise ValueError("The GPCC archive differs from the previously verified source")
    with gzip.open(gpcc_path, "rb") as source:
        content = source.read()
    with netcdf_file(io.BytesIO(content), mmap=False) as nc:
        if (nc.time_coverage_start, nc.time_coverage_end) != (b"1991-01-01", b"2020-12-31"):
            raise ValueError("Unexpected GPCC reference period")
        variable = nc.variables["gpcc_precip"]
        if variable.data.shape != (12, 720, 1440) or variable.units != b"mm/month":
            raise ValueError("Unexpected GPCC dimensions or unit")
        longitude = np.asarray(nc.variables["lon"].data)
        latitude = np.asarray(nc.variables["lat"].data)
        if not np.allclose(longitude, np.arange(1440) / 4 - 179.875) or not np.allclose(latitude, 89.875 - np.arange(720) / 4):
            raise ValueError("Unexpected GPCC coordinate orientation")
        monthly = np.asarray(variable.data, dtype=np.float64)
        valid = np.isfinite(monthly) & (monthly >= 0) & (monthly != float(variable._FillValue))
        annual = np.where(valid.all(axis=0), monthly.sum(axis=0), np.nan).astype(np.float32)
    if not np.isfinite(annual[137, 870]) or np.isfinite(annual[582, 870]):
        raise ValueError("GPCC northern latitude/ocean orientation check failed")
    return annual


def indices(bounds: list[float], width: int, height: int, factor: int = 2):
    west, south, east, north = bounds
    longitude = west + (np.arange(width * factor) + .5) / (width * factor) * (east - west)
    latitude = north - (np.arange(height * factor) + .5) / (height * factor) * (north - south)
    return longitude, latitude


def rgba_classes(values: np.ndarray, breaks: list[int], colors: list[str]) -> np.ndarray:
    valid = np.isfinite(values) & (values > -99999)
    categories = np.searchsorted(breaks, np.where(valid, values, 0), side="right")
    palette = np.array([[int(color[i:i + 2], 16) for i in (1, 3, 5)] for color in colors], dtype=np.uint8)
    rgba = np.empty((*values.shape, 4), dtype=np.uint8)
    rgba[:, :, :3] = palette[categories]
    rgba[:, :, 3] = np.where(valid, 255, 0).astype(np.uint8)
    return rgba


def draw_contours(image: Image.Image, x: np.ndarray, y: np.ndarray, values: np.ndarray, levels: list[int], color: str) -> dict[str, int]:
    # Values retain the publisher's original grid centres (GPCC) or a declared
    # two-pixel-per-map-unit overview sample (ETOPO). Missing cells do not join.
    generator = contourpy.contour_generator(x=x, y=y, z=np.ma.masked_invalid(values), name="serial", corner_mask=False)
    draw = ImageDraw.Draw(image)
    counts = {}
    for level in levels:
        lines = generator.lines(level)
        counts[str(level)] = len(lines)
        for line in lines:
            points = [tuple(map(float, point)) for point in line]
            if len(points) < 2:
                continue
            draw.line(points, fill="#f7fbfd", width=3, joint="curve")
            draw.line(points, fill=color, width=1, joint="curve")
    return counts


def precipitation(region: str, meta: dict, annual: np.ndarray):
    bounds, (width, height) = meta["bounds"], meta["size"]
    lon, lat = indices(bounds, width, height)
    source_col = np.floor((np.mod(lon + 180, 360)) * 4).astype(int).clip(0, 1439)
    source_row = np.floor((90 - lat) * 4).astype(int).clip(0, 719)
    sampled = annual[np.ix_(source_row, source_col)]
    image = Image.fromarray(rgba_classes(sampled, RAIN_BREAKS, RAIN_COLORS), "RGBA")
    west, south, east, north = bounds
    grid_lon = np.arange(np.ceil((west - .125) * 4), np.floor((east + .125) * 4) + 1) / 4 + .125
    grid_lat = 89.875 - np.arange(np.floor((90 - north) * 4), np.ceil((90 - south) * 4) + 1) / 4
    columns = np.floor(np.mod(grid_lon + 180, 360) * 4).astype(int).clip(0, 1439)
    rows = np.floor((90 - grid_lat) * 4).astype(int).clip(0, 719)
    contour_values = annual[np.ix_(rows, columns)]
    x = (grid_lon - west) / (east - west) * width * 2
    y = (north - grid_lat) / (north - south) * height * 2
    counts = draw_contours(image, x, y, contour_values, RAIN_BREAKS, "#244b69")
    output = ROOT / "public/assets/atlas" / f"{region}-physical-v1"
    output.mkdir(parents=True, exist_ok=True)
    image_path = output / "precipitation.png"
    image.save(image_path, optimize=True)
    return {"image": str(image_path.relative_to(ROOT)), "imageSha256": sha(image_path), "bounds": bounds, "size": [width * 2, height * 2], "breaksMm": RAIN_BREAKS, "colors": RAIN_COLORS, "validSamplePixels": int(np.isfinite(sampled).sum()), "sampleRangeMm": [float(np.nanmin(sampled)), float(np.nanmax(sampled))], "isohyetLineCounts": counts, "sourceResolution": "0.25 degree", "displayMethod": "Nearest original GPCC cell at display pixel centre; straight-line 250 mm isohyets interpolated between original 0.25-degree cell centres. Country clipping occurs in the SVG."}


def elevation(region: str, meta: dict, source_dir: Path):
    parts = []
    source_files = []
    for filename in meta["etopo"]:
        path = source_dir / filename
        dataset = gdal.Open(str(path))
        if dataset is None or dataset.RasterCount != 1 or dataset.GetRasterBand(1).GetNoDataValue() != -99999:
            raise ValueError("Unexpected ETOPO subset: " + filename)
        parts.append(dataset.ReadAsArray())
        source_files.append({"name": filename, "sha256": sha(path), "size": [dataset.RasterXSize, dataset.RasterYSize], "origin": list(dataset.GetGeoTransform()[:1]) + [dataset.GetGeoTransform()[3]], "pixelSize": [dataset.GetGeoTransform()[1], dataset.GetGeoTransform()[5]]})
        dataset = None
    source = np.concatenate(parts, axis=1)
    bounds, (width, height) = meta["bounds"], meta["size"]
    west, south, east, north = bounds
    expected = (int(round((north - south) * 60)), int(round((east - west) * 60)))
    if source.shape != expected:
        raise ValueError(f"ETOPO window mismatch {region}: {source.shape} != {expected}")
    longitude, latitude = indices(bounds, width, height)
    col = np.floor((longitude - west) * 60).astype(int).clip(0, source.shape[1] - 1)
    row = np.floor((north - latitude) * 60).astype(int).clip(0, source.shape[0] - 1)
    sampled = source[np.ix_(row, col)]
    sampled = np.where(sampled <= -99999, np.nan, sampled)
    image = Image.fromarray(rgba_classes(sampled, ELEV_BREAKS, ELEV_COLORS), "RGBA")
    # The contour input is the explicitly declared overview sample, not the
    # untouched 60-second source. No unsupported local summit claim is made.
    x = np.arange(width * 2, dtype=float) + .5
    y = np.arange(height * 2, dtype=float) + .5
    counts = draw_contours(image, x, y, sampled, ELEV_BREAKS[1:], "#4e4647")
    output = ROOT / "public/assets/atlas" / f"{region}-physical-v1"
    output.mkdir(parents=True, exist_ok=True)
    image_path = output / "elevation.png"
    image.save(image_path, optimize=True)
    return {"image": str(image_path.relative_to(ROOT)), "imageSha256": sha(image_path), "bounds": bounds, "size": [width * 2, height * 2], "breaksM": ELEV_BREAKS, "colors": ELEV_COLORS, "validSamplePixels": int(np.isfinite(sampled).sum()), "unclippedSourceWindowRangeM": [float(np.nanmin(sampled)), float(np.nanmax(sampled))], "contourLineCounts": counts, "sourceResolution": "60 arc-seconds", "contourInput": "Two-pixel-per-map-unit overview sample from original 60-second cell centres; linear 500 m contour interpolation. Small peaks and narrow valleys can be omitted.", "sourceSubsets": source_files}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--gpcc", type=Path, required=True)
    parser.add_argument("--etopo-dir", type=Path, required=True)
    args = parser.parse_args()
    annual = source_annual(args.gpcc)
    for region, meta in REGIONS.items():
        rainfall = precipitation(region, meta, annual)
        relief = elevation(region, meta, args.etopo_dir)
        manifest = {"schemaVersion": 1, "region": region, "gpcc": {"publisher": "GPCC/DWD", "sourceUrl": GPCC_URL, "sourceSha256": GPCC_SHA, "period": "1991–2020", "edition": 2025, "unit": "mm/year", "license": "CC BY 4.0", "licenseUrl": "https://www.dwd.de/EN/service/legal_notice/legal_notice.html", "citation": "Rustemeier et al. (2025), GPCC Precipitation Analysis Climatology v2025, DOI:10.5676/DWD_GPCC/CLIMAT_V2025_025", **rainfall}, "etopo": {"publisher": "NOAA NCEI", "sourceUrl": ETOPO_URL, "sourceEdition": 2022, "verticalDatum": "EGM2008", "unit": "m", "rights": "U.S. public domain; attribution requested", "metadataUrl": "https://data.noaa.gov/metaview/page?header=none&view=getDataView&xml=NOAA/NESDIS/NGDC/MGG/DEM//iso/xml/etopo_2022.xml", "citation": "NOAA NCEI (2022), ETOPO 2022 Global Relief Model, DOI:10.25921/fd45-gt74", **relief}, "limitations": ["Map image is clipped by the existing target-country outline; no annual water availability, river discharge, exact mountain height or coastal survey value is inferred.", "Raster pixels and contour lines are overview cartography, not source observation dates or administrative statistics."]}
        path = ROOT / "public/assets/atlas" / f"{region}-physical-v1" / "manifest.json"
        path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        print(region, {"rain": rainfall["sampleRangeMm"], "elevation": relief["unclippedSourceWindowRangeM"], "rainLines": sum(rainfall["isohyetLineCounts"].values()), "elevationLines": sum(relief["contourLineCounts"].values())})


if __name__ == "__main__":
    main()
