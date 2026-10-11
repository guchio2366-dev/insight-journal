// Broad route descriptions read from the existing Natural Earth river lines and
// HydroSHEDS basin outlines. These are not coordinates for a point source or
// precise delta branch, and the map intentionally stays at regional scale.
export const southeastWaterRoutes:Record<string,{title:string;reading:string}>={
 'rivers-254':{title:'メコン川：高地からデルタへ',reading:'中国南西部の高地から南へ流れ、ラオス・タイ沿いとカンボジアを経て、ベトナム南部のデルタから南シナ海へ注ぎます。上流の集水域は表示枠の外にも続きます。'},
 'rivers-121':{title:'エーヤワディー川：ミャンマー中央部を南下',reading:'ミャンマー北部の山地から中央部の低地を南下し、デルタを通ってアンダマン海へ注ぎます。河川の線は概略で、支流や河口の細い枝はすべて描いていません。'},
 'rivers-351':{title:'サルウィン川：山地に沿う南北の流れ',reading:'中国南西部の高地からミャンマー東部の山地に沿って南へ流れ、モーラミャイン付近でアンダマン海へ注ぎます。隣のエーヤワディー川とは別の集水域です。'},
 'rivers-210':{title:'紅河：中国南西部からトンキン湾へ',reading:'中国雲南省側の高地からベトナム北部へ流れ、ハノイを含むデルタを経てトンキン湾へ注ぎます。低地の稲作地帯と上流の山地を一つの国の降水量だけで説明できません。'},
 'rivers-234':{title:'カプアス川：ボルネオ島西部の水系',reading:'ボルネオ島内陸の高地からインドネシア領西カリマンタンを西へ流れ、ポンティアナック付近で南シナ海へ注ぎます。大陸部の長い国際河川と違い、島内の集水域です。'},
};
export const southeastWaterRouteSources=[
 {label:'Natural Earth：河川線の資料',url:'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/'},
 {label:'HydroSHEDS：流域と流向の資料',url:'https://www.hydrosheds.org/products/hydroatlas'},
];
