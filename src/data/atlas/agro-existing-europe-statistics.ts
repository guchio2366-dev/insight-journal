import wood from './europe/europe_wood_key_comparisons_2024.json';

export type EuropeForestryReferenceRow = {
  id:string; label:string; value:number|null; flag:string|null;
  role:'production'|'imports'|'exports'|'derived-supply'|'derived-apparent-consumption'|'stocks'|'total'|'component';
};
export type EuropeForestryReference = {
  id:string; kind:'balance'|'removals'|'industrial-input'|'market-shares';
  countryCode:string; countryName:string; year:number;
  productCode:string; productLabel:string; selectedSeriesId:string;
  selectionRelation:'same-product'|'subset-of-selected'|'broader-product-reference'|'different-stage-reference';
  unit:'THS_M3'|'THS_M3_UNDER_BARK'|'THS_M3_SOLID_OVER_BARK'|'percent';
  barkBasis:'under-bark'|'over-bark'|'not-stated'|'not-applicable';
  scope:string;
  source:{dataset:string; title:string; url:string; apiUrl?:string; updated?:string; table?:string; printedPage?:number};
  rows:EuropeForestryReferenceRow[];
  /** Original hierarchical input observations; never add these to the band. */
  detailRows?:EuropeForestryReferenceRow[];
  /** Separate industry by-product inputs; never add to first-use roundwood. */
  byproducts?:EuropeForestryReferenceRow[];
  notes:string[];
};

const countries:Record<string,{code:string;name:string}>={DEU:{code:'DE',name:'ドイツ'},AUT:{code:'AT',name:'オーストリア'},PRT:{code:'PT',name:'ポルトガル'},FIN:{code:'FI',name:'フィンランド'},SWE:{code:'SE',name:'スウェーデン'},GBR:{code:'UK',name:'英国'}};
const source=(dataset:string)=>{
  const record=wood.sources.find(row=>row.dataset===dataset)!;
  return {dataset,title:record.title,url:record.url,apiUrl:record.api_url,updated:record.updated};
};
const row=(id:string,label:string,value:number|null,flag:string|null,role:EuropeForestryReferenceRow['role']):EuropeForestryReferenceRow=>({id,label,value,flag,role});

/** Separate national references selected from retained source observations.
 * No reference value replaces a FAOSTAT observation or its World denominator.
 * Returned rows are new objects; callers cannot mutate the source packet. */
export function existingEuropeForestryReferences(countryCode:string,seriesId:string):EuropeForestryReference[]{
  const country=countries[countryCode];
  const roundwood=seriesId==='roundwood-production',industrial=seriesId==='industrial-roundwood-production',fuel=seriesId==='wood-fuel-production',sawnwood=seriesId==='sawnwood-production';
  if(!country||!roundwood&&!industrial&&!fuel&&!sawnwood)return [];
  const result:EuropeForestryReference[]=[];
  const common={countryCode,countryName:country.name,selectedSeriesId:seriesId};
  const balance=(roundwood||industrial||sawnwood)?wood.balances.find(record=>record.country_code===country.code&&record.product_code===(sawnwood?'SN':'RW_IN')):undefined;
  if(balance){
    const flags=balance.observation_flags as Record<string,string>;
    result.push({...common,id:`europe-${countryCode}-${balance.product_code}-balance`,kind:'balance',year:balance.year,productCode:balance.product_code,productLabel:sawnwood?'製材（枕木を含む）':'産業用丸太（燃料材を除く）',selectionRelation:roundwood?'subset-of-selected':'same-product',unit:'THS_M3',barkBasis:sawnwood?'not-applicable':'under-bark',scope:`${country.name}全国・Eurostat JFSQ。当該加工段階の生産・輸入・輸出。`,source:source(balance.source_dataset),rows:[
      row('production','国内生産',balance.production,flags.PRD??null,'production'),
      row('imports','輸入',balance.imports,flags.IMP??null,'imports'),
      row('exports','輸出',balance.exports,flags.EXP??null,'exports'),
      row('supply','生産＋輸入（在庫を含まない）',balance.supply,null,'derived-supply'),
      row('apparent-consumption','見かけ消費（在庫未調整）',balance.apparent_consumption,null,'derived-apparent-consumption'),
      row('stocks','在庫・在庫増減',balance.stocks,null,'stocks'),
    ],notes:[
      ...(roundwood?['産業用丸太は選択した丸太全体の部分区分。燃料材を含むFAOSTAT丸太1861の生産量に置き換えません。']:[]),
      '供給＝生産＋輸入。見かけ消費＝生産＋輸入−輸出。公表資料に在庫調整はなく、実消費・実用途・国産材消費ではありません。',
      '国別の総輸入・総輸出で、域外EU貿易やEU27全体の完全収支ではありません。再輸出を含み得ます。',
      '丸太と製材は別加工段階。同じm³でも足し合わせず、差を用途や歩留まりにしません。',
      '原資料の品質記号を保持。d＝定義差、p＝暫定、null在庫＝未収録（0ではない）。',
    ]});
  }
  const removal=(roundwood||industrial||fuel)?wood.removal_assortments.find(record=>record.country_code===country.code):undefined;
  if(removal){
    const values=removal.values;
    result.push({...common,id:`europe-${countryCode}-removals`,kind:'removals',year:removal.year,productCode:'RW',productLabel:'丸太搬出量（燃料材を含む）',selectionRelation:roundwood?'same-product':'broader-product-reference',unit:'THS_M3_UNDER_BARK',barkBasis:'under-bark',scope:`${country.name}全国・搬出材の用途区分。`,source:source(removal.source_dataset),rows:[
      row('total','搬出量計',values.RW.value,values.RW.status,'total'),
      row('fuelwood','燃料材',values.RW_FW.value,values.RW_FW.status,'component'),
      row('sawlogs','製材・単板用原木',values.RW_IN_LG.value,values.RW_IN_LG.status,'component'),
      row('pulpwood','パルプ・板用材',values.RW_IN_PW.value,values.RW_IN_PW.status,'component'),
      row('other-industrial','その他の産業用丸太',values.RW_IN_O.value,values.RW_IN_O.status,'component'),
    ],detailRows:[row('industrial-roundwood','産業用丸太（3産業用途の小計）',values.RW_IN.value,values.RW_IN.status,'total')],notes:[
      '構成帯は燃料材・製材／単板用原木・パルプ／板用材・その他の4区分。総量と産業用丸太小計をもう一度足しません。',
      'パルプ用材には板用原料も含みます。完成製材・完成パルプの生産量や、建設・家具など最終用途割合ではありません。',
      '樹皮なし千m³の搬出量。FAOSTAT世界比の国値や別単位の工業投入へ接合しません。',
      '原資料では区分合計と総量は0.1千m³以内で一致。丸め差を架空の用途へ割り当てません。',
      ...(industrial||fuel?['選択した産業用丸太／燃料材より広い丸太全体の参考構成です。選択系列の総量ではありません。']:[]),
    ]});
  }
  if(countryCode==='FIN'&&(roundwood||industrial)){
    const input=wood.finland_actual_industrial_input;
    const labels:Record<string,string>={TOL_YHT:'工業投入計',PUUTEOL_YHT:'木製品工業（小計）',SAHTEOL_YHT:'製材工業',VANTEOL:'合板・単板工業',MUUTEOL:'その他の木製品工業',MASTEOL_YHT:'パルプ工業（全体）',MEKPKTEOL:'機械・半化学パルプ工業（内数）',SELTEOL:'化学パルプ工業（内数）'};
    const components=['SAHTEOL_YHT','VANTEOL','MUUTEOL','MASTEOL_YHT'];
    const primary=input.rows.filter(record=>record.industry_code==='TOL_YHT'||components.includes(record.industry_code));
    result.push({...common,id:'europe-FIN-industrial-input',kind:'industrial-input',year:input.year,productCode:'LUKE_FIRST_USE_ROUNDWOOD',productLabel:'工業の最初の原料投入（輸入チップ・おがくずを含む）',selectionRelation:'different-stage-reference',unit:'THS_M3_SOLID_OVER_BARK',barkBasis:'over-bark',scope:'フィンランド全国・実際の工業投入。国内副産物を最初の丸太投入から除外。',source:{dataset:'LUKE_0300_puukay',title:'Luke：工業木材投入',url:input.source_url,apiUrl:input.api_url},rows:primary.map(record=>row(record.industry_code,labels[record.industry_code],record.roundwood.value,record.roundwood.status,record.industry_code==='TOL_YHT'?'total':'component')),detailRows:input.rows.map(record=>row(record.industry_code,labels[record.industry_code],record.roundwood.value,record.roundwood.status,'total')),byproducts:input.rows.map(record=>row(record.industry_code,labels[record.industry_code]+'・副産物（別掲）',record.byproducts_separate_do_not_add_to_first_use.value,record.byproducts_separate_do_not_add_to_first_use.status,record.industry_code==='TOL_YHT'?'total':'component')),notes:[
      '構成帯は製材・合板／単板・その他木製品・パルプ全体の4区分。木製品小計とパルプ工業の内訳は詳細参考であり、再加算しません。',
      '投入計62,655千m³は樹皮あり。国内副産物8,727千m³は別掲で、最初の投入総量や構成帯へ足しません。',
      '輸入チップ・おがくずを含む工業投入で、Eurostat樹皮なしの丸太需給・搬出材用途とは合算しません。',
      '副産物の値null・記号「-」は原資料で数量ゼロを示す記号。記号「..」は欠測／不確実／秘匿。原nullと原記号を保持しています。',
      input.revision,
    ]});
  }
  if(countryCode==='GBR'&&sawnwood){
    const markets=wood.uk_2024_larger_mill_end_uses;
    const labels:Record<string,string>={Construction:'建設',Fencing:'柵', 'Packaging/pallets':'包装・パレット',Other:'その他'};
    result.push({...common,id:'europe-GBR-large-sawmill-markets',kind:'market-shares',year:markets.year,productCode:'LARGE_MILLS_SOFTWOOD_SAWNWOOD',productLabel:'大型製材所の針葉樹製材・市場構成',selectionRelation:'subset-of-selected',unit:'percent',barkBasis:'not-applicable',scope:'英国・年間製材生産25,000m³以上の製材所。針葉樹製材の製品市場。',source:{dataset:'Forest_Research_Sawmill_Survey',title:markets.source,url:markets.url,table:markets.table,printedPage:markets.printed_page},rows:Object.entries(markets.shares).map(([id,value])=>row(id,labels[id],value,null,'component')),notes:[
      '年25,000m³以上の製材所が対象。全英国の消費、輸入完成品、全欧州、マツだけの用途割合ではありません。',
      '市場割合の分母は対象製材所の針葉樹製材品。輸出相手国別の使途を追跡した図ではありません。',
      '製材全体の選択に対する、対象事業所・樹種を限定した別参考です。',
    ]});
  }
  return result;
}
