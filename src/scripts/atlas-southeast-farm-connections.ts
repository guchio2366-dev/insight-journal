const balanceByTopic:Record<string,string>={rice:'rice',maize:'maize',sugarcane:'sugar',soybean:'soybean',cassava:'cassava'};
const topicNames:Record<string,string>={oilpalm:'油ヤシ',rubber:'天然ゴム',arabica:'アラビカ',robusta:'ロブスタ',cattle:'牛',buffalo:'水牛',pig:'豚',chicken:'鶏'};

/** The 10-country commodity balance is context, never a conversion of the map. */
export function renderSoutheastFarmConnections(root:HTMLElement,topic:string|null,country?:{code:string;name:string}){
 const host=root.querySelector<HTMLElement>('[data-southeast-food-balances]');
 if(!host)return;
 const key=`${topic??'overview'}:${country?.code??''}`;
 if(host.dataset.selectionKey!==key){
  const selected=balanceByTopic[topic??'']??'rice';
  for(const panel of host.querySelectorAll<HTMLDetailsElement>('[data-southeast-balance]'))panel.open=panel.dataset.southeastBalance===selected;
  host.dataset.selectionKey=key;
 }
 const note=host.querySelector<HTMLElement>('[data-southeast-balance-context]');
 if(note){
  const selected=topic&&topic!=='overview'&&topic!=='forest';
  note.textContent=[country?`${country.name}の国計とは別に、当時のASEAN10か国を比べます。`:'',selected&&!balanceByTopic[topic]?`${topicNames[topic]??'選択品目'}の需給は未収録です。以下は収録した食料5品目の比較です。`:''].join('');
  note.hidden=!note.textContent;
 }
 const supplyTitle=root.querySelector<HTMLElement>('[data-southeast-supply-title]');
 if(supplyTitle)supplyTitle.textContent='食料5品目の供給と利用';
 const tradeTitle=root.querySelector<HTMLElement>('[data-southeast-partner-title]');
 if(tradeTitle)tradeTitle.textContent='各国の米の輸出・輸入';
}
