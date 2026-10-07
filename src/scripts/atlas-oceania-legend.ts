import {renderOceaniaLegend,renderOceaniaFarmingKey,type OceaniaLayer} from '../data/atlas/oceania-learning';

const climateShortNames:Record<string,string>={
 Af:'熱帯雨林',Am:'熱帯季節雨',Aw:'サバナ',
 BWh:'高温砂漠',BWk:'低温砂漠',BSh:'高温半乾燥',BSk:'低温半乾燥',
 Csa:'夏乾燥・暑夏',Csb:'夏乾燥・暖夏',Csc:'夏乾燥・冷夏',
 Cwa:'冬乾燥・暑夏',Cwb:'冬乾燥・暖夏',Cwc:'冬乾燥・冷夏',
 Cfa:'温暖湿潤',Cfb:'西岸海洋',Cfc:'海洋・冷夏',
 Dsa:'冷帯夏乾燥・暑夏',Dsb:'冷帯夏乾燥・暖夏',Dsc:'冷帯夏乾燥・冷夏',Dsd:'冷帯夏乾燥・厳寒',
 Dwa:'冷帯冬乾燥・暑夏',Dwb:'冷帯冬乾燥・暖夏',Dwc:'冷帯冬乾燥・冷夏',Dwd:'冷帯冬乾燥・厳寒',
 Dfa:'冷帯・暑夏',Dfb:'冷帯・暖夏',Dfc:'冷帯・冷夏',Dfd:'冷帯・厳寒',
 ET:'ツンドラ',EF:'氷雪',
};

export function renderOceaniaRequiredLegend(layer:OceaniaLayer):string{
 if(layer.field==='agriculture')return renderOceaniaFarmingKey(layer);
 const legend=renderOceaniaLegend(layer);
 if(layer.id!=='climate')return legend;
 return legend.replace(/<span>(<i\b[^>]*><\/i>)([A-Z][A-Za-z]{1,2}) ([^<]+)<\/span>/g,(_,mark,code,name)=>`<span title="${code} ${name}" aria-label="${code} ${name}">${mark}<span>${code} ${climateShortNames[code]??name}</span></span>`).replace('未収録・分類なし','未収録/分類なし');
}
