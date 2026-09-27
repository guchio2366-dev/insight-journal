import {socialDefault,socialValue,type SocialRegion,type SocialGroup,type SocialRecord} from './asia-social.ts';
export const areaGroups=['jp-nationality','my-ethnicity','in-language','in-religion'];
export function socialEntry(group:string){return areaGroups.includes(group)?group+'-overview':socialDefault(group);}
export function withSocialOverviews(region:SocialRegion):SocialRegion{return {...region,topics:[...region.topics,...region.groups.filter(g=>areaGroups.includes(g.id)).map(g=>({id:g.id+'-overview',group:g.id,key:'overview',title:'区域ごとの構成をまとめて見る',breaks:[]}))]};}
export type AreaCategory={id:string;title:string;color:string;value:number};
const palette=['#daaf62','#679a9b','#a387b1','#b88571','#92a565','#6e91b7','#ba8eaa','#b2a66b','#6eada0','#a99b87','#809775','#b498bf','#bf9364','#809bad','#b3ad85','#969db9','#a77883','#76a5b0','#bcaa96','#96b38e'];
const leadingLanguages=['001000','002000','005000','006000','007000','008000','009000','011000','012000','013000','014000','015000','016000','020000','021000','055000','066000','082000','094000'];
const religionColors:Record<string,string>={hindu:'#d5ab66',muslim:'#62a3a0',christian:'#9a87b4',sikh:'#c77c65',buddhist:'#91a65b',jain:'#6589b3',other:'#b6a291',unstated:'#d2ceca'};
const ethnicColors:Record<string,string>={bumi_malay:'#dcba75',bumi_other:'#789eaa',chinese:'#ab86a9',indian:'#83a475',other_citizen:'#b5a18b'};
const nationalityNames=['中国','韓国，朝鮮','ベトナム','フィリピン','ブラジル','ネパール','インド','インドネシア','アメリカ','ペルー','タイ','その他'];
export function areaCategories(region:SocialRegion,g:SocialGroup){
 if(g.id==='jp-nationality')return nationalityNames.map((title,i)=>({id:'nationality-'+i,title,color:palette[i]}));
 return region.topics.filter(t=>t.group===g.id&&t.key!=='overview').map((t,i)=>({id:t.id,title:t.title,color:g.id==='in-religion'?religionColors[t.key]:g.id==='my-ethnicity'?ethnicColors[t.key]:palette[(leadingLanguages.includes(t.key)?leadingLanguages.indexOf(t.key):i)%palette.length]}));
}
export function areaValues(record:SocialRecord,region:SocialRegion,g:SocialGroup):AreaCategory[]{
 if(g.id==='jp-nationality'){
  const total=record.nationalities?.reduce((sum,n)=>sum+n.value,0)??0;if(!total)return [];
  return areaCategories(region,g).map(c=>({...c,value:(record.nationalities??[]).filter(n=>c.title==='その他'?!nationalityNames.slice(0,-1).includes(n.label):n.label===c.title).reduce((sum,n)=>sum+n.value,0)/total*100}));
 }
 return areaCategories(region,g).flatMap(c=>{const value=socialValue(record,region.topics.find(t=>t.id===c.id)!,g);return value===null?[]:[{...c,value}];});
}
export function leadingCategory(record:SocialRecord,region:SocialRegion,g:SocialGroup){
 const values=areaValues(record,region,g).sort((a,b)=>b.value-a.value);
 if(!values.length||values[0].value<=0||values.length>1&&Math.abs(values[0].value-values[1].value)<1e-9)return null;
 return values[0];
}
export const areaReadings:Record<string,{title:string;lead:string;note:string;places:string[]}>={
 'in-religion':{title:'宗教の構成は、州によって異なる',lead:'2011年には多くの州でヒンドゥー教が最多ですが、パンジャーブ州ではシク教、旧ジャンムー・カシミール州ではイスラム教、北東部のナガランド州などではキリスト教が最多です。',note:'「最多」は50％以上とは限りません。たとえばアルナーチャル・プラデーシュ州のキリスト教は約30％です。色は州全体の最多区分を示し、宗教が一つに分かれた居住域を示すものではありません。',places:['s-IN-03','s-IN-01','s-IN-13','s-IN-12']},
 'in-language':{title:'北・中部のヒンディー語と、南・東部の言語の違いを読む',lead:'2011年の母語の言語群では、北・中部の複数州でヒンディー語が最多です。南部ではタミル語・テルグ語・カンナダ語・マラヤーラム語、東部の西ベンガル州ではベンガル語が最多になります。',note:'母語は民族や宗教とは別の設問です。色は州ごとの最多の言語群を示します。ナガランド州の最多区分は約12％にとどまり、州の中にも多様な言語があります。',places:['s-IN-09','s-IN-19','s-IN-33','s-IN-32','s-IN-13']},
 'my-ethnicity':{title:'半島部とボルネオ島側で、市民の民族構成が変わる',lead:'2026年推計では、半島部の各州等でマレー人が最多です。ボルネオ島側のサバ州・サラワク州では、複数集団をまとめた「その他のブミプトラ」が最多です。ペナン州ではマレー人と中国系の割合が近接しています。',note:'分母はマレーシア市民です。非市民はこの民族区分に含めません。「その他のブミプトラ」は単一の民族名ではなく、公表資料の集合区分です。',places:['s-MY-12','s-MY-13','s-MY-07']},
 'jp-nationality':{title:'外国人住民の国籍構成には、都道府県ごとの差がある',lead:'2020年の外国人住民では、東京都は中国、愛知県・群馬県はブラジル、大阪府は「韓国，朝鮮」が最多の国籍区分です。外国人の割合の大小とは分けて読みます。',note:'分母は外国人住民の人数です。日本人を含む全人口の最多国籍や民族を表していません。表の小区分は「その他」にまとめ、無国籍・国名不詳もそこに含めています。',places:['s-JP-13','s-JP-23','s-JP-10','s-JP-27']},
};
