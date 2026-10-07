// Outlines describe positive 2020 estimated cells, not field boundaries.
// Filled coverage retains every positive display cell. Dots are supplementary representatives.
export const westFarmingProducts = [
  {id:'wheat',label:'小麦',kind:'crop',color:'#ad8735'},
  {id:'barley',label:'大麦',kind:'crop',color:'#4d8665'},
  {id:'sheep',label:'羊',kind:'livestock',color:'#876391'},
  {id:'goat',label:'山羊',kind:'livestock',color:'#b3663d'},
  {id:'cattle',label:'牛',kind:'livestock',color:'#427f9d'},
];
export function westFarmingProduct(topic) {
  return westFarmingProducts.find(p=>p.id===topic.layer?.replace(/-(irrigated|rainfed)$/,''));
}
export function isWestFarmingOverview(topic) {
  return topic.id==='farming-overview'||!!westFarmingProduct(topic);
}
export function westFarmingGeometry(values,layer,stride=4) {
  const {width,height,noData}=layer;
  if(values.length!==width*height)throw Error('Unexpected farming grid length');
  const cols=Math.ceil(width/stride),rows=Math.ceil(height/stride),mask=new Uint8Array(cols*rows),points=new Map();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const value=values[y*width+x];
    if(!Number.isFinite(value)||value===noData||value<=0)continue;
    mask[Math.floor(y/stride)*cols+Math.floor(x/stride)]=1;
    const bin=Math.floor(y/height*4)*6+Math.floor(x/width*6),previous=points.get(bin);
    if(!previous||value>previous.value)points.set(bin,{x:x+.5,y:y+.5,value});
  }
  let coverage='';
  for(let y=0;y<height;y++){
    let start=-1;
    for(let x=0;x<=width;x++){
      const value=x<width?values[y*width+x]:noData;
      const positive=Number.isFinite(value)&&value!==noData&&value>0;
      if(positive&&start<0)start=x;
      if(!positive&&start>=0){coverage+=`M${start},${y}h${x-start}v1H${start}Z`;start=-1;}
    }
  }
  let outline='';
  const active=(x,y)=>x>=0&&y>=0&&x<cols&&y<rows&&mask[y*cols+x]===1;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(active(x,y)){
    const left=x*stride,top=y*stride,right=Math.min(width,left+stride),bottom=Math.min(height,top+stride);
    if(!active(x,y-1))outline+=`M${left},${top}H${right}`;
    if(!active(x+1,y))outline+=`M${right},${top}V${bottom}`;
    if(!active(x,y+1))outline+=`M${right},${bottom}H${left}`;
    if(!active(x-1,y))outline+=`M${left},${bottom}V${top}`;
  }
  return {coverage,outline,points:[...points.values()]};
}
