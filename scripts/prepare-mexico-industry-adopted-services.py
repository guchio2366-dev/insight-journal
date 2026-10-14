#!/usr/bin/env python3
"""Prepare approved Mexico service industries from archived INEGI source tables.

Run without arguments to rebuild deterministically. --refresh-ce downloads the
public CE2024 table (reference year 2023); --check validates the committed output
against the archived source without rewriting it. No credentials are required.
"""

import argparse
import collections
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/atlas/mexico-industry-adopted"
OUTPUT = ROOT / "src/data/atlas/mexico/industry-adopted-services.json"
ENDPOINT = "https://www.inegi.org.mx/app/tabulados/pxwebapi/api/datatable"
TABLE_URL = "https://www.inegi.org.mx/app/tabulados/interactivos/?bd=CE2024&px=CE_GENNCE_1"
SOURCE_DATE = "2026-10-14"


def read(name):
    return json.loads((ASSETS / name).read_text())


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def cell(raw):
    """SD has two meanings in CE metadata; it must never become an inferred 0."""
    value = raw.split("|")[0].strip()
    if value == "-":
        return None, "confidential"
    if value == "SD":
        return None, "unknown"
    if not value:
        return None, "unretrieved"
    number = float(value.replace(",", ""))
    if number.is_integer():
        number = int(number)
    return number, "zero" if number == 0 else "available"


def ce_rows(raw):
    states, activities = raw["stub"]
    assert states["code"] == "Entidad federativa"
    assert activities["code"] == "Actividad económica"
    assert raw["colCount"] == 2
    assert "Personal ocupado total" in raw["heading"][0]["label"][0]
    assert "Valor agregado censal bruto" in raw["heading"][0]["label"][1]
    count = len(activities["label"])
    assert len(raw["data"]) == len(states["label"]) * count * 2
    rows = {}
    for si, state in enumerate(states["label"]):
        for ai, activity in enumerate(activities["label"]):
            key = activity.split(" ", 1)[0]
            idx = (si * count + ai) * 2
            rows.setdefault(key, {})[state[:2]] = {
                "stateLabel": state[3:],
                "employment": cell(raw["data"][idx]),
                "vacb": cell(raw["data"][idx + 1]),
            }
    return rows


SOURCES = {
    "mx-service-ce2023": {
        "title": "INEGI CE2024：州・SCIAN別就業者数とセンサス付加価値（参照2023年）",
        "url": TABLE_URL, "year": 2023,
        "scope": "CE_GENNCE_1。民間・国営企業、都市で捕捉した対象。全国＋32州、SCIAN23/48-49/52/53/54/5415/561422/721、就業者数・VACB。家計調査の全国就業者や国民勘定GDPとは範囲が異なる。'-'は秘匿、SDは非存在または本社所在地への計上。建設・運輸・金融等は本社所在地基準。",
    },
    "mx-service-cbs2025": {
        "title": "INEGI CBS2025（2026年10月2日公表）",
        "url": "https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/pibact/CBS2026_RR.pdf", "year": 2025,
        "scope": "表2：基本価格・当年価格VAB。全国VAB33,576,797百万MXN、市場価格GDP35,923,239百万MXN。図4：有給・企業所属就業ポスト。表4：平均年報酬。産業大分類の値を狭い製品・業務へ配賦しない。",
    },
    "mx-service-cstm2024": {
        "title": "INEGI観光サテライト勘定2024（2025年12月18日公表）",
        "url": "https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/turismo/CSTM2024_CP.pdf", "year": 2024,
        "scope": "観光VAB・有給就業ポスト。全国VAB31,331,232百万MXN、全国有給ポスト39,653,160。観光全体は複数産業にまたがり、CE721宿泊と一致しない。WTTC間接・誘発効果込みの総寄与とも区別。",
    },
    "mx-service-evi2025": {
        "title": "INEGI EVI：2025年国際訪問者・支出（2026年2月12日公表、年次表2）",
        "url": "https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/ViajInternales/evi2026_02.pdf", "year": 2025,
        "scope": "外国居住者の来訪回数・支出。宿泊観光客と日帰り客、境界内滞在と内陸を区分。固有人数ではない。国籍別入国やUPM居住国別航空入国と分母が異なる。暫定値。",
    },
    "mx-service-bop2025": {
        "title": "Banco de México：2025年サービス貿易、2026年8月25日改訂（表A1）",
        "url": "https://www.banxico.org.mx/publicaciones-y-prensa/balanza-de-pagos/%7BE333A05C-EB45-9A4A-6F1D-591845A64896%7D.pdf", "year": 2025,
        "scope": "国際収支MBP6、百万USD。サービス総輸出65,802。狭いSCIAN業種とサービス品目は対応しない。旧2026年2月公表値から改訂済み。",
    },
    "mx-service-bts2025": {
        "title": "米国BTS：米墨貨物貿易2025（2026年5月15日公表）",
        "url": "https://www.bts.gov/newsroom/transborder-freight-data-annual-report-2025-0", "year": 2025,
        "scope": "運ばれた商品の貿易価額。物流企業の売上・付加価値・サービス輸出ではない。表1b輸送手段、表4b国境ゲート。米国側統計。",
    },
    "mx-service-datatur-ranking2024": {
        "title": "DataTur：UN Tourismに基づく2024年国際観光順位",
        "url": "https://www.datatur.sectur.gob.mx/SitePages/omt.aspx", "year": 2024,
        "scope": "宿泊を伴う国際観光客到着数6位、旅行受取16位。人数と収入は別の順位。2025年世界順位ではない。",
    },
    "mx-service-datatur-residence2025": {
        "title": "DataTur RAT2025年12月：UPM居住国別航空入国（14頁）",
        "url": "https://datatur.sectur.gob.mx/Documentoscompartidos/rat/RAT-2025-12(ES).pdf", "year": 2025,
        "scope": "UPM外国居住者航空来訪約20.6百万人、米国約13.7、カナダ約2.8。丸め値。EVI航空観光客22.867百万人、国籍別航空入国22.1百万人とは別系列。",
    },
    "mx-service-ecis2024": {
        "title": "INEGI ECIS2025（参照2024年、2026年8月13日公表）",
        "url": "https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/ecis/ECIS2025_RR.pdf", "year": 2024,
        "scope": "対象9,796社、標本5,938社。工業・商業・民間非金融サービス。通信・コンピューター・情報の対象企業収入99.7%、その他企業サービス86.6%がデジタル供給。全収入の米国比76.9%をIT/BPMだけの比率にしない。BOP全サービスと分母が異なる。",
    },
    "mx-service-aws2025": {
        "title": "AWS：メキシコ地域稼働と投資計画（2025年1月14日）",
        "url": "https://press.aboutamazon.com/2025/1/aws-launches-infrastructure-region-in-mexico", "year": 2025,
        "scope": "地域稼働は実績。15年間50億USD超の投資は計画で支出実績ではない。企業の推計効果は国全体のIT付加価値や雇用へ流用しない。",
    },
}


def indicator(label, value, unit, year, definition, source, status="observed", denominator=None, note=None):
    result = dict(label=label, value=value, unit=unit, year=year,
                  definition=definition, sourceIds=[source], status=status)
    if denominator is not None:
        result["denominator"] = denominator
    if note:
        result["note"] = note
    return result


def unknown(label, unit, definition, source="mx-service-ce2023", year="未確認"):
    return indicator(label, None, unit, year, definition, source, "unconfirmed")


def bop(label, value, definition, note=None):
    return indicator(label, value, "百万USD", 2025, definition,
                     "mx-service-bop2025", note=note)


DEFINITIONS = [
    dict(id="tourism", label="観光・宿泊", family="tourism", scian="721",
         overview="国内旅行と海外来訪を支える宿泊・飲食・移動・文化サービスを読む。地図はそのうち宿泊業の就業者数。",
         why="観光VABは2024年全国の8.7%。2025年旅行受取は349.9億USDで、観光客到着数と収入の世界順位を別に見る意味がある。",
         process="来訪元・国内の居住地 → 航空・道路・クルーズ → 宿泊・飲食・体験 → 滞在中の支出。",
         boundary="州地図はCE721宿泊業2023年の就業者。観光全体のVAB8.7%を州の塗り値にしない。観光サテライト勘定は他業種と重なり、業種VABへ単純加算できない。",
         mapdef="CE2023・SCIAN721宿泊業の州別就業者数。観光全体、飲食業、来訪者数を表す地図ではない。"),
    dict(id="logistics", label="物流・輸送・倉庫", family="logistics", scian="48-49",
         overview="工業地域・農産地・港と国境ゲート、域内市場を結ぶ輸送と保管。",
         why="米墨貨物貿易は2025年8,728億USD、その73.6%がトラック。北米の製造・食料供給網と国境経路の集中を比較できる。",
         process="調達・生産 → 集荷・倉庫 → 道路・鉄道・港湾・空港・通関 → 工場・販売市場。",
         boundary="州地図とVABは旅客輸送・郵便も含む48-49の広い分類。CEは本社所在地に集約され、現場ドライバー・港湾労働者や荷物の所在を表さない。BTSの商品価額を物流売上にしない。",
         mapdef="CE2023・SCIAN48-49交通郵便倉庫の本社等の集計所在地別就業者。貨物専業でも現場人員でもない。"),
    dict(id="professional", label="専門・企業サービス", family="business", scian="54",
         overview="設計・研究、法務会計、経営支援など、企業活動を支える人と知識の集中。",
         why="専門科学技術サービスの2025年VABは全国の2.4%。専門・経営コンサルの国際サービス輸出は99.9億USD。工場以外の稼ぎ方を読む。",
         process="顧客の課題 → 設計・研究・法務会計・助言 → 成果物や継続支援 → 国内外の顧客へ提供。",
         boundary="CE54はIT設計5415も含むため、digitalの就業者を足し直すと重複する。BOP専門・経営コンサルはSCIAN54全体と同じ範囲ではない。",
         mapdef="CE2023・SCIAN54専門科学技術サービスの州別就業者。IT設計5415を含む上位分類。"),
    dict(id="finance", label="金融・保険", family="business", scian="52",
         overview="銀行・保険・金融仲介・決済の機能と、資金・人・情報の集中。",
         why="2025年金融保険VABは全国の5.0%。国内の資金仲介として大きく、金融サービス輸出だけを理由に世界的金融優位を主張しない。",
         process="預金・保険料・投資資金 → 仲介・審査・運用・リスク分担 → 融資・決済・保険給付。",
         boundary="CE52は本社所在地に集計され、支店網、顧客、現場勤務者の実際の州別分布とは異なる。金融取引額や資金残高は付加価値・サービス輸出ではない。",
         mapdef="CE2023・SCIAN52金融保険の本社等の集計所在地別就業者。支店や顧客の分布ではない。"),
    dict(id="digital", label="IT設計・関連サービス", family="business", scian="5415",
         overview="ソフト開発・システム設計・関連サービスを、電子機器製造や通信と分けて読む。",
         why="CE2023で狭いIT設計5415は92,366人、VACB321.1億MXN。クラウド稼働・企業のデジタル需要と、国内に残る仕事・付加価値を比較する。",
         process="要件・データ → システム設計・ソフト開発・統合 → 運用支援 → 国内外の利用企業。",
         boundary="地図は5415のみ。上位の専門サービス54や情報メディア51、BOP通信コンピューター情報全体をIT設計だけのGDP・輸出へ流用しない。秘匿州はゼロではない。",
         mapdef="CE2023・SCIAN5415コンピューターシステム設計・関連サービスの州別就業者。電子製造・通信・BPMは含まない。"),
    dict(id="bpm", label="電話受付・販促受託", family="business", scian="561422",
         overview="顧客対応・電話受付・販促受託を、ソフト開発や他の業務受託と分けて読む。",
         why="CE2023の電話受付・販促561422は62,857人、VACB216.2億MXN。人の技能と遠隔業務の分業を、狭い観測範囲で紹介する。",
         process="委託企業の顧客・業務 → 電話受付・顧客対応・販促 → 処理結果を企業へ返す。",
         boundary="561422はBPM/BPO全体ではなく電話受付・販促に限る。秘匿13州、SD5州があり、公開州だけを完全な全国分布や全国順位にしない。SDは非存在か本社集約か区別できず不明。",
         mapdef="CE2023・SCIAN561422電話受付・電話販促の州別就業者。BPM/BPO全体ではない。秘匿・SDを欠測として保持。"),
    dict(id="construction", label="建設", family="built", scian="23",
         overview="住宅・工場・道路などの建設を、資材製造や不動産賃貸と分けて読む。",
         why="建設の2025年VABは全国の6.8%。工業立地・都市需要と、工場や交通設備への投資を結ぶ産業として読む。",
         process="発注・設計 → 建材と専門工事の調達 → 施工・設備設置 → 住宅・産業施設・インフラの引渡し。",
         boundary="表示上はservicesの建設不動産群に分類するが、メキシコ国民勘定では建設は第二次活動。CE23は本社所在地集計で、施工場所・建設量・現場人員の所在ではない。",
         mapdef="CE2023・SCIAN23建設の本社等の集計所在地別就業者。施工現場・建設需要の分布ではない。"),
    dict(id="real-estate", label="不動産・賃貸", family="built", scian="53",
         overview="建物の利用・賃貸・仲介・管理と、製造・観光・住宅需要をつなぐ。",
         why="不動産・動産無形資産賃貸の2025年VABは全国の9.1%。企業・家計が場所や設備を利用する経済を読む。",
         process="土地・建物・設備 → 賃貸・仲介・管理 → 家計・宿泊業・工業・商業の利用。",
         boundary="CE53は不動産だけでなく動産・無形資産賃貸も含む。国民勘定VABには持家の帰属家賃等も含まれ、CEの市場向け企業就業者と範囲が異なる。不動産売買価格・建築施工量でもない。",
         mapdef="CE2023・SCIAN53不動産・動産無形資産賃貸の州別就業者。持家の帰属家賃や不動産価格の地図ではない。"),
]


def build():
    raw = read("services-ce2023-original.json")
    rows = ce_rows(raw)
    totals = ce_rows(read("services-ce2023-total-original.json"))["Total"]["00"]
    census_employment = totals["employment"][0]
    census_vacb = totals["vacb"][0]
    gva = {"logistics": (2702854, 8.0), "professional": (816996, 2.4),
           "finance": (1692255, 5.0), "construction": (2284549, 6.8),
           "real-estate": (3053435, 9.1)}
    industries = []
    for spec in DEFINITIONS:
        data = rows[spec["scian"]]
        national = data["00"]
        employment, vacb = national["employment"][0], national["vacb"][0]
        states = [dict(state=state, value=item["employment"][0], status=item["employment"][1])
                  for state, item in data.items() if state != "00"]
        public = sorted([v for v in states if v["value"] is not None],
                        key=lambda v: (-v["value"], v["state"]))[:3]
        regions = [dict(state=v["state"], stage="就業集計",
                        note=f"{data[v['state']]['stateLabel']}：CE2023の公開値{v['value']:,}人。全国分母は同じSCIAN{spec['scian']}。秘匿・不明州を含めた順位ではない。",
                        sourceIds=["mx-service-ce2023"]) for v in public]
        domestic = [
            indicator("CE対象業種の全国就業者", employment, "人", 2023,
                      f"CE対象SCIAN{spec['scian']}の就業者。企業所属・外部所属、無給等も含み、ENOE全国雇用や有給ポストと異なる。", "mx-service-ce2023"),
            indicator("CE対象全国就業者に占める比率", employment / census_employment * 100, "%", 2023,
                      f"同年CE対象全業種を分母とするSCIAN{spec['scian']}の比率。全経済雇用比ではない。", "mx-service-ce2023",
                      denominator=dict(label="全国CE対象全業種就業者", value=census_employment, unit="人")),
            indicator("CE対象業種の全国付加価値", vacb, "百万MXN", 2023,
                      f"SCIAN{spec['scian']}の当年価格VACB。国民勘定GDPではない。", "mx-service-ce2023",
                      denominator=dict(label="全国CE対象全業種VACB（同年・参考）", value=census_vacb, unit="百万MXN")),
        ]
        world = [unknown("同範囲の世界サービス輸出シェア", "%", f"SCIAN{spec['scian']}と対応する世界輸出分母を未確認。国内重要性の有無を示す欠測ではない。")]
        trade = [unknown("同範囲のサービス輸出", "百万USD", f"SCIAN{spec['scian']}の輸出を独立した範囲で未確認。物量の生産＋輸入−輸出式は用いない。", "mx-service-bop2025")]
        if spec["id"] in gva:
            value, percent = gva[spec["id"]]
            domestic += [
                indicator("国民勘定の業種付加価値", value, "百万MXN", 2025,
                          f"基本価格・当年価格。SCIAN{spec['scian']}の広い業種。CE2023とは年・推計範囲が異なる。", "mx-service-cbs2025"),
                indicator("全国付加価値に占める比率", percent, "%", 2025,
                          "CBS公表の丸め比率。市場価格GDP比ではない。", "mx-service-cbs2025",
                          denominator=dict(label="全国基本価格VAB", value=33576797, unit="百万MXN")),
            ]
        else:
            domestic.append(unknown("狭い業種の国民勘定GDP比", "%", f"SCIAN{spec['scian']}に限った国民勘定付加価値を未確認。上位業種のGDP比は代用しない。", "mx-service-cbs2025"))
        if spec["id"] == "tourism":
            domestic[-1:] = [
                indicator("観光全体の付加価値", 2713120, "百万MXN", 2024,
                          "観光サテライト勘定。CE721宿泊業だけの値ではない。WTTC総寄与とも異なる。", "mx-service-cstm2024"),
                indicator("観光全体の全国付加価値比", 8.7, "%", 2024,
                          "CSTM公表値。観光全体の寄与、州地図の塗り値ではない。", "mx-service-cstm2024",
                          denominator=dict(label="同公表時点の全国VAB", value=31331232, unit="百万MXN")),
                indicator("観光全体の有給就業ポスト", 2931592, "ポスト", 2024,
                          "同じ人の複数ポストを含み得る。CE就業者人数とは異なる。", "mx-service-cstm2024",
                          denominator=dict(label="全国有給就業ポスト", value=39653160, unit="ポスト")),
                indicator("観光全体の有給就業ポスト比", 7.4, "%", 2024,
                          "CSTM公表の丸め比率。CE721宿泊業やENOE全国就業者の比ではない。", "mx-service-cstm2024",
                          denominator=dict(label="全国有給就業ポスト", value=39653160, unit="ポスト")),
                indicator("宿泊サービスの付加価値（CSTM）", 568815, "百万MXN", 2024,
                          "CSTMの来訪者向け宿泊サービス。観光全体とは別の範囲。", "mx-service-cstm2024"),
            ]
            world = [indicator("国際観光客到着数の世界順位", 6, "位", 2024,
                               "UN Tourismの宿泊を伴う国際観光客到着数。2025年順位ではない。", "mx-service-datatur-ranking2024"),
                     indicator("国際旅行受取の世界順位", 16, "位", 2024,
                               "人数の順位とは別。DataTurによるUN Tourism集計。", "mx-service-datatur-ranking2024")]
            trade = [
                indicator("外国居住者の全来訪", 98202774, "来訪回", 2025,
                          "宿泊観光客と日帰り客を合算。固有の人数ではない。暫定値。", "mx-service-evi2025"),
                indicator("宿泊を伴う国際観光客", 47786706, "来訪回", 2025,
                          "境界内滞在20,415,107回と内陸27,371,599回。全訪問者とは異なる。", "mx-service-evi2025"),
                indicator("日帰りの国際訪問者", 50416068, "来訪回", 2025,
                          "宿泊を伴わない境界来訪・クルーズ。", "mx-service-evi2025"),
                indicator("外国居住者の旅行支出", 34991.6, "百万USD", 2025,
                          "EVI全訪問者支出。宿泊31,715.4、日帰り3,276.3。航空運賃等の輸送サービスと区別。", "mx-service-evi2025"),
                indicator("航空来訪の米国居住者比（UPM）", 13.7 / 20.6 * 100, "%", 2025,
                          "UPM居住国別の丸め値から自算。米国約13.7百万人、総計約20.6百万人。EVI航空観光客を分母にしない。", "mx-service-datatur-residence2025", "estimate",
                          denominator=dict(label="UPM外国居住者航空来訪（丸め値）", value=20.6, unit="百万人")),
            ]
        if spec["id"] == "logistics":
            domestic.append(indicator("参考：交通郵便倉庫の有給就業ポスト比", 7.8, "%", 2025,
                                      "CBS48-49。貨物物流だけでなく旅客・郵便を含む。CE就業者人数とも異なる。", "mx-service-cbs2025",
                                      denominator=dict(label="全国有給・企業所属就業ポスト", value=39600138, unit="ポスト")))
            trade = [bop("参考：輸送サービス輸出", 7378, "BOP旅客・貨物・その他輸送の全体。貨物物流だけではない。"),
                     bop("参考：輸送サービス輸入", 25407, "BOP旅客・貨物・その他輸送の全体。"),
                     indicator("米墨の貨物貿易価額", 872833677052, "USD", 2025,
                               "米国側統計。運ばれた商品の輸出入価額で、運賃・物流売上ではない。", "mx-service-bts2025"),
                     indicator("米墨貨物価額のトラック比", 73.6, "%", 2025,
                               "トラック輸送の商品価額642,241,157,455USD。", "mx-service-bts2025",
                               denominator=dict(label="米墨貨物貿易価額", value=872833677052, unit="USD")),
                     indicator("トラック貿易価額のラレド比", 46.1, "%", 2025,
                               "ゲート別の商品価額。イスレタ17.5%、オタイメサ9.1%。メキシコの全輸出比ではない。", "mx-service-bts2025",
                               denominator=dict(label="米墨トラック貨物貿易価額", value=642241157455, unit="USD"))]
        if spec["id"] == "professional":
            trade = [bop("専門・経営コンサルの輸出", 9986, "BOPサービス品目。CE54全体と同一の範囲ではない。"),
                     bop("専門・経営コンサルの輸入", 7371, "BOPサービス品目。CE54全体と同一の範囲ではない。"),
                     indicator("専門・経営コンサルのサービス輸出比", 9986 / 65802 * 100, "%", 2025,
                               "同じ改訂時点のサービス貿易から自算。国内付加価値比ではない。", "mx-service-bop2025",
                               denominator=dict(label="全国サービス総輸出", value=65802, unit="百万USD"))]
        if spec["id"] == "finance":
            domestic.append(indicator("金融保険の平均年報酬", 815815, "MXN／有給ポスト・年", 2025,
                                      "CBS52の有給・企業所属ポスト。当年価格。全産業平均271,767MXNの約3倍。雇用人数や国際優位の指標ではない。", "mx-service-cbs2025"))
            trade = [bop("金融サービス輸出", 1071, "手数料等と間接測定金融サービス。資金移動・貸出残高ではない。"),
                     bop("金融サービス輸入", 2347, "BOP金融サービス品目。"),
                     bop("保険・年金サービス輸出", 5539, "サービス価額。保険料の総額ではない。"),
                     bop("保険・年金サービス輸入", 9953, "サービス価額。保険料の総額ではない。")]
        if spec["id"] == "digital":
            trade += [bop("参考：通信・コンピューター・情報の輸出", 2735,
                          "IT5415より広いBOPサービス品目。IT設計だけの輸出にしない。"),
                      bop("参考：通信・コンピューター・情報の輸入", 6525,
                          "IT5415より広いBOPサービス品目。輸入依存率を算出する分母ではない。"),
                      indicator("参考：通信情報サービスのデジタル供給比", 99.7, "%", 2024,
                                "ECIS対象企業の当該サービス収入を分母とする。IT5415だけでもBOP全体でもない。", "mx-service-ecis2024"),
                      indicator("参考：AWSの15年間投資計画", 5, "十億USD超", "2025年公表・15年間計画",
                                "メキシコ地域は2025年1月稼働。投資額は計画、国全体の支出実績ではない。", "mx-service-aws2025", "estimate")]
        item = {k: v for k, v in spec.items() if k not in ("scian", "mapdef")}
        item.update(sectors=["services"], map=dict(kind="employment", year=2023, unit="人",
                    definition=spec["mapdef"], nationalTotal=employment, sourceIds=["mx-service-ce2023"],
                    values=states, regions=regions), statistics=dict(domestic=domestic, world=world, trade=trade))
        industries.append(item)
    return dict(sources=SOURCES, industries=industries)


def validate(payload):
    expected = {spec["id"] for spec in DEFINITIONS}
    assert {item["id"] for item in payload["industries"]} == expected
    assert len(payload["industries"]) == 8
    assert all(key.startswith("mx-service-") for key in payload["sources"])
    for item in payload["industries"]:
        assert item["sectors"] == ["services"]
        states = item["map"]["values"]
        assert len(states) == 32 and {v["state"] for v in states} == {f"{i:02d}" for i in range(1, 33)}
        for value in states:
            assert (value["status"] in ("available", "zero")) == (value["value"] is not None)
            assert value["status"] != "zero" or value["value"] == 0
        measured = sum(v["value"] for v in states if v["value"] is not None)
        if all(v["value"] is not None for v in states):
            assert measured == item["map"]["nationalTotal"], item["id"]
        else:
            assert measured <= item["map"]["nationalTotal"], item["id"]
        for indicator_list in item["statistics"].values():
            for ind in indicator_list:
                assert ind["sourceIds"] and set(ind["sourceIds"]) <= payload["sources"].keys()
                assert (ind["value"] is None) == (ind["status"] == "unconfirmed")
    by_id = {item["id"]: item for item in payload["industries"]}
    assert by_id["digital"]["map"]["nationalTotal"] == 92366
    assert by_id["bpm"]["map"]["nationalTotal"] == 62857
    prior = read("services-ce2023-it-bpm-verification.json")
    assert cell(prior["data"][0])[0] == by_id["digital"]["map"]["nationalTotal"]
    assert cell(prior["data"][6])[0] == by_id["bpm"]["map"]["nationalTotal"]


def provenance(payload):
    archives = []
    for path in sorted(ASSETS.glob("services-*original.*")):
        archives.append(dict(path=str(path.relative_to(ROOT)), bytes=path.stat().st_size,
                             sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    return dict(retrievedOn=SOURCE_DATE, ceEndpoint=ENDPOINT, ceTable="CE2024/CE_GENNCE_1",
                geography="00全国と01–32州。地図は全国行を除き、nationalTotalに保存。",
                cells="州×8業種×2指標。応答のstub順で解釈し要求順を仮定しない。",
                missing={"-": "confidential", "SD": "unknown：非存在または本社所在地集約で区別できない", "numeric 0": "zero"},
                checks=["32州キー重複なし", "公開完全6業種の州就業者合計＝全国同業種", "IT/BPM全国値を既取得原票と再照合", "出典ID・欠測・数値の契約検証"],
                archived=archives, sources=SOURCES,
                verifiedExtractFile="public/assets/atlas/mexico-industry-adopted/services-verified-extracts.json",
                sourceArchiveLimitations="Banxico/BTS/DataTur/AWSは公開Webツールで本文確認済み。環境からの原文取得が403となったため、該当原PDF/HTMLは未保存で、確認した統計の出典・頁・範囲を別の検証済み抜粋へ保存。抜粋を原文コピーと表示しない。",
                mapStatusCounts={item["id"]: dict(collections.Counter(v["status"] for v in item["map"]["values"])) for item in payload["industries"]})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh-ce", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.refresh_ce:
        for suffix in ("", "-total"):
            request = read(f"services-ce2023{suffix}-request.json")
            response = urllib.request.urlopen(urllib.request.Request(ENDPOINT,
                data=json.dumps(request, ensure_ascii=False).encode(),
                headers={"Content-Type": "application/json"}), timeout=45).read()
            json.loads(response)
            (ASSETS / f"services-ce2023{suffix}-original.json").write_bytes(response)
    result = build()
    validate(result)
    if args.check:
        assert read_output() == result, "Generated output differs from archived sources."
    else:
        save(OUTPUT, result)
        save(ASSETS / "services-provenance.json", provenance(result))
        save(ASSETS / "services-verified-extracts.json", {
            "type": "verified numeric extraction; not an original document copy",
            "verifiedOn": SOURCE_DATE,
            "sources": SOURCES,
            "sourceTableLocations": {"mx-service-cbs2025": "表2・図4・表4", "mx-service-cstm2024": "表1・表2", "mx-service-evi2025": "年次表2", "mx-service-bop2025": "表A1・2025年年次欄", "mx-service-bts2025": "表1b・表4b", "mx-service-datatur-residence2025": "14頁", "mx-service-ecis2024": "17頁"},
            "indicators": {item["id"]: item["statistics"] for item in result["industries"]},
        })
    print(json.dumps({"industries": len(result["industries"]), "mapCells": 256,
                      "statuses": provenance(result)["mapStatusCounts"], "validated": True}, ensure_ascii=False))


def read_output():
    return json.loads(OUTPUT.read_text())


if __name__ == "__main__":
    main()
