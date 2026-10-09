import { europeCultureCompositions } from '../../../lib/atlas-europe-culture-composition.ts';

export type ReligionNationalSegment = { id:string; label:string; share:number; count?:number; color:string };
export type ReligionNationalProfile = {
  id:string; name:string; country:string; coordinates:[number,number]; year:number;
  universe:string; question:string; denominator?:number; source:string; sourceName:string;
  license:string; licenseUrl:string; precision:string; note:string;
  segments:ReligionNationalSegment[]; caseId?:string;
};

// Equal-size bars describe the response mix of the stated national reporting
// unit. The anchor locates that unit; it is not a subnational observation.
export const europeReligionColors={catholic:'#b58b4f',orthodox:'#6388ad',protestant:'#76966d',christian:'#8399a1',believer:'#b299a5',islam:'#628e74',other:'#ae9c81',none:'#9b7696',unstated:'#c6c8c3',unknown:'#929a99'};
const colors=europeReligionColors;
const raw=europeCultureCompositions('religion');
const england=raw.find(item=>item.code==='E92000001')!;
const wales=raw.find(item=>item.code==='W92000004')!;
const croatia=raw.find(item=>item.code==='HRV')!;
const englandWalesDenominator=england.denominator+wales.denominator;
const ewSegments=england.segments.map(segment=>{
  const count=segment.count+wales.segments.find(item=>item.id===segment.id)!.count;
  const kind=segment.id;
  return {id:kind,label:segment.label,count,share:count/englandWalesDenominator*100,color:kind==='ts030-01'?colors.none:kind==='ts030-02'?colors.christian:kind==='ts030-06'?colors.islam:kind==='ts030-09'?colors.unstated:colors.other};
});
const hrColors:Record<string,string>={'hr-religion-H':colors.catholic,'hr-religion-J':colors.orthodox,'hr-religion-L':colors.protestant,'hr-religion-P':colors.islam,'hr-religion-Z':colors.none,'hr-religion-AB':colors.unstated,'hr-religion-AD':colors.unknown};
const countSegment=(id:string,label:string,count:number,denominator:number,color:string)=>({id,label,count,share:count/denominator*100,color});
const czDenominator=10524167,rsDenominator=6647003;

export const europeReligionNationalProfiles:readonly ReligionNationalProfile[]=[
  {
    id:'religion-national-england-wales',name:'英・ウェールズ',country:'GBR',coordinates:[-3.2,52.4],year:2021,
    universe:'イングランド・ウェールズの通常居住人口・全年齢',question:'宗教的帰属（信仰・実践の有無とは別）',denominator:englandWalesDenominator,
    source:england.sourceURL,sourceName:'ONS／Nomis：Census 2021 TS030',license:'Open Government Licence v3.0',licenseUrl:'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
    precision:'国勢調査の公表人数から計算',note:'イングランドとウェールズの公表全国行を同じ分類ごとに合算。キリスト教をプロテスタントと読み替えません。未回答を無宗教へ含めません。',
    segments:ewSegments,caseId:'england-wales-2021',
  },
  {
    id:'religion-national-czechia',name:'チェコ',country:'CZE',coordinates:[14.9,49.9],year:2021,
    universe:'通常居住人口・全年齢',question:'任意回答の宗教的信念',denominator:czDenominator,
    source:'https://scitani.gov.cz/religious-beliefs',sourceName:'CZSO：2021 Census, Religious belief',license:'CZSOの出典明示条件',licenseUrl:'https://scitani.gov.cz/podminky-uzivani-dat',
    precision:'国勢調査の公表人数から計算',note:'「無宗教」は全人口を分母に計算。回答者だけを分母にした68.3%とは異なります。カトリックは教会所属の内数として一度だけ計上。未回答30.1%を保存。',
    segments:[
      countSegment('catholic','ローマ・カトリック',741019,czDenominator,colors.catholic),
      countSegment('other-church','その他の教会所属',1374285-741019,czDenominator,colors.other),
      countSegment('believer-no-church','教会非所属の信者',960201,czDenominator,colors.believer),
      countSegment('no-belief','無宗教',5027141,czDenominator,colors.none),
      countSegment('not-stated','未回答',3162540,czDenominator,colors.unstated),
    ],
  },
  {
    id:'religion-national-croatia',name:'クロアチア',country:'HRV',coordinates:[16.2,45.2],year:2021,
    universe:'国勢調査人口・全年齢',question:'自己申告の宗教',denominator:croatia.denominator,
    source:croatia.sourceURL,sourceName:'Croatian Bureau of Statistics：2021 Census',license:'CBSの公表データ利用条件',licenseUrl:'https://dzs.gov.hr/en',
    precision:'国勢調査の公表人数から計算',note:'無宗教・無神論、不可知論・懐疑論、未申告、不明は元表の別分類のまま残します。',
    segments:croatia.segments.map(segment=>({id:segment.id,label:segment.label,count:segment.count,share:segment.share,color:hrColors[segment.id]??colors.other})),
    caseId:'croatia-national-2021',
  },
  {
    id:'religion-national-serbia',name:'セルビア',country:'SRB',coordinates:[20.8,44.1],year:2022,
    universe:'2022年国勢調査人口・全年齢。Kosovoを含む推計ではない',question:'自己申告の宗教',denominator:rsDenominator,
    source:'https://popis2022.stat.gov.rs/en-us/5-vestisaopstenja/news-events/20230616-st/?a=0&s=0',sourceName:'SORS：2022 Census, Population by religion',license:'SORSの出典明示・加工表示条件',licenseUrl:'https://www.stat.gov.rs/en-us/copyright/',
    precision:'国勢調査の公表人数から計算',note:'正教会・カトリック・イスラム教が同じ国にある。無宗教（無神論者）、不可知論、未申告、不明を合併しません。',
    segments:[
      countSegment('orthodox','正教会',5387426,rsDenominator,colors.orthodox),
      countSegment('catholic','カトリック',257269,rsDenominator,colors.catholic),
      countSegment('protestant','プロテスタント',54678,rsDenominator,colors.protestant),
      countSegment('other-christian','その他のキリスト教',59346,rsDenominator,colors.christian),
      countSegment('islam','イスラム教',278212,rsDenominator,colors.islam),
      countSegment('other-religion','その他の宗教',602+1207+500,rsDenominator,colors.other),
      countSegment('agnostic','不可知論',8654,rsDenominator,colors.other),
      countSegment('atheist','無宗教（無神論者）',74139,rsDenominator,colors.none),
      countSegment('undeclared','未申告',169486,rsDenominator,colors.unstated),
      countSegment('unknown','不明',355484,rsDenominator,colors.unknown),
    ],
  },
  {
    id:'religion-national-estonia',name:'エストニア',country:'EST',coordinates:[25.5,58.9],year:2021,
    universe:'15歳以上の人口の標本調査推計',question:'宗教的な所属意識（教会員・礼拝実践とは別）',
    source:'https://stat.ee/en/news/population-census-proportion-people-religious-affiliation-remains-stable-orthodox-christianity-still-most-widespread',sourceName:'Statistics Estonia：2021 Census religion survey',
    license:'CC BY-SA 4.0・Statistics Estonia',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
    precision:'統計機関が丸めて公表した割合。人数へ換算しない',note:'正教会16%、ルター派8%、その他の所属5%、所属なし58%、回答拒否13%。15歳以上の推計であり、全年齢の国勢調査人数と直接比較しません。',
    segments:[
      {id:'orthodox',label:'正教会',share:16,color:colors.orthodox},
      {id:'lutheran',label:'ルター派',share:8,color:colors.protestant},
      {id:'other-affiliation',label:'その他の宗教的所属',share:5,color:colors.other},
      {id:'no-affiliation',label:'宗教的所属なし',share:58,color:colors.none},
      {id:'unanswered',label:'回答拒否',share:13,color:colors.unstated},
    ],
  },
];

export const europeReligionNationalProfile=(id:string)=>europeReligionNationalProfiles.find(item=>item.id===id);
