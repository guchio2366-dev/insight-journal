import gdp from '../../../public/assets/atlas/industry-v1/bea-gdp.json' with {type:'json'};
import employment from '../../../public/assets/atlas/industry-v1/bea-employment.json' with {type:'json'};
import type {IndustrySector} from './industry-catalog';

export const industryYear=2024;
export const industryYears=gdp.years;
type Metric='gdp'|'employment';
export interface IndustryStatRow {id:string;label:string;gdpLines:number[];employmentLines:number[];naics:string;color?:string}
const row=(id:string,label:string,naics:string,gdpLines:number[],employmentLines:number[]):IndustryStatRow=>({id,label,naics,gdpLines,employmentLines});
const industryParentRows:IndustryStatRow[]=[
    row('agriculture','農林水産（畜産を含む）','11',[3],[4]),
    row('manufacturing','製造業','31–33',[12],[13]),
    row('resources','資源・エネルギー','21,22',[6,10],[7,11]),
    row('services','サービス業','42,44–45,48–49,51–52,54–56,61–62,71–72,81',[34,35,40,49,55,66,70,71,75,76,82,85,88],[35,38,43,52,57,65,69,70,73,74,79,82,85]),
    row('construction-real-estate','建設・不動産','23,53',[11,60],[12,62]),
    row('government','政府','government',[89],[86]),
  ];
const serviceRows:IndustryStatRow[]=[
    row('information','情報通信','51',[49],[52]),
    row('finance','金融・保険','52',[55],[57]),
    row('professional','専門・業務支援','54–56',[66,70,71],[65,69,70]),
    row('trade-logistics','商業・物流','42,44–45,48–49',[34,35,40],[35,38,43]),
    row('tourism','娯楽・宿泊・飲食','71–72',[82,85],[79,82]),
    row('health-education','医療・教育・福祉','61–62',[75,76],[73,74]),
    row('other-services','その他のサービス','81',[88],[85]),
  ];
export const industryStatRows:Record<IndustrySector,IndustryStatRow[]>={
  all:industryParentRows.flatMap(r=>r.id==='services'?serviceRows:[r]),
  services:serviceRows,
  manufacturing:[
    row('food','食品・飲料・たばこ','311–312',[26],[27]),
    row('wood-paper','木材・紙','321,322',[14,29],[15,30]),
    row('chemicals','石油・化学・ゴム等','324–326',[31,32,33],[32,33,34]),
    row('metals','金属','331–332',[16,17],[17,18]),
    row('machinery','機械','333',[18],[19]),
    row('electronics','電子・電気機器','334–335',[19,20],[20,21]),
    row('transport','輸送機器','336',[21,22],[22,23]),
    row('other-manufacturing','その他の製造業','313–316,323,327,337,339',[15,23,24,27,28,30],[16,24,25,28,29,31]),
  ],
  resources:[row('mining-all','鉱業・採掘支援','21',[6],[7]),row('utilities','電力・ガス・水道','22',[10],[11])],
  'construction-real-estate':[row('construction','建設','23',[11],[12]),row('real-estate','不動産・賃貸','53',[60],[62])],
};
export function sourceValue(metric:Metric,line:number,year=industryYear){
  const source=metric==='gdp'?gdp:employment,index=source.years.indexOf(year),r=source.rows.find(r=>Number(r[0])===line);
  const raw=r?.[index+2];if(index<0||!raw||!/^[-\d,.]+$/.test(raw))throw new Error(`Missing BEA ${metric} line ${line} year ${year}`);
  return Number(raw.replaceAll(',',''));
}
export function statValue(row:IndustryStatRow,metric:Metric,year=industryYear){return row[metric==='gdp'?'gdpLines':'employmentLines'].reduce((sum,line)=>sum+sourceValue(metric,line,year),0);}
export function sectorTotal(sector:IndustrySector,metric:Metric,year=industryYear){
  if(sector==='all')return sourceValue(metric,metric==='gdp'?1:2,year);
  return statValue(industryParentRows.find(r=>r.id===sector)!,metric,year);
}
export function nationalSectorShare(sector:IndustrySector,metric:Metric){return 100*sectorTotal(sector,metric)/sectorTotal('all',metric);}
export function chartRows(sector:IndustrySector,metric:Metric){return industryStatRows[sector].map(r=>({...r,value:statValue(r,metric),share:100*statValue(r,metric)/sectorTotal(sector,metric)}));}
export const industryMetricNote='2024年・全米。雇用は国内産業のフルタイム・パートタイム、年平均。自営業を含まない。';
export {gdp as industryGdpSource,employment as industryEmploymentSource};
