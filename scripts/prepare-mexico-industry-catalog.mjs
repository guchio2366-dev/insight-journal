import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {parseCsv, decodeOfficialValue} from './prepare-mexico-industry.mjs';

const INPUT='data-source/atlas/mexico/industry';
const OUTPUT='src/data/atlas/mexico/industry-catalog.json';
const ASSETS='public/assets/atlas/mexico-industry-v1';
export const INDUSTRY_CODES=['211','212','311','312','313','314','315','316','321','322','323','324','325','326','327','331','332','333','334','335','336','337','339'];
const DEFINITIONS=[
 {id:'oil-gas',sector:'resources',subsector:'oil-gas',name:'石油・天然ガス',longName:'石油・天然ガスの採掘',sourceCodes:['211'],heading:'採掘する地域を読む',text:'石油・天然ガスを採掘した財の輸出額を州で比べます。製油所の加工品や発電は含みません。'},
 {id:'mining',sector:'resources',subsector:'mining',name:'鉱業',longName:'金属・非金属鉱物の採掘（石油・ガスを除く）',sourceCodes:['212'],heading:'鉱床と輸送条件を合わせて読む',text:'金属・非金属鉱物を採掘した財の輸出額です。製錬・金属加工とは工程を分けて読みます。'},
 {id:'food',sector:'manufacturing',subsector:'food',name:'食品加工',longName:'食品工業（飲料・たばこを除く）',sourceCodes:['311'],heading:'農水産物と加工・配送をつなぐ',text:'食品を加工した財の輸出額を比べます。農産物の収穫量や飲料・たばこの輸出額ではありません。'},
 {id:'chemicals',sector:'manufacturing',subsector:'chemicals',name:'化学',longName:'化学工業',sourceCodes:['325'],heading:'原料・工程・市場を分けて読む',text:'化学工業の財の輸出額です。石油の採掘・石油製品・プラスチック製品の別業種とは区別します。'},
 {id:'metals',sector:'manufacturing',subsector:'metals',name:'金属',longName:'一次金属・金属製品（331＋332）',sourceCodes:['331','332'],heading:'採掘から金属をつくる工程へ',text:'一次金属と金属製品の二業種を、両方の金額が公開された州だけ合計します。鉱山の採掘額とは異なります。'},
 {id:'machinery',sector:'manufacturing',subsector:'machinery',name:'機械',longName:'機械・設備の製造',sourceCodes:['333'],heading:'設備をつくる地域を読む',text:'機械・設備を製造した財の輸出額です。輸送機器や電子機器・電気機器は別の業種です。'}
];
export const sectorReadings={
  "resources": {
    "lead": "採掘の地域と、加工・輸送・市場をつないで読む。",
    "heading": "ソノラの銅とサカテカスの銀",
    "text": "北西部のソノラでは銅、内陸のサカテカスでは銀の生産を地域例として読みます。採掘地点に加え、加工・電力・水・輸送・市場という条件を順に考えます。",
    "sourceURL": "https://www.sgm.gob.mx/productos/pdf/Anuario_2024_Edicion_2025.pdf",
    "sourceYear": "2024年暫定値／2025年版",
    "places": [
      {
        "state": "26",
        "name": "ソノラ",
        "text": "銅の生産を読む州の例。鉱山の位置を示す点ではありません。"
      },
      {
        "state": "32",
        "name": "サカテカス",
        "text": "銀の生産を読む州の例。製錬所の位置を示す点ではありません。"
      }
    ]
  },
  "services": {
    "lead": "都市の企業・住民と観光客では、需要を支える条件が違う。",
    "heading": "都市のサービスと観光地のサービス",
    "text": "メキシコ市の金融・専門サービスと、キンタナ・ローの宿泊・飲食を比べます。企業・住民・観光客の需要と、それを支える交通や働き手を考えます。",
    "sourceURL": "https://www.inegi.org.mx/contenidos/programas/ce/2024/doc/mqroo_ce24.pdf",
    "sourceYear": "2023年の経済活動／Censos Económicos 2024確報",
    "places": [
      {
        "state": "09",
        "name": "メキシコ市",
        "text": "金融・専門サービスを読む都市の例。州別サービス総額の分布は収録していません。",
        "sourceURL": "https://www.inegi.org.mx/contenidos/programas/ce/2024/doc/mcdmx_ce24.pdf"
      },
      {
        "state": "23",
        "name": "キンタナ・ロー",
        "text": "宿泊・飲食を読む州の例。観光施設の位置を示す点ではありません。"
      }
    ]
  },
  "construction-real-estate": {
    "lead": "人口の分布を、住宅・施設の需要を考える背景として読む。",
    "heading": "建てる活動と、貸す・仲介する活動",
    "text": "メキシコ市とメヒコ州の2020年人口分布を、住宅・交通施設・事業所の需要を考える背景として読みます。建設は建物や土木工事をつくる活動、不動産は賃貸・仲介・管理です。人口図から建設額や住宅価格は分かりません。",
    "sourceURL": "https://www.inegi.org.mx/contenidos/app/scian/estructura2023.pdf",
    "sourceYear": "SCIAN México 2023／人口背景は2020年",
    "places": [
      {
        "state": "09",
        "name": "メキシコ市",
        "text": "人口密度を需要の背景として比較します。建設工事の分布ではありません。"
      },
      {
        "state": "15",
        "name": "メヒコ州",
        "text": "人口規模を需要の背景として比較します。住宅価格の分布ではありません。"
      }
    ]
  }
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const quote=value=>/[",\r\n]/.test(value)?'"'+value.replaceAll('"','""')+'"':value;
export function combineOfficialValues(values){
 if(!values.length)throw Error('Cannot aggregate no components');
 if(values.length===1)return {...values[0]};
 const missing=values.filter(v=>v.value===null);
 const sourceStatus=values.map(v=>v.sourceStatus).join(' + ');
 const publications=[...new Set(values.map(v=>v.publicationStatus))];
 if(publications.length!==1)throw Error('Cannot mix publication statuses');
 if(missing.length){
  const status=missing.some(v=>v.status==='confidential')?'confidential':missing.some(v=>v.status==='unknown')?'unknown':missing.some(v=>v.status==='notSignificant')?'notSignificant':'notApplicable';
  return {value:null,sourceValue:null,sourceStatus,publicationStatus:publications[0],status};
 }
 const sourceValue=values.reduce((sum,v)=>sum+v.sourceValue,0);
 return {value:sourceValue/1_000_000,sourceValue,sourceStatus,publicationStatus:publications[0],status:sourceValue===0?'zero':'available'};
}
export function buildCatalog(records,legacy){
 const selected=records.filter(r=>r.ANIO==='2025'&&INDUSTRY_CODES.includes(r.CODIGO_SCIAN));
 if(selected.length!==736||new Set(selected.map(r=>r.CVE_ENT+'/'+r.CODIGO_SCIAN)).size!==736)throw Error('Expected 736 unique industry state/subsector rows');
 const all2025=records.filter(r=>r.ANIO==='2025');
 if(all2025.length!==864)throw Error('Unexpected 2025 source extent');
 const states=Array.from({length:32},(_,i)=>String(i+1).padStart(2,'0'));
 const lookup=new Map(selected.map(r=>{
  if(r.COBERTURA!=='Estatal'||!states.includes(r.CVE_ENT)||r.ESTATUS!=='Cifras Preliminares.')throw Error('Unexpected source scope or release status');
  return [r.CVE_ENT+'/'+r.CODIGO_SCIAN,r];
 }));
 const get=(state,code)=>{const raw=lookup.get(state+'/'+code);if(!raw)throw Error('Missing '+state+'/'+code);return decodeOfficialValue(raw);};
 let fixedValuesVerified=0;
 for(const row of legacy.rows)for(const [id,code] of [['transport','336'],['electronics','334']]){
  if(JSON.stringify(get(row.id,code))!==JSON.stringify(row.values[id]))throw Error('Existing metric differs '+row.id+'/'+id);
  fixedValuesVerified++;
 }
 if(fixedValuesVerified!==64)throw Error('Expected 64 unchanged legacy values');
 const rows=states.map(id=>({id,values:Object.fromEntries(DEFINITIONS.map(m=>[m.id,combineOfficialValues(m.sourceCodes.map(code=>get(id,code)))]))}));
 const metrics=DEFINITIONS.map(({heading,text,...m})=>({...m,scope:'2025年暫定・生産地へ配分した財の輸出額（FOB）。業種全体の生産額・GDP・雇用・サービス輸出ではありません。',reading:{heading,text,note:m.sourceCodes.length>1?'各原業種が公開値の場合のみ合計。秘匿・不明を0に置き換えません。':'秘匿・不明は輸出なし（0）と区別します。'},topStates:rows.filter(r=>r.values[m.id].value>0).sort((a,b)=>b.values[m.id].value-a.values[m.id].value||a.id.localeCompare(b.id)).slice(0,3).map(r=>r.id)}));
 const source={...legacy.source,classification:'SCIAN México 2018; source subsector codes retained. Bundled dictionary/catalog VERSION is 2007.',sourceUnit:'thousands USD FOB',displayUnit:'billions USD FOB'};
 return {data:{schemaVersion:1,year:2025,sourceUnit:source.sourceUnit,displayUnit:source.displayUnit,conversionDivisor:1_000_000,source,metrics,rows,sectorReadings,notes:{...legacy.notes,coverage:'追加6指標。商業・サービス・建設の量は未収録。産業CSVは211・212と製造業21コードを保持。000と農林漁業コードは除外。',topStates:'金額が公開されている州内での上位例。秘匿・不明を含む全国順位・全国シェアではありません。',aggregation:'331＋332の両方が公開値の場合のみ金額を合計。一方が秘匿なら合計は秘匿、秘匿がなく不明なら合計は不明。各原状態は抽出CSVに保持。',sectorReadings:'公式資料に基づく地域例と学習上の問い。施設位置や州別サービス・建設額の分布ではありません。'}},selected,fixedValuesVerified};
}
export async function prepareMexicoIndustryCatalog(){
 const original=await readFile(INPUT+'/etef-official-annual-2007-2025.csv');
 const legacyBytes=await readFile('src/data/atlas/mexico/industry.json');
 const legacy=JSON.parse(legacyBytes);
 const existingManifest=JSON.parse(await readFile(INPUT+'/provenance.json','utf8'));
 const originalIdentity=existingManifest.sourceFiles.find(f=>f.file==='etef-official-annual-2007-2025.csv');
 if(original.length!==originalIdentity.bytes||sha(original)!==originalIdentity.sha256)throw Error('Original source checksum differs');
 const metadata=await readFile(INPUT+'/official-metadata.txt','utf8');
 if(!/license:\s*https:\/\/www\.inegi\.org\.mx\/inegi\/terminos\.html/.test(metadata))throw Error('Source licence declaration absent');
 const {data,selected,fixedValuesVerified}=buildCatalog(parseCsv(original.toString('utf8')),legacy);
 const headers=['PROD_EST','COBERTURA','ANIO','CVE_ENT','CODIGO_SCIAN','VAL_USD','ESTATUS_CIFRA','ESTATUS'];
 const csv=headers.join(',')+'\n'+selected.map(r=>headers.map(k=>quote(r[k])).join(',')).join('\n')+'\n';
 const normalized=JSON.stringify(data,null,2)+'\n';
 await mkdir(ASSETS,{recursive:true});
 await writeFile(OUTPUT,normalized);
 await writeFile(ASSETS+'/industry-catalog-2025.csv',csv);
 const counts=Object.fromEntries(data.metrics.map(m=>[m.id,Object.fromEntries(['available','zero','confidential','unknown','notSignificant','notApplicable'].map(status=>[status,data.rows.filter(r=>r.values[m.id].status===status).length]))]));
 const manifest={schemaVersion:1,year:2025,source:data.source,input:originalIdentity,legacy:{file:'src/data/atlas/mexico/industry.json',bytes:legacyBytes.length,sha256:sha(legacyBytes),fixedValuesVerified},normalized:{file:'src/data/atlas/mexico/industry-catalog.json',bytes:Buffer.byteLength(normalized),sha256:sha(normalized)},extract:{file:ASSETS+'/industry-catalog-2025.csv',bytes:Buffer.byteLength(csv),sha256:sha(csv),records:736,sourceCodes:INDUSTRY_CODES},metrics:data.metrics.map(m=>({id:m.id,sourceCodes:m.sourceCodes})),statusCounts:counts,notes:data.notes};
 await writeFile(ASSETS+'/catalog-manifest.json',JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({metrics:data.metrics.length,rows:data.rows.length,rawIndustryRows:736,fixedValuesVerified,statusCounts:counts}));
 return data;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await prepareMexicoIndustryCatalog();
