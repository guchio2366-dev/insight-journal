// Outlines describe positive 2020 estimated cells, not field boundaries.
// Strong cells are ranked within each source series; crop hectares and livestock density are never added.
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
function cellsPath(width,height,active) {
  let path='';
  for(let y=0;y<height;y++){
    let start=-1;
    for(let x=0;x<=width;x++){
      const on=x<width&&active(y*width+x);
      if(on&&start<0)start=x;
      if(!on&&start>=0){path+=`M${start},${y}h${x-start}v1H${start}Z`;start=-1;}
    }
  }
  return path;
}
export function westFarmingOverlap(first,second,firstThreshold,secondThreshold,width,height) {
  if(first.length!==width*height||second.length!==first.length)throw Error('Unexpected farming overlap grid length');
  return cellsPath(width,height,i=>first[i]>=firstThreshold&&second[i]>=secondThreshold);
}
export function westFarmingGeometry(values,layer,stride=4) {
  const {width,height,noData}=layer;
  if(values.length!==width*height)throw Error('Unexpected farming grid length');
  const positive=Array.from(values).filter(value=>Number.isFinite(value)&&value!==noData&&value>0).sort((a,b)=>a-b);
  const threshold=positive.length?positive[Math.floor((positive.length-1)*.75)]:null;
  const cols=Math.ceil(width/stride),rows=Math.ceil(height/stride),mask=new Uint8Array(cols*rows),strongMask=new Uint8Array(cols*rows),points=new Map(),strongPoints=new Map();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const value=values[y*width+x];
    if(!Number.isFinite(value)||value===noData||value<=0)continue;
    mask[Math.floor(y/stride)*cols+Math.floor(x/stride)]=1;
    const bin=Math.floor(y/height*4)*6+Math.floor(x/width*6),previous=points.get(bin);
    if(!previous||value>previous.value)points.set(bin,{x:x+.5,y:y+.5,value});
    if(threshold!==null&&value>=threshold){strongMask[Math.floor(y/stride)*cols+Math.floor(x/stride)]=1;const strongBin=Math.floor(y/height*8)*12+Math.floor(x/width*12),previousStrong=strongPoints.get(strongBin);if(!previousStrong||value>previousStrong.value)strongPoints.set(strongBin,{x:x+.5,y:y+.5,value});}
  }
  const coverage=cellsPath(width,height,i=>Number.isFinite(values[i])&&values[i]!==noData&&values[i]>0);
  const strongCoverage=threshold===null?'':cellsPath(width,height,i=>Number.isFinite(values[i])&&values[i]!==noData&&values[i]>0&&values[i]>=threshold);
  const outlineFor=surface=>{
    let outline='';const active=(x,y)=>x>=0&&y>=0&&x<cols&&y<rows&&surface[y*cols+x]===1;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(active(x,y)){
      const left=x*stride,top=y*stride,right=Math.min(width,left+stride),bottom=Math.min(height,top+stride);
      if(!active(x,y-1))outline+=`M${left},${top}H${right}`;
      if(!active(x+1,y))outline+=`M${right},${top}V${bottom}`;
      if(!active(x,y+1))outline+=`M${right},${bottom}H${left}`;
      if(!active(x-1,y))outline+=`M${left},${bottom}V${top}`;
    }
    return outline;
  };
  return {coverage,strongCoverage,threshold,outline:outlineFor(mask),strongOutline:outlineFor(strongMask),points:[...points.values()],strongPoints:[...strongPoints.values()]};
}
