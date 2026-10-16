"""Reproduce Mexico-only balances and public-table trade references, offline.

Never joins marketing-year balances to calendar-year HS destinations. Numerical
public-table transcriptions are retained alongside their observed source text.
"""
import csv
from decimal import Decimal
from hashlib import sha256
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCES = 'data-source/atlas/mexico/agro-statistics-20261016/'
HASHES = {
    'scripts/data/wasde0926.txt': 'de4baa0dc24769b2d8cc153bac488049d905b5c8aa1fec9696e2d4e13036e285',
    SOURCES+'gain-MX2026-0018-tables.txt': '62c88060b4c24f9e5e2e01449a10806641e168712ee38efecbeb940696ee3b94',
    SOURCES+'wits-090111.csv': '880daf2f8cac46c4958d463fcd5ef1d55588acd2ac2f0ca6ecfbc776ff8eac37',
    SOURCES+'wits-090111.txt': '83e473c212e55865cbdd48f258d075e1509a4c6e6f85282b2bcafa3151293a43',
    SOURCES+'wits-100590.csv': 'b7b4e7be8fca6661691b502b99488be3cb2602c07790c814707f6088c005fa49',
    SOURCES+'wits-100590.txt': '04297c5b254815008a5093bbf626606dcea54d8825f167bcefccc5e3439622ae',
    SOURCES+'wits-440710.csv': '3639d27e868cbe87d32929ebf25ad562c34965791b621e85e03ce214058a72c3',
    SOURCES+'wits-440710.txt': 'b91d61bd4869f1607e269bb4c08d469e3888e452182b74b93f700bc0bbe28a2f',
    SOURCES+'wits-520100.csv': '545315056d56f236d70c06ddd4511e5d28d40bbaf370f602a4adb5f4382d9582',
    SOURCES+'wits-520100.txt': 'b4d767bb6e1843c1dd0e799273f418d626404c057ce050a310289494e035c864',
}
FIELDS = ['beginningStocks', 'production', 'imports', 'domesticUse', 'exports', 'endingStocks']
NAMES = {'United States':'米国', 'Belgium':'ベルギー', 'Germany':'ドイツ', 'France':'フランス',
         'Italy':'イタリア', 'Canada':'カナダ', 'Japan':'日本', 'Australia':'オーストラリア',
         'Vietnam':'ベトナム', 'Spain':'スペイン', 'Sweden':'スウェーデン', 'Switzerland':'スイス',
         'United Kingdom':'英国', 'Ireland':'アイルランド', 'China':'中国', 'Pakistan':'パキスタン',
         'Indonesia':'インドネシア', 'Cuba':'キューバ', 'Costa Rica':'コスタリカ'}


def retained(path):
    raw = (ROOT/path).read_bytes()
    if sha256(raw).hexdigest() != HASHES[path]:
        raise ValueError('Source hash/revision disagreement: '+path)
    return raw.decode('utf-8')


def validate_balance(row):
    v = {key: Decimal(str(row[key])) for key in FIELDS}
    if any(x < 0 for x in v.values()):
        raise ValueError('Negative balance quantity')
    gap = v['beginningStocks']+v['production']+v['imports']-v['domesticUse']-v['exports']-v['endingStocks']
    if abs(gap-Decimal(str(row['lossAdjustment']))) > Decimal(str(row['roundingTolerance'])):
        raise ValueError('Unexplained balance difference')
    if row['domesticParts'] and sum(Decimal(str(x['value'])) for x in row['domesticParts']) != v['domesticUse']:
        raise ValueError('Domestic parts must be within the published parent, not extra uses')
    row['roundingGap'] = float(gap)
    return row


def build():
    wasde = retained('scripts/data/wasde0926.txt')
    balances = []
    for product, page, label, unit, columns in [
        ('cotton',26,'綿花（繰綿）','百万480ポンド俵',FIELDS[:3]+['domesticUse','exports','lossAdjustment','endingStocks']),
        ('rice',24,'米（精米換算）','百万t',FIELDS),
    ]:
        match = re.search(r'WASDE - 675 - '+str(page)+r'\s+September 2026', wasde)
        body = wasde[match.end():]
        body = re.split(r'WASDE - 675 - \d+', body, maxsplit=1)[0]
        historical = body.split('2024/25',1)[1].split('2025/26',1)[0]
        mexico = next(x for x in historical.splitlines() if re.match(r'^\s+Mexico\s{2,}',x))
        world = next(x for x in historical.splitlines() if x.startswith('World '))
        cells = re.findall(r'-?\d+\.\d+', mexico)
        if len(cells) != len(columns):
            raise ValueError('WASDE national columns changed')
        raw_values = dict(zip(columns,cells))
        world_production = re.findall(r'-?\d+\.\d+',world)[1]
        balances.append(validate_balance(dict(
            productId=product, countryCode='MEX', countryName='メキシコ', label=label,
            seriesId='cotton-lint-production' if product=='cotton' else 'rice-milled-production',
            year='2024/25', periodType='publisher-marketing-year', periodStart=None, periodEnd=None,
            unit=unit, **{k:float(v) for k,v in raw_values.items()},
            **({} if product=='cotton' else {'lossAdjustment':0}),
            worldProduction=float(world_production), worldProductionRawValue=world_production,
            rawLine=mexico, worldRawLine=world, rawValues=raw_values,
            domesticParts=[], roundingTolerance=0.03, exportDestinations=None,
            source=dict(report='WASDE-675', releaseDate='2026-09-11', page=page,
                        path='scripts/data/wasde0926.txt',sha256=HASHES['scripts/data/wasde0926.txt'],
                        url='https://www.usda.gov/oce/commodity/wasde/wasde0926.pdf'),
            notes=[
                'WASDE-675の2024/25年国別行と同じ表のWorld行。2025/26推計・2026/27予測は使用しません。',
                '販売年度は国ごとに期首が異なり得ます。共通の暦年とは呼びません。',
                '国内利用は輸入と期首在庫を含む全国供給からの利用。国内生産だけの行き先や人の食用量ではありません。',
                '輸出に含まれる再輸出・輸入原料の数量は分離できません。同年度の全相手国別数量は未収録です。',
                '繰綿は綿繊維。DGSIAPの種付き綿や綿実・綿実油と合算せず、俵をtへ換算しません。' if product=='cotton' else
                '全需給量が精米換算（Milled Basis）。DGSIAPの籾米と差し引かず、精米歩留まりを独自に仮定しません。',
                '原表Lossは用途へ含めず、丸め差を架空の消費へ押し込みません。',
            ])))
    gain_path = SOURCES+'gain-MX2026-0018-tables.txt'
    gain = retained(gain_path)
    gain_fields = {'Beginning Stocks':'beginningStocks','Production':'production','MY Imports':'imports',
                   'MY Exports':'exports','Total Consumption':'domesticUse','Ending Stocks':'endingStocks',
                   'Feed and Residual':'feedResidual','FSI Consumption':'fsi','Total Supply':'totalSupply',
                   'Total Distribution':'totalDistribution'}
    for product,label,pdf_page,start,end in [('wheat','小麦',11,'2024-07-01','2025-06-30'),
                                              ('sorghum','ソルガム（子実）',20,'2024-10-01','2025-09-30')]:
        lines = [x for x in gain.splitlines() if re.match(r'L\d+@P'+str(pdf_page)+':',x)]
        quantities, raw_values = {}, {}
        for line in lines:
            found = re.match(r'L\d+@P\d+: (.*?)\s*\(1000 MT\)\s+(.*)',line)
            if found and found[1] in gain_fields:
                cells=found[2].split()
                if len(cells)!=6 or any(not re.fullmatch(r'\d+',c) for c in cells):
                    raise ValueError('GAIN paired USDA Official/New Post columns changed')
                key=gain_fields[found[1]]
                quantities[key]=int(cells[0]); raw_values[key]=cells[0]
        if set(quantities)!=set(gain_fields.values()):
            raise ValueError('GAIN adopted quantities missing')
        if quantities['totalSupply']!=sum(quantities[k] for k in ['beginningStocks','production','imports']):
            raise ValueError('GAIN supply disagrees')
        if quantities['totalDistribution']!=sum(quantities[k] for k in ['domesticUse','exports','endingStocks']):
            raise ValueError('GAIN distribution disagrees')
        balances.append(validate_balance(dict(
            productId=product,countryCode='MEX',countryName='メキシコ',label=label,seriesId=product+'-production',
            year='2024/25',periodType='publisher-marketing-year',periodStart=start,periodEnd=end,unit='千t',
            **{k:quantities[k] for k in FIELDS},lossAdjustment=0,worldProduction=None,
            rawValues=raw_values,rawLine='\n'.join(lines),worldRawLine=None,worldProductionRawValue=None,
            domesticParts=[dict(label='飼料・残差（Feed and Residual）',value=quantities['feedResidual']),
                           dict(label='食用・種子・工業用（FSI）',value=quantities['fsi'])],
            roundingTolerance=0,exportDestinations=None,
            source=dict(report='GAIN MX2026-0018',releaseDate='2026-03-13',page=pdf_page+1,path=gain_path,
                        sha256=HASHES[gain_path],
                        url='https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Grain+and+Feed+Annual_Mexico+City_Mexico_MX2026-0018'),
            notes=[
                'GAIN MX2026-0018の2024/25年USDA Official列。New Post列・翌年度推計・予測を混ぜません。',
                '国内利用は公表Total Consumption。食用・種子・工業用と飼料・残差はその内数で、人の実際の食用量ではありません。',
                '輸入と期首在庫を含む供給です。国産分だけの国内仕向け・輸出・再輸出は分離できません。',
                '同じ資料・版の世界生産分母と同年度の全相手国別数量は未収録です。別版の世界量や暦年HS輸出で穴埋めしません。',
                '小麦・小麦製品の原穀換算貿易は、未製粉小麦のHS1001と自動的に一致しません。' if product=='wheat' else
                '子実ソルガムの需給。DGSIAPの飼料用青刈りや他の穀物とは別範囲です。',
            ])))
    references=[]
    for product,code,label,explanation in [
        ('corn','100590','とうもろこし（種子用を除く）','①②の2024/25販売年度・種子を含む子実と期間・範囲が異なります。'),
        ('cotton','520100','綿（梳いていない・すいていないもの）','①②の2024/25販売年度・繰綿の俵数とは期間・単位が異なります。種付き綿ではありません。'),
        ('coffee','090111','コーヒー生豆（カフェイン除去を除く）','①のFAOSTAT生豆と同じ2024暦年ですが、HS090111はカフェイン除去品を含まない通関分類です。DGSIAPのコーヒー果実とも区別します。'),
        ('pine','440710','針葉樹製材（厚さ6mm超）','全針葉樹の製材で、松だけの統計ではありません。①の2022年松材取得量・製材向け原木量とは年・製品が異なります。'),
    ]:
        csv_path=SOURCES+'wits-'+code+'.csv'; text_path=SOURCES+'wits-'+code+'.txt'
        rows=list(csv.DictReader(retained(csv_path).splitlines()))
        observed=re.sub(r'【\d+†([^†】]+)(?:†[^】]+)?】',r'\1',retained(text_path))
        if not rows or any((r['Reporter'],r['TradeFlow'],r['ProductCode'],r['Year'],r['Classification'],r['Unit']) !=
                           ('Mexico','Export',code,'2024','H0','m³' if product=='pine' else 'Kg') for r in rows):
            raise ValueError('Wrong WITS reporter/flow/commodity/year/unit')
        if len({r['Partner'] for r in rows})!=len(rows) or sum(r['Partner']=='World' for r in rows)!=1:
            raise ValueError('Duplicate or missing World/partner')
        for row in rows:
            formatted=f"{int(row['Quantity']):,}"
            partner=re.escape(row['Partner']); value=re.escape(formatted); unit=re.escape(row['Unit'])
            if product in ('corn','cotton'):
                found=re.search(partner+r'\s+'+value+r'\s+'+unit,observed)
            elif product=='coffee':
                found=re.search(r'\|\s*'+partner+r'\s*\|[^|]+\|\s*'+value+r'\s*\|\s*'+unit,observed)
            else:
                found=re.search(r'2024\s*'+partner+r'\s*[\d,]+\.\d{2}\s+'+value+r'\s+'+unit,observed)
            if not found:
                raise ValueError('WITS numerical transcription disagrees with observed public table: '+row['Partner'])
        divisor=Decimal(1 if product=='pine' else 1000)
        values={r['Partner']:Decimal(r['Quantity'])/divisor for r in rows}
        if any(v<0 or not v.is_finite() for v in values.values()) or values['World']<=0:
            raise ValueError('Invalid WITS quantity')
        partners=[dict(name=NAMES[r['Partner']],originalName=r['Partner'],value=float(values[r['Partner']]),rawValue=r['Quantity'])
                  for r in rows if r['Partner']!='World']
        total=sum((values[p['originalName']] for p in partners),Decimal(0)); gap=total-values['World']
        # Published public tables round totals and partner cells. Differences are
        # retained separately; neither an extra country nor consumption is made.
        tolerance=Decimal('0.1') if product!='pine' else Decimal('0.5')
        if abs(gap)>tolerance:
            raise ValueError('Unexplained partner/World difference')
        references.append(dict(
            productId=product,year=2024,periodType='calendar-year',classification='H0',hsCode=code,label=label,
            reporter='MEX',tradeFlow='gross-exports',unit='m³' if product=='pine' else 't',
            sourceUnit='m³' if product=='pine' else 'Kg',conversionDivisor=int(divisor),
            worldExports=float(values['World']),worldExportsRawValue=next(r['Quantity'] for r in rows if r['Partner']=='World'),
            partnerTotal=float(total),partnerRoundingGap=float(gap),roundingTolerance=float(tolerance),
            partners=partners,scope='national-cross-border',includedPartners='All returned partners outside Mexico, including US and Canada',
            balanceCompatible=False,explanation=explanation,
            source=dict(url=f'https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/{code}',
                        path=csv_path,sha256=HASHES[csv_path],observedTextPath=text_path,observedTextSha256=HASHES[text_path],
                        retrievedOn='2026-10-16',retrievalMode='Official public table via web; numerical transcription, not raw HTML'),
        ))
    return dict(schemaVersion=1,balances=balances,tradeReferences=references,
                method='Mexico-only. Same-table national balances; separate calendar-year HS public-table references. No domestic consumption inferred from production minus exports.',
                sources=[dict(path=p,sha256=h) for p,h in HASHES.items()])


if __name__=='__main__':
    output=ROOT/'src/data/atlas/mexico/agro-statistics-20261016.json'
    output.write_text(json.dumps(build(),ensure_ascii=False,indent=2)+'\n')
    print(output.relative_to(ROOT))
