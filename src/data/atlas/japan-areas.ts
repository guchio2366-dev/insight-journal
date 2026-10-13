/** View ranges are editorial camera frames, not administrative or thematic polygons. */
export const japanAreas=[
 {id:'japan',name:'日本全国',prefectures:[] as string[],bounds:[129.2,30.05,146.1,45.65]},
 {id:'hokkaido',name:'北海道',prefectures:['JP-01'],bounds:[139.1,41.35,146.05,45.7]},
 {id:'tohoku',name:'東北',prefectures:['JP-02','JP-03','JP-04','JP-05','JP-06','JP-07'],bounds:[138.85,36.75,142.2,41.6]},
 {id:'kanto',name:'関東',prefectures:['JP-08','JP-09','JP-10','JP-11','JP-12','JP-13','JP-14'],bounds:[138.2,34.65,141.0,37.2]},
 {id:'chubu',name:'中部',prefectures:['JP-15','JP-16','JP-17','JP-18','JP-19','JP-20','JP-21','JP-22','JP-23'],bounds:[135.4,34.4,139.35,38.7]},
 {id:'kinki',name:'近畿',prefectures:['JP-24','JP-25','JP-26','JP-27','JP-28','JP-29','JP-30'],bounds:[134.0,33.3,137.0,36.35]},
 {id:'chugoku',name:'中国',prefectures:['JP-31','JP-32','JP-33','JP-34','JP-35'],bounds:[130.5,33.65,134.7,35.7]},
 {id:'shikoku',name:'四国',prefectures:['JP-36','JP-37','JP-38','JP-39'],bounds:[132.0,32.7,134.9,34.7]},
 {id:'kyushu',name:'九州',prefectures:['JP-40','JP-41','JP-42','JP-43','JP-44','JP-45','JP-46'],bounds:[128.0,30.05,132.15,34.85]},
 {id:'okinawa',name:'沖縄',prefectures:['JP-47'],bounds:[122.7,23.7,131.5,28.05]},
] as const;
export type JapanAreaId=typeof japanAreas[number]['id'];
export const japanArea=(id?:string)=>japanAreas.find(a=>a.id===id)??japanAreas[0];
export const japanInsetBounds=[122.7,23.7,131.7,30.05] as const;
export const japanAreaDefinition={
 source:'https://vldb.gsi.go.jp/sokuchi/level/KENSOKUSYUROKU/todofuken.htm',
 method:'国土地理院の地方別都道府県一覧を照合。北陸4県を中部に含め、沖縄は九州から分ける。47都道府県を一度ずつ割り当てる。地方区分は統計資料ごとに異なるため、他資料の集計区分をこの表示区分へ読み替えない。',
 frames:'各範囲は主要な陸地を読むための表示範囲。県境・地方境界を生成せず、所属する遠隔離島がすべて入るとは限らない。データは全国のまま保持する。全国図は本土と南西諸島の挿入図。小笠原など一部遠隔島は初期範囲外。',
 inset:'同じMercator投影・実座標の別地図を左上に配置。主図との位置関係を示さず、縮尺・緯度は別に明示。データの座標を移動・伸縮しない。',
};
