import evidence from './africa-hydrology-evidence.json' with {type:'json'};
import {reading,type Reading} from './africa-reading.ts';
import {themeById,type AfricaTheme} from './africa-themes.ts';

export type AfricaHydrologyRiverId='nile'|'congo'|'niger'|'zambezi'|'orange'|'limpopo'|'senegal'|'volta'|'okavango';
export type AfricaHydrologyLabelCandidate={
 featureId:string;
 partIndex:number;
 vertexIndex:number;
 coordinates:readonly [longitude:number,latitude:number];
};
export type AfricaHydrologyRiver={
 id:AfricaHydrologyRiverId;
 label:string;
 sourceName:string;
 featureIds:readonly string[];
 labelCandidates:readonly AfricaHydrologyLabelCandidate[];
 source:string;
 sourceLabel:string;
 // Only pre-existing, approved explanatory prose is attached. Other rivers
 // have source geometry and a name, not a newly inferred water-system account.
 reading?:Reading;
 theme?:AfricaTheme;
};

export const africaHydrologySources=evidence.sources;
export const africaHydrologyRelationScope=evidence.relationScope;
export const africaHydrologyRiverScope='線は Natural Earth 1:50,000,000 の河川・湖の中心線です。表示枠はアフリカ周辺の隣接陸域も含みます。支流や季節流況を網羅せず、線の太さから流量・川幅・取水可能量は分かりません。地下水・帯水層の分布は未収録です。';

const approvedReadings:Partial<Record<AfricaHydrologyRiverId,Reading>>={
 nile:reading.nature.find(item=>item.title==='ナイル：雨と利用できる水を分ける')!,
 congo:reading.nature.find(item=>item.title==='コンゴ盆地：湿潤な環境と森林')!,
};

export const africaHydrologyRivers:readonly AfricaHydrologyRiver[]=evidence.rivers.map(row=>({
 id:row.id as AfricaHydrologyRiverId,
 label:row.label,
 sourceName:row.sourceName,
 featureIds:row.featureIds,
 labelCandidates:row.labelCandidates.map(candidate=>({...candidate,coordinates:[candidate.coordinates[0],candidate.coordinates[1]] as const})),
 source:evidence.sources.rivers.sourceUrl,
 sourceLabel:'Natural Earth・河川と湖の中心線（v5.1.2）',
 reading:approvedReadings[row.id as AfricaHydrologyRiverId],
 ...(row.id==='nile'?{theme:themeById('nile-water')}:{}),
}));

export function africaHydrologyRiverById(id:string):AfricaHydrologyRiver|undefined {
 return africaHydrologyRivers.find(river=>river.id===id);
}

export function africaHydrologyRiverForFeature(feature:{id?:unknown;properties?:Record<string,unknown>}):AfricaHydrologyRiver|undefined {
 const properties=feature.properties??{},id=String(properties.id??feature.id??'');
 return africaHydrologyRivers.find(river=>river.featureIds.includes(id)&&properties.sourceName===river.sourceName);
}

// These relations identify co-located source geometry. They do not rename the
// original BasinATLAS features or claim that those polygons are complete named
// river basins. All 1,037 polygons, including coastal units, were tested.
export const africaHydrologyBasinRelations=evidence.rivers.map(row=>({
 ...row.basinRelation,
 riverId:row.id as AfricaHydrologyRiverId,
 riverLabel:row.label,
 source:evidence.sources.basins.sourceUrl,
 sourceLabel:'BasinATLAS v1.0・接続する集水区（2019年公開版）',
 scope:`${row.basinRelation.testedVertices}頂点中${row.basinRelation.containedVertices}頂点が、この収録集水区内にあります。${row.basinRelation.outsideRelatedBasinVertices?`残り${row.basinRelation.outsideRelatedBasinVertices}頂点は区画外です。`:''}これは頂点数の照合結果で、河道長の割合や全流域の完全性ではありません。${evidence.relationScope}`,
 reading:approvedReadings[row.id as AfricaHydrologyRiverId],
}));

export function africaHydrologyBasinById(id:string) {
 return africaHydrologyBasinRelations.find(relation=>relation.basinId===id);
}

export const africaHydrologyOverview={
 river:{
  title:'アフリカの河川と地下水資料の範囲',
  reading:'北部のナイル川、中央部のコンゴ川、西部のニジェール川、南側のザンベジ川など、収録された河道の位置を読みます。河川の線や名前を選ぶと、その線と原典を確認できます。ナイル川・コンゴ川には、水利用や周辺環境についての既存解説があります。',
  scope:africaHydrologyRiverScope,
  source:evidence.sources.rivers.sourceUrl,
  sourceLabel:'Natural Earth・河川と湖の中心線（v5.1.2、Public domain）',
  groundwater:'地下水の分布を示す資料は未収録です。国別の「国内の再生可能淡水」は河川水と地下水を合わせた指標で、帯水層の位置・地下水貯留量・取水できる量を示しません。',
 },
 basin:{
  title:'アフリカの集水区と河川の位置関係',
  reading:'雨水が集まる区画の境界を、国境とは別の線として読みます。BasinATLAS のレベル6区画を末端への接続で統合した資料には、大きな集水区、海岸沿いの集約区画、海へ出ない内流区画が収録されています。名前付き河道との位置関係を確かめながら、区画を選んで形を読みます。',
  scope:'色は収録集水区の区別で、水量や取水量を示しません。海岸集約区画は単一河川の流域とは限りません。河道名を添えた区画は頂点の包含照合による対応で、原本の正式な流域名ではありません。ニジェール川・ザンベジ川などには対応区画の外にある河道頂点もあります。',
  source:evidence.sources.basins.sourceUrl,
  sourceLabel:'BasinATLAS v1.0・HydroATLAS / Linke et al.（2019、CC BY 4.0）',
 },
} as const;
