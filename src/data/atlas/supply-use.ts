import { supplyUseGenerated } from './supply-use-generated.ts';
export const supplyUseSource = supplyUseGenerated.source;
export type SupplyUseCropId = keyof typeof supplyUseGenerated.crops;
export type SupplyUseSegment = { id:string; label:string; value:number; role:string; definition:string };
const common: Record<string,[string,string]> = {
  feed:['飼料等','飼料向けと統計上の残差。厳密な飼料消費量ではありません。'],
  ethanol:['エタノール工場向け','エタノールと副産物を生む工場への原料投入。副産物の飼料利用をもう一度足しません。'],
  'other-fsi':['その他食品・種子・工業','食品・種子・工業用6,815から、内数のエタノール工場向け5,436を控除。'],
  crush:['搾油・加工','丸大豆の加工投入量。そこから生じる油と粕は別に加算しません。'],
  seed:['種子','播種に使う種子。'], residual:['統計上の残差','原表のResidual。推定した食用や飼料へ振り替えません。'],
  food:['食用','製粉等へ向かう小麦。小麦粉換算で貿易される分を含む原表の小麦基準。'],
  mill:['国内紡績等','綿繊維の国内利用。綿実・衣料品の重量を混ぜません。'],
  domestic:['国内利用等','国内利用と残差。食用・加工・飼料等の細分はこの表では分けられません。'],
};
const copy:Record<SupplyUseCropId,{name:string;unit:string;basis:string;start:string;end:string;takeaway:string;processing:string;importNote:string;importSource?:string}>= {
  corn:{name:'とうもろこし',unit:'百万ブッシェル',basis:'穀粒とうもろこし',start:'2024-09-01',end:'2025-08-31',
    takeaway:'供給の約3分の1ずつが飼料等とエタノール工場へ。輸出は約17%です。',
    processing:'エタノール工場では燃料とともに蒸留かすなどの飼料副産物が生じます。この棒は最初の原料投入先で分け、加工後に飼料へ戻る量は重ねて足していません。',
    importNote:'輸入もありますが、この年度は総供給の1%未満です。この需給表は輸入品の最終用途や品種を分けていないため、輸入分を飼料・食用へ配分することはできません。'},
  soybean:{name:'大豆',unit:'百万ブッシェル',basis:'丸大豆（油・粕の重量は含めない）',start:'2024-09-01',end:'2025-08-31',
    takeaway:'約52%が国内の搾油・加工へ、約40%が丸大豆として輸出されます。',
    processing:'搾油すると、大豆油とたんぱく質を多く含む大豆粕が同時に得られます。油は食品や燃料、粕は飼料に使われます。加工後の油・粕の輸出は、丸大豆の輸出と別の段階です。',
    importNote:'輸入は総供給の1%未満です。国内生産が大きくても輸入と輸出は併存しますが、この表だけでは輸入品の品質・最終用途や調達理由までは分かりません。'},
  wheat:{name:'小麦',unit:'百万ブッシェル',basis:'小麦（貿易の小麦粉等は原表の小麦換算）',start:'2024-06-01',end:'2025-05-31',
    takeaway:'食用が約34%、輸出が約29%。約30%は次の年度へ持ち越す在庫です。',
    processing:'パン、麺、菓子などでは必要なたんぱく質や硬さが異なります。食用の小麦は製粉に進み、飼料等は約4%。生産の大部分を家畜が食べるわけではありません。',
    importNote:'輸入は総供給の約5%。小麦粒の輸入は主にカナダからで、統計にはパスタなどの製品輸入も小麦換算で含まれます。品種ごとにパン・麺などへの適性が異なるため、収穫量だけで必要な種類や製品の調達は説明できません。輸入分の用途別比率は示していません。',importSource:'https://www.ers.usda.gov/topics/crops/wheat/wheat-sector-at-a-glance'},
  cotton:{name:'綿花',unit:'百万480ポンド俵',basis:'綿繊維（アップランド綿と超長繊維綿）',start:'2024-08-01',end:'2025-07-31',
    takeaway:'約68%が原綿として輸出され、国内紡績等は約10%。国外での加工との結びつきが大きい作物です。',
    processing:'綿繊維は糸・生地・衣料へ加工されます。綿実は油や飼料になりますが、この原綿の収支には含めません。衣料品の輸入も別の製品段階です。',
    importNote:'原綿輸入の公表値は0.00百万俵で、丸め前まで厳密なゼロとは断定できません。衣料品の輸入を、この原綿輸入の量と同一視しないでください。'},
  rice:{name:'米',unit:'百万cwt（1 cwt＝100ポンド）',basis:'籾米換算（籾米と精米の全区分を同一基準）',start:'2024-08-01',end:'2025-07-31',
    takeaway:'国内利用等が約54%、輸出が約29%。輸入も総供給の約16%を占めます。',
    processing:'籾米から籾殻を外すと玄米、さらにぬか層を除くと精米になります。輸出には籾米と精米の両方があるため、この図はUSDA原表どおり全量を籾米の重さへそろえています。',
    importNote:'輸入米にはタイのジャスミン米、インド・パキスタンのバスマティ米などの香り米が多く含まれます。米国産と種類・食べ方の需要が異なることが、輸出と輸入の併存を理解する手掛かりです。',importSource:'https://www.ers.usda.gov/topics/crops/rice/rice-sector-at-a-glance'},
};

export function supplyUsePercent(value:number,total:number){return total>0&&Number.isFinite(value)?value/total*100:null;}
export function formatShare(value:number,total:number){const p=supplyUsePercent(value,total);return p===null?'—':p>0&&p<1?'1%未満':`${Math.round(p)}%`;}
export function cropSupplyUse(id:SupplyUseCropId){
  const raw=supplyUseGenerated.crops[id];
  const segment=(id:string,label:string,value:number,role:string,definition:string):SupplyUseSegment=>({id,label,value,role,definition});
  const supply=[segment('production','国内生産',raw.production,'production','当販売年度の国内生産。'),segment('imports','輸入',raw.imports,'import','同じ販売年度・品目基準での輸入。'),segment('beginning','期首在庫',raw.beginningStocks,'stock','前の年度から持ち越した在庫。')];
  const domestic=Object.entries(raw.domestic).map(([key,value],index)=>segment(key,common[key][0],value,`domestic-${index}`,common[key][1]));
  const destinations=[...domestic,segment('exports','輸出',raw.exports,'export','当販売年度の輸出。国産収穫物だけを追跡した量ではありません。'),segment('ending','期末在庫',raw.endingStocks,'stock','翌年度へ持ち越す在庫。食用・廃棄と同じではありません。')];
  return {id,...copy[id],...raw,supply,destinations,marketingYear:'2024/25',countryCode:'US'};
}
