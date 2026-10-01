"""Regenerate Mexico's 2020 state population and published density artifacts.

Inputs are the original INEGI PDF (losslessly gzip-compressed), a selected
population CSV, and the original ITER metadata/dictionary. No density is
calculated from the display geometry. Run from the repository root with the
existing Python environment, which includes pypdf.
"""

from __future__ import annotations

import csv
import gzip
import hashlib
import io
import json
from pathlib import Path
import re

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data-source/atlas/mexico/population"
DATA = ROOT / "src/data/atlas/mexico/population.json"
ASSETS = ROOT / "public/assets/atlas/mexico-population-v1"
NAMES_JA = [
    "アグアスカリエンテス", "バハ・カリフォルニア", "バハ・カリフォルニア・スル",
    "カンペチェ", "コアウイラ", "コリマ", "チアパス", "チワワ", "メキシコ市",
    "ドゥランゴ", "グアナフアト", "ゲレロ", "イダルゴ", "ハリスコ", "メキシコ州",
    "ミチョアカン", "モレロス", "ナヤリト", "ヌエボ・レオン", "オアハカ", "プエブラ",
    "ケレタロ", "キンタナ・ロー", "サン・ルイス・ポトシ", "シナロア", "ソノラ",
    "タバスコ", "タマウリパス", "トラスカラ", "ベラクルス", "ユカタン", "サカテカス",
]
ABBREVIATIONS = [
    "AGS", "BC", "BCS", "CAM", "COA", "COL", "CHS", "CHH", "CDMX", "DGO", "GTO",
    "GRO", "HGO", "JAL", "MEX", "MIC", "MOR", "NAY", "NL", "OAX", "PUE", "QRO",
    "QR", "SLP", "SIN", "SON", "TAB", "TAM", "TLX", "VER", "YUC", "ZAC",
]


def sha256(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    record = json.loads((SOURCE / "source-record.json").read_text(encoding="utf-8"))
    pdf_bytes = gzip.decompress((SOURCE / "panorama-2020-mexico.pdf.gz").read_bytes())
    assert sha256(pdf_bytes) == record["densityPdf"]["sha256"], "Original PDF changed"
    metadata = (SOURCE / "iter-2020-metadata.txt").read_text(encoding="utf-8-sig")
    assert "license: https://www.inegi.org.mx/inegi/terminos.html" in metadata
    assert "modified: 2022-05-19" in metadata
    with (SOURCE / "iter-2020-state-extract.csv").open(encoding="utf-8-sig", newline="") as f:
        selected = list(csv.DictReader(f))
    national = [r for r in selected if r["ENTIDAD"] == "00"]
    rows = sorted([r for r in selected if r["ENTIDAD"] != "00"], key=lambda r: r["ENTIDAD"])
    assert len(national) == 1 and len(rows) == 32
    assert [r["ENTIDAD"] for r in rows] == [f"{code:02}" for code in range(1, 33)]
    assert all(r["MUN"] == "000" and r["LOC"] == "0000" for r in selected)
    national_population = int(national[0]["POBTOT"])
    assert national_population == 126_014_024
    assert sum(int(r["POBTOT"]) for r in rows) == national_population
    pdf = PdfReader(io.BytesIO(pdf_bytes))
    national_text = pdf.pages[5].extract_text()
    national_density_start = national_text.index("Densidad de")
    national_density_block = national_text[national_density_start:national_text.index("Población total", national_density_start)]
    national_area, national_density = [float(n.replace(" ", "")) for n in re.findall(r"^([\d ]+\.\d)\s*$", national_density_block, re.M)]
    assert national_density == 64.3
    states = []
    for index, raw in enumerate(rows):
        code = index + 1
        pdf_page_index = 5 + code
        text = pdf.pages[pdf_page_index].extract_text()
        density_start = text.index("Densidad de")
        density_block = text[density_start:text.index("Población total", density_start)]
        numbers = re.findall(r"^([\d ]+\.\d)\s*$", density_block, re.M)
        assert len(numbers) == 2, (raw["ENTIDAD"], numbers)
        area, density = [float(n.replace(" ", "")) for n in numbers]
        printed_population = int(re.search(r"Población total\n([\d ]+) representa", text).group(1).replace(" ", ""))
        population = int(raw["POBTOT"])
        assert population == printed_population
        assert population == int(raw["POBFEM"]) + int(raw["POBMAS"])
        assert population > 0 and density > 0 and area > 0
        # Diagnostic only. The stored/displayed value is always INEGI's published density.
        assert abs(population / area - density) < 0.1
        states.append({
            "stateCode": raw["ENTIDAD"], "name": raw["NOM_ENT"], "nameJa": NAMES_JA[index],
            "short": ABBREVIATIONS[index], "population": population, "populationStatus": "value",
            "density": density, "densityStatus": "value", "densityUnit": "persons/km2",
            "publishedAreaKm2": area, "densitySourcePdfPage": pdf_page_index + 1,
            "densitySourcePrintedPage": 8 + code * 2,
        })
    data = {
        "schemaVersion": 1, "referenceYear": 2020, "referenceDate": "2020-03-15",
        "referenceTime": "00:00", "populationUnit": "persons", "densityUnit": "persons/km2",
        "nationalPopulation": national_population, "nationalDensity": national_density,
        "nationalPublishedAreaKm2": national_area, "states": states,
        "sources": {
            "population": {"product": "INEGI. Censo de Población y Vivienda 2020. Principales resultados por localidad (ITER)",
                           "url": record["populationArchive"]["url"], "modified": "2022-05-19", "field": "POBTOT"},
            "density": {"product": "INEGI. Panorama sociodemográfico de México 2020", "publicationYear": 2021,
                        "url": record["densityPdf"]["url"], "method": "Official published one-decimal value; no recalculation from display geometry"},
            "license": {"url": record["licenseMetadata"]["url"], "metadataFile": "iter-2020-metadata.txt"},
        },
        "statusCounts": {"value": 32, "zero": 0, "missing": 0, "confidential": 0, "unavailable": 0},
    }
    write_json(DATA, data)
    write_json(ASSETS / "population-2020.json", data)
    ASSETS.mkdir(parents=True, exist_ok=True)
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(["state_code", "state_name", "reference_date", "population_persons", "population_status", "density_persons_per_km2", "density_status", "density_pdf_page"])
    for state in states:
        writer.writerow([state["stateCode"], state["name"], "2020-03-15", state["population"], "value", f"{state['density']:.1f}", "value", state["densitySourcePdfPage"]])
    (ASSETS / "population-density-2020.csv").write_text(output.getvalue(), encoding="utf-8", newline="")
    artifacts = []
    for filename in ["iter-2020-state-extract.csv", "iter-2020-metadata.txt", "iter-2020-dictionary.csv", "panorama-2020-mexico.pdf.gz", "source-record.json"]:
        blob = (SOURCE / filename).read_bytes()
        artifacts.append({"file": filename, "bytes": len(blob), "sha256": sha256(blob)})
    manifest = {
        "schemaVersion": 1, "accessed": "2026-10-01", "referenceDate": "2020-03-15", "referenceYear": 2020,
        "sourceRecord": record, "sourceArtifacts": artifacts,
        "transformations": ["Extract national and 32 state total population rows using MUN=000 / LOC=0000",
                            "Extract each state's original published density from the INEGI 2020 Panorama PDF",
                            "Add Japanese display names and unchanged two-digit state codes",
                            "Generate UTF-8 JSON/CSV; retain original population integers and density decimals"],
        "validation": {"states": 32, "populationSum": national_population, "sumMatchesNational": True,
                       "allPdfPopulationMatchesIter": True, "densityFromDisplayGeometry": False},
        "displayGeometry": {"reference": "INEGI. Marco Geoestadístico, diciembre de 2025", "joinKey": "cvegeo = ENTIDAD",
                            "statisticalReference": "INEGI. Censo de Población y Vivienda, 2020", "densityAreaCalculation": False},
        "units": {"population": "persons", "density": "persons/km2"}, "statusCounts": data["statusCounts"],
        "encoding": {"populationSymbol": "Circle area proportional to population; radius proportional to square root of population",
                     "density": "Sequential choropleth with explicit persons/km2 intervals; published state averages"},
        "generated": {"jsonSha256": sha256((ASSETS / "population-2020.json").read_bytes()),
                      "csvSha256": sha256((ASSETS / "population-density-2020.csv").read_bytes())},
        "license": {"url": record["licenseMetadata"]["url"], "evidence": "Original ITER metadata license field",
                    "conditions": ["Credit INEGI and original product", "Retain metadata", "Identify transformations as site author work", "Do not imply INEGI endorsement"]},
    }
    write_json(ASSETS / "manifest.json", manifest)
    print(f"Mexico population: {len(states)} states, {national_population:,} persons; all published densities retained.")


if __name__ == "__main__":
    main()
