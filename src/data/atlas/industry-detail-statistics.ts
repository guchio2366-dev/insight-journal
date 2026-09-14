import data from '../../../public/assets/atlas/industry-v1/detail-statistics.json' with {type:'json'};
import {industryStatRows,industryYears,sectorTotal,statValue,type IndustryStatRow} from './industry-statistics';
import {sectorLabel,type IndustrySector} from './industry-catalog';

export interface SeriesPoint {year:number;value:number|null}
export interface IndustrySeries {label:string;unit:string;scope:string;note:string;source:string;url:string;points:SeriesPoint[]}
export interface IndustryDistribution {title:string;scope:string;note:string;year:number;unit:string;total:number;rows:{id:string;name:string;value:number}[];source:string;url:string}
const manufacturingScopes:Record<string,string>={auto:'完成車製造（車体・部品を除く）',aerospace:'航空宇宙製品・部品',shipbuilding:'船舶・ボート製造',railway:'鉄道車両製造',electronics:'電子・電気機器',machinery:'機械製造',metals:'一次金属・金属製品',chemicals:'化学製品',food:'食品・飲料・たばこ','other-manufacturing':'繊維・衣服・木材・紙・印刷・石油製品・ゴム等・非金属鉱物・家具・雑製品・その他輸送機器'};
const extra:Record<string,IndustryStatRow>={
 'oil-gas':{id:'oil-gas',label:'石油・天然ガス採掘（採掘支援を除く）',naics:'211',gdpLines:[7],employmentLines:[8]},
 mining:{id:'mining',label:'鉱業（石油・天然ガス採掘以外）',naics:'212',gdpLines:[8],employmentLines:[9]},
};
const sourceUrl='https://www.census.gov/data/tables/2023/econ/aies/2023-aies-tables.html';
export function industryDetailSeries(sector:IndustrySector,subsector:string,statId?:string):{economic:IndustrySeries|null;employment:IndustrySeries|null;quantity:IndustrySeries|null}{
 const m=data.manufacturing[subsector as keyof typeof data.manufacturing];
 if(sector==='manufacturing'&&subsector!=='all'){
  if(!m)return {economic:null,employment:null,quantity:null};
  const scope=`${manufacturingScopes[subsector]} · NAICS2017 ${m.codes.join('・')} · 全米`;
  const shared={scope,source:'Census ASM・AIES',url:sourceUrl};
  return {
   economic:{...shared,label:'出荷額',unit:'10億米ドル',note:'名目値。2018〜21年はASMの改定値、2023年はAIES。調査変更の前後は線で結んでいません。',points:m.points.map(p=>({year:p.year,value:p.shipments===null?null:p.shipments/1e6}))},
   employment:{...shared,label:'製造業の雇用',unit:'千人',note:'Censusの対象雇用。2023年は3月12日を含む給与期間。右上のBEA年平均雇用とは定義が異なります。',points:m.points.map(p=>({year:p.year,value:p.employment===null?null:p.employment/1000}))},
   quantity:subsector==='auto'?{label:'国内生産台数',unit:'千台',scope:'乗用車・商用車（最終組立国基準）',note:'BTS公表資料。原資料はWards Intelligence。最新掲載の2021年までを表示。',source:'米運輸省BTS 表1-23',url:'https://www.bts.gov/content/world-motor-vehicle-production-selected-countries',points:data.autoQuantity}:null,
  };
 }
 const stat=statId?(extra[statId]??industryStatRows[sector].find(r=>r.id===statId)):undefined;
 if(subsector!=='all'&&!stat)return {economic:null,employment:null,quantity:null};
 const scope=`${stat?.label??sectorLabel(sector)} · 全米`;
 return {
  economic:{label:'名目付加価値',unit:'10億米ドル',scope,note:subsector==='tourism'?'娯楽・宿泊・飲食の全体。住民の利用を含み、観光需要だけの付加価値ではありません。':'価格変化を含む名目値。売上高・取引総額とは異なります。',source:'BEA GDP by Industry',url:'https://www.bea.gov/data/gdp/gdp-industry',points:industryYears.map(year=>({year,value:stat?statValue(stat,'gdp',year):sectorTotal(sector,'gdp',year)}))},
  employment:{label:'年平均雇用',unit:'千雇用',scope,note:'国内のフルタイム・パートタイム雇用。自営業は含みません。',source:'BEA NIPA 表6.4D',url:'https://www.bea.gov/itable/national-gdp-and-personal-income',points:industryYears.map(year=>({year,value:stat?statValue(stat,'employment',year):sectorTotal(sector,'employment',year)}))},quantity:null,
 };
}
const productScopes:Record<string,string>={auto:'乗用自動車等（HS8703）',aerospace:'航空機・宇宙機・部品（HS88）',shipbuilding:'船舶・ボート等（HS89）',railway:'鉄道車両・線路用機器等（HS86）',electronics:'電気機器等（HS85）',machinery:'機械類等（HS84、コンピューターを含む）',metals:'鉄鋼・鉄鋼製品（HS72・73）',chemicals:'医薬品（HS30）',food:'穀物・でん粉・乳等の調製品（HS19）','other-manufacturing':'家具・照明器具等（HS94）','oil-gas':'原油（HS2709）',mining:'鉱石・スラグ・灰（HS26）',utilities:'電力（HS2716）'};
const displayNames=new Intl.DisplayNames(['ja'],{type:'region'});
const countryNames:Record<string,string>={'China':'中国','United States':'米国','Japan':'日本','Germany':'ドイツ','India':'インド','South Korea':'韓国','Mexico':'メキシコ','Brazil':'ブラジル','Canada':'カナダ','Spain':'スペイン','France':'フランス','United Kingdom':'英国','Other Asia, nes':'その他アジア','Areas, nes':'地域未特定'};
export function industryExportDistribution(subsector:string):IndustryDistribution|null{
 const t=data.trade[subsector as keyof typeof data.trade];if(!t)return null;
 return {title:'主な関連製品の輸出先',scope:productScopes[subsector],note:'米国からの総輸出額（再輸出を含む）。製品分類は国内の産業分類と異なり、上の出荷額・付加価値と対象範囲は一致しません。',year:t.year,unit:'10億米ドル',total:t.total/1e9,
  rows:t.rows.map(r=>({id:r.id,name:countryNames[r.name]??(r.iso&&/^[A-Z]{2}$/.test(r.iso)?displayNames.of(r.iso):r.name)??r.name,value:r.value/1e9})),source:'UN Comtrade（米国報告）',url:data.sources[`comtrade-${t.codes[0]}.json` as keyof typeof data.sources].url};
}
export function industryWorldDistribution(subsector:string):IndustryDistribution|null{
 if(subsector!=='auto')return null;
 const w=data.autoWorld;
 return {title:'世界生産と米国シェア',scope:'乗用車・商用車の生産台数（最終組立国基準）',note:'BTS公表資料（原資料：Wards Intelligence）。世界総数を照合した2020年。2021年の公表世界総数は前年と同値のため、確認が取れるまで使用していません。',year:w.year,unit:'千台',total:w.total,rows:w.rows.map(r=>({...r,name:countryNames[r.name]??r.name})),source:'米運輸省BTS 表1-23',url:'https://www.bts.gov/content/world-motor-vehicle-production-selected-countries'};
}
export const industryAutoWorldTrend:IndustrySeries={label:'米国の世界シェアの推移',unit:'%',scope:'乗用車・商用車の生産台数',note:'同じ年の米国生産台数を世界総数で割った割合。',source:'米運輸省BTS 表1-23',url:'https://www.bts.gov/content/world-motor-vehicle-production-selected-countries',points:data.autoWorld.trend};
