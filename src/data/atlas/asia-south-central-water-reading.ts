// River cases use the named Natural Earth line and existing BasinATLAS link.
// A line is a route, a basin is its catchment, and neither is current discharge.
export const southCentralWaterSystems:Record<string,{title:string;reading:string;source:{label:string;url:string}}>= {
 'rivers-194':{title:'ガンジス川',reading:'ヒマラヤと南アジアの平野から集まる水は、インド北部を通り、バングラデシュの低地へ続きます。夏の雨と上流から届く川の水を分け、下流の稲作域と比べます。隣のブラマプトラ川とは別の流路です。地図の線は流路、流域の面は水が集まる範囲です。',source:{label:'世界銀行・インドの水資源とガンジス川流域（2026年）',url:'https://www.worldbank.org/en/brief/2026/03/19/how-india-is-addressing-its-water-needs'}},
 'rivers-29':{title:'インダス川',reading:'カラコルム・西ヒマラヤ側の雪氷を含む上流から、パキスタンの乾いた低地へ水が続きます。下流に降る雨の少なさと、灌漑に利用される河川水の供給を別に読みます。流路の線から現在の取水量は分かりません。',source:{label:'ICIMOD・パキスタンの氷河と水供給',url:'https://www.icimod.org/importance-of-glaciers-for-water-availability-in-pakistan/'}},
 'rivers-112':{title:'アムダリヤ川',reading:'パミール周辺の山地から、乾燥した中央アジアの低地へ流れます。下流の灌漑には川の水を運び、国境を越えて配分する仕組みが関わります。アラル海へ現在届く量は、この自然地形の線と過去の自然化流量からは求められません。',source:{label:'FAO・中央アジアの灌漑（2013年）',url:'https://www.fao.org/4/i3289e/i3289e.pdf#page=202'}},
 'rivers-79':{title:'シルダリヤ川',reading:'天山山脈側からフェルガナ盆地を経て、乾燥した低地へ続きます。上流の水と下流の灌漑のつながりを、国境をまたぐ流域で読みます。雨の少ない地点だけを見て川の水量を判断しません。',source:{label:'FAO・中央アジアの灌漑（2013年）',url:'https://www.fao.org/4/i3289e/i3289e.pdf#page=202'}},
};
export const southCentralWaterOverview='インダス川とガンジス・ブラマプトラ水系は山地から南の平野へ、アムダリヤ川とシルダリヤ川は山地から乾いた内陸の低地へ続きます。青い線で水の通り道を選び、淡い青の面で主要な帯水層の位置を確かめます。帯水層の広がりは、取水できる水の量を示しません。';
export const southCentralGroundwaterOverview='インダス平野、ガンジス・ブラマプトラの低地、中央アジアの盆地には主要な帯水層の分布が見えます。インド北西部では稲作・小麦作の灌漑と地下水位の低下が課題です。中央アジアでは山地から届く河川水と灌漑の配分も重要で、帯水層があることを十分な利用可能量とは読みません。';
