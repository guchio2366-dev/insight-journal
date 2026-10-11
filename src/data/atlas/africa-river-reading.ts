import {reading,type Reading} from './africa-reading.ts';
import {themeById,type AfricaTheme} from './africa-themes.ts';

export type AfricaRiverId='nile'|'congo'|'niger'|'zambezi'|'orange'|'limpopo'|'senegal'|'volta'|'ogooue'|'okavango'|'chad';
export type AfricaRiverReading={
 id:AfricaRiverId;
 label:string;
 sourceName:string;
 featureIds:readonly string[];
 reading:Reading;
 theme?:AfricaTheme;
};

export const africaRiverSelectedColor='#165a80';

// These IDs identify existing Natural Earth river/lake centreline features.
// They do not identify catchments, tributaries, or a complete river system.
// Keep the approved explanations and their sources as the original objects.
export const africaRivers:readonly AfricaRiverReading[]=[
 {id:'nile',label:'ナイル川',sourceName:'Nile',featureIds:['ne50-river-0047','ne50-river-0298'],reading:reading.nature.find(item=>item.title==='ナイル：雨と利用できる水を分ける')!,theme:themeById('nile-water')},
 {id:'congo',label:'コンゴ川',sourceName:'Congo',featureIds:['ne50-river-0157','ne50-river-0263'],reading:reading.nature.find(item=>item.title==='コンゴ盆地：湿潤な環境と森林')!},
 {id:"niger",label:"ニジェール川",sourceName:"ニジェール川",featureIds:[],reading:{title:"ニジェール川",text:"湿潤な高地から内陸の乾燥地を経てギニア湾へ流れる。内陸デルタでは雨季の増水と氾濫が農業・漁業に関わる。",places:[],source:'https://www.hydrosheds.org/hydroatlas',sourceLabel:'BasinATLAS v1.0・原接続区画（2019）'}},
 {id:"zambezi",label:"ザンベジ川",sourceName:"ザンベジ川",featureIds:[],reading:{title:"ザンベジ川",text:"南部高原を横断してインド洋へ流れる。季節の流入と貯水・発電・下流の氾濫原利用を合わせて読む。",places:[],source:'https://www.hydrosheds.org/hydroatlas',sourceLabel:'BasinATLAS v1.0・原接続区画（2019）'}},
 {id:"orange",label:"オレンジ川",sourceName:"オレンジ川",featureIds:[],reading:{title:"オレンジ川",text:"高地から乾燥した西部を経て大西洋へ流れる。地元の少雨と上流から届く水を区別する。",places:[],source:'https://www.hydrosheds.org/hydroatlas',sourceLabel:'BasinATLAS v1.0・原接続区画（2019）'}},
 {id:"limpopo",label:"リンポポ川",sourceName:"リンポポ川",featureIds:[],reading:{title:"リンポポ川",text:"南部の高地からインド洋へ流れる。季節と年ごとの降雨変動が灌漑と洪水に関わる。",places:[],source:'https://www.hydrosheds.org/hydroatlas',sourceLabel:'BasinATLAS v1.0・原接続区画（2019）'}},
 {id:"senegal",label:"セネガル川",sourceName:"セネガル川",featureIds:[],reading:{title:"セネガル川",text:"ギニア高地から大西洋へ流れる。乾燥地へ届く水と灌漑・雨季の氾濫を読む。",places:[],source:'https://www.hydrosheds.org/hydroatlas',sourceLabel:'BasinATLAS v1.0・原接続区画（2019）'}},
 {id:"volta",label:"ボルタ川",sourceName:"ボルタ川",featureIds:[],reading:{title:"ボルタ川",text:"西アフリカの集水域からボルタ湖を経てギニア湾へ流れる。流域の降雨と貯水・下流利用を区別する。",places:[],source:'https://www.hydrosheds.org/hydroatlas',sourceLabel:'BasinATLAS v1.0・原接続区画（2019）'}},
 {id:"ogooue",label:"オゴウェ川",sourceName:"オゴウェ川",featureIds:[],reading:{title:"オゴウェ川",text:"赤道付近の湿潤な集水域から大西洋へ流れる。森林域の降雨と河道・氾濫原のつながりを読む。",places:[],source:'https://www.hydrosheds.org/hydroatlas',sourceLabel:'BasinATLAS v1.0・原接続区画（2019）'}},
 {id:"okavango",label:"オカバンゴ内流域",sourceName:"オカバンゴ内流域",featureIds:[],reading:{title:"オカバンゴ内流域",text:"高地の水が内陸の湿地へ届く。原接続区画にはマクガディクガディも含み、常時つながる水路や湿地面積を示さない。",places:[],source:'https://www.hydrosheds.org/hydroatlas',sourceLabel:'BasinATLAS v1.0・原接続区画（2019）'}},
 {id:"chad",label:"チャド湖内流域",sourceName:"チャド湖内流域",featureIds:[],reading:{title:"チャド湖内流域",text:"シャリ川などが内陸のチャド湖へ流入する。湖面は流域降雨、蒸発、水利用を合わせて読む。",places:[],source:'https://www.hydrosheds.org/hydroatlas',sourceLabel:'BasinATLAS v1.0・原接続区画（2019）'}},
];

export function africaRiverById(id:string):AfricaRiverReading|undefined {
 return africaRivers.find(river=>river.id===id);
}

export function africaRiverForFeature(feature:{id?:unknown;properties?:Record<string,unknown>}):AfricaRiverReading|undefined {
 const properties=feature.properties??{},id=String(properties.id??feature.id??'');
 if(typeof properties.riverId==='string')return africaRiverById(properties.riverId);
 return africaRivers.find(river=>river.featureIds.includes(id)&&properties.sourceName===river.sourceName);
}
