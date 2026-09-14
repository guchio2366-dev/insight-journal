// Registered feature identities, independent of arbitrary URL text.
export const climateCodes = ['Af','Am','Aw','BWh','BWk','BSh','BSk','Csa','Csb','Csc','Cwa','Cwb','Cwc','Cfa','Cfb','Cfc','Dsa','Dsb','Dsc','Dsd','Dwa','Dwb','Dwc','Dwd','Dfa','Dfb','Dfc','Dfd','ET','EF'];
export const climateFamilyNames:Record<string,string> = {A:'熱帯',B:'乾燥帯',C:'温帯',D:'冷帯（亜寒帯）',E:'寒帯'};
export const landformNames = ['カナダ楯状地','ロッキー山脈','グレートプレーンズ','グレートベースン','アパラチア山脈','カスケード山脈','大西洋海岸平野','中央低地','太平洋岸山脈','シエラネバダ山脈','フロリダ州','コロラド高原','コロンビア川台地','アルゲイニー台地','カンバーランド高原','ピードモント台地','コロンビア山脈','チワワ砂漠','ソノラ砂漠','グレートソルトレイク砂漠','オザーク高原','エドワーズ高原','スペリオール・アップランド','グランド・キャニオン','カリフォルニアセントラルヴァレー','五大湖'];
export const waterNames = ['High Plains Aquifer','Central Valley Aquifer System','Mississippi River Valley Alluvial Aquifer','Floridan Aquifer System','lake-mead','lake-powell','shasta-lake','Mississippi','Missouri','Ohio','Colorado','Columbia','Sacramento','San Joaquin','Lake Superior','Lake Michigan','Lake Huron','Lake Erie','Lake Ontario'];
export function validNatureFeature(value:string|null|undefined):string|null {
  if(!value)return null;
  const [kind,id,...extra]=value.split(':');
  if(extra.length)return null;
  if(kind==='climate'&&climateCodes.includes(id))return value;
  if(kind==='landform'&&landformNames.includes(id))return value;
  if(kind==='water'&&waterNames.includes(id))return value;
  if(kind==='elevation'&&/^(0|[1-9][0-9]{2,3})$/.test(id)){
    const height=Number(id);
    if(height>=0&&height<=4000&&height%500===0)return value;
  }
  return null;
}

export function climateCell(longitude:number,latitude:number,width:number,height:number,bounds:readonly number[]){
  const x=6378137*longitude*Math.PI/180;
  const y=6378137*Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360));
  const column=Math.floor((x-bounds[0])/(bounds[2]-bounds[0])*width);
  const row=Math.floor((bounds[3]-y)/(bounds[3]-bounds[1])*height);
  return column>=0&&row>=0&&column<width&&row<height?(row*width+column)*4:null;
}
