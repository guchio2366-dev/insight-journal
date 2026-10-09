import type {AsiaField} from '../../../lib/atlas-asia-state.ts';
import type {AsiaFocusFieldReading} from '../asia-focus.ts';
import {getAsiaOverview} from '../asia-overview.ts';

// Reuse the existing sourced regional overview rather than a second manuscript.
export function southeastAsiaInitialReadings():Record<AsiaField,AsiaFocusFieldReading>{
 const {reading}=getAsiaOverview('southeast-asia');
 return Object.fromEntries(reading.readings.filter(r=>r.id!=='politics').map(r=>[r.id==='nature'?'natural':r.id,{
  title:r.title,
  takeaway:r.id==='population'?'ジャワ島、紅河・メコンの平野、マニラ湾やバンコク周辺に人口の濃い格子と大都市の集まりが見えます。':r.id==='industry'?'工業とサービスはジャワ島、タイ東部、ベトナムの南北などに集まり、港や交通路で地域内外の市場と結び付きます。':r.paragraphs[0],
  reading:r.id==='population'?'2020年の人口格子では、ジャワ島西部や大陸部の河川低地、マニラ湾周辺に人口が集中します。平野や水の利用可能性だけでなく、港を中心とした都市形成、工業・サービス業の集積と交通の接続も背景です。歴史的な都市化の説明を2020年の格子から直接証明することはできません。都市名と小さな黒丸は位置だけを示し、人口に比例しません。都市の輪郭と推計人口は右の一覧から選んで確認します。':r.id==='industry'?'2024年の製造業・サービス業の国別比率と、原料産地、加工・製造の集積地を異なる記号で読みます。ジャワ島、タイ東部、ベトナムの南北では、企業、人材、港・交通路と市場の接続が産業の立地に関わります。天然ゴムの栽培域とタイ東部のタイヤ工場、木材の供給とベトナム南部の家具加工は、原料と製品を同じ地点・単位として扱いません。国別の詳説はインドネシア・ベトナム・タイで読み、地域全体の分布をこの3国だけに限定しません。':r.paragraphs.join('\n'),
  source:r.id==='population'?{label:'世界銀行・インドネシアの都市化（2019年）',url:'https://www.worldbank.org/en/country/indonesia/publication/augment-connect-target-realizing-indonesias-urban-potential'}:r.sources[0],
 }])) as Record<AsiaField,AsiaFocusFieldReading>;
}
