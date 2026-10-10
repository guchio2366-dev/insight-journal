/** Source-backed *examples*, never a complete or harmonised Europe religion surface. */
export type EuropeReligionEvidence = {
  id: string;
  name: string;
  country: string;
  coordinates: [number, number];
  coordinateMeaning: string;
  source: string;
  license: string;
  licenseUrl: string;
  year: number;
  universe: string;
  question: string;
  denominator: number;
  measures: { label: string; count: number; color: string; sourceCategory: string }[];
  limitation: string;
};

const czSource = 'https://scitani.gov.cz/nabozenska-vira';
const rsSource = 'https://popis2022.stat.gov.rs/en-us/5-vestisaopstenja/news-events/20230616-st/?a=0&s=0';
const eeSource = 'https://andmed.stat.ee/en/stat/RL21452';
const czLicense = 'https://scitani.gov.cz/podminky-uzivani-dat';
const rsLicense = 'https://www.stat.gov.rs/en-us/copyright/';
const eeLicense = 'https://creativecommons.org/licenses/by-sa/4.0/';
const anchor = '行政区域を塗る形状ではなく、同名地域を探すための概略地点';

export const europeReligionRegionalEvidence: readonly EuropeReligionEvidence[] = [
  { id:'religion-usti',name:'Ústecký県',country:'CZE',coordinates:[14.03,50.66],coordinateMeaning:anchor,source:czSource,license:'CZSOの出典明示条件',licenseUrl:czLicense,year:2021,universe:'全年齢の通常居住人口',question:'任意回答の宗教的信念',denominator:789098,measures:[{label:'無宗教',count:462065,color:'#8c7483',sourceCategory:'Bez náboženské víry'}],limitation:'県の原表値。回答者だけを分母にした全国公表割合と混同しません。'},
  { id:'religion-zlin',name:'Zlínský県',country:'CZE',coordinates:[17.67,49.23],coordinateMeaning:anchor,source:czSource,license:'CZSOの出典明示条件',licenseUrl:czLicense,year:2021,universe:'全年齢の通常居住人口',question:'任意回答の宗教的信念',denominator:564331,measures:[{label:'無宗教',count:182575,color:'#8c7483',sourceCategory:'Bez náboženské víry'}],limitation:'同じ国勢調査内のÚstecký県との地域差です。'},
  { id:'religion-subotica',name:'Subotica',country:'SRB',coordinates:[19.67,46.10],coordinateMeaning:anchor,source:rsSource,license:'SORSの出典明示・加工表示条件',licenseUrl:rsLicense,year:2022,universe:'国勢調査人口・全年齢',question:'自己申告の宗教',denominator:123952,measures:[{label:'カトリック',count:59748,color:'#ba8c53',sourceCategory:'Catholic'},{label:'正教会',count:37674,color:'#7296ae',sourceCategory:'Orthodox'}],limitation:'同じ自治体で2分類が併存します。最多分類だけの塗り分けは用いません。'},
  { id:'religion-novi-pazar',name:'Novi Pazar',country:'SRB',coordinates:[20.52,43.14],coordinateMeaning:anchor,source:rsSource,license:'SORSの出典明示・加工表示条件',licenseUrl:rsLicense,year:2022,universe:'国勢調査人口・全年齢',question:'自己申告の宗教',denominator:106720,measures:[{label:'イスラム教',count:88493,color:'#608d75',sourceCategory:'Islam'}],limitation:'Kosovoは2022年国勢調査を実施しておらず、この値から補いません。'},
  { id:'religion-narva',name:'Narva',country:'EST',coordinates:[28.19,59.38],coordinateMeaning:anchor,source:eeSource,license:'CC BY-SA 4.0・Statistics Estonia',licenseUrl:eeLicense,year:2021,universe:'15歳以上の標本調査推計',question:'宗教的な所属意識',denominator:46850,measures:[{label:'正教会',count:26590,color:'#7296ae',sourceCategory:'Orthodox'}],limitation:'推計の概数です。2021年12月31日基準で、国勢調査の全年齢人口とは揃いません。'},
  { id:'religion-saare',name:'Saare県',country:'EST',coordinates:[22.5,58.4],coordinateMeaning:anchor,source:eeSource,license:'CC BY-SA 4.0・Statistics Estonia',licenseUrl:eeLicense,year:2021,universe:'15歳以上の標本調査推計',question:'宗教的な所属意識',denominator:26550,measures:[{label:'宗教的所属なし',count:18020,color:'#a8809a',sourceCategory:'No religious affiliation'}],limitation:'「所属なし」はCzechiaの「無宗教」と同じ設問ではありません。'},
  { id:'religion-peipsiaare',name:'Peipsiääre',country:'EST',coordinates:[27.18,58.52],coordinateMeaning:anchor,source:eeSource,license:'CC BY-SA 4.0・Statistics Estonia',licenseUrl:eeLicense,year:2021,universe:'15歳以上の標本調査推計',question:'宗教的な所属意識',denominator:4420,measures:[{label:'古儀式派',count:410,color:'#5a7d84',sourceCategory:'Old Believer'}],limitation:'小地域の少数宗派の例です。原表の点「.」は精度不足で非公表とし、0へ変換しません。'},
];

export const religionEvidenceShare = (count:number,denominator:number):number => count/denominator*100;
