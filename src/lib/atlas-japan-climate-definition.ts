/** Beck et al.2023 definition; source-grid classes and station normals stay separate. */
export function japanClimateDefinition(code:string|null){
 if(code==='Cfa')return '乾燥帯Bに該当せず、最寒月平均0℃超・18℃未満、最暖月22℃以上。夏乾季s・冬乾季wの条件をどちらも満たさない温帯です。';
 if(code==='Dfa')return '乾燥帯Bに該当せず、最寒月平均0℃以下、最暖月22℃以上。夏乾季s・冬乾季wの条件をどちらも満たさない冷帯です。';
 if(code==='Dfb')return '乾燥帯Bに該当せず、最寒月平均0℃以下、最暖月22℃未満で10℃超の月が4か月以上。夏乾季s・冬乾季wの条件をどちらも満たさない冷帯です。';
 return code?'条件の詳説は原分類の定義を参照してください。':'この表示格子は欠測・未分類です。観測所の雨温図の欠測とは別です。';
}
export const japanClimateDryRules='Bは年降水量（mm）が20×年平均気温（℃）＋季節補正未満。北半球の夏半年は4〜9月、冬半年は10〜3月。夏に年雨量の70%以上なら補正280、冬に70%以上なら0、その他140。sは夏の最少雨月40mm未満かつ冬の最多雨月の1/3未満、wは冬の最少雨月が夏の最多雨月の1/10未満。';
export function japanStationClassCaveat(code:string|null,temperature:readonly (number|null)[]){const values=temperature.filter((v):v is number=>v!==null),min=Math.min(...values),max=Math.max(...values);return (code?.startsWith('C')&&min<=0)||(code?.endsWith('b')&&max>=22)?'この観測所の月平年値は、表示格子の区分条件と一致しない項目があります。地点と広域格子は空間単位・代表値が異なり、格子の区分を観測所の分類と断定しません。':'地図の区分は広域格子、雨温図は観測所の平年値です。空間単位が異なり、この雨温図から格子の区分を再計算していません。';}
