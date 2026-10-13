// Compare the same scene after selection/history without freezing library
// antialiasing. Marker/label boxes are excluded from the geographic paint check.
export function mapPaintDifference(reference,current,masks=[],radius=1){
 const {width,height}=reference;
 if(width!==current.width||height!==current.height)throw Error('Map clip dimensions changed');
 const masked=new Uint8Array(width*height);
 for(const box of masks)for(let y=Math.max(0,Math.floor(box.top));y<Math.min(height,Math.ceil(box.bottom));y++)for(let x=Math.max(0,Math.floor(box.left));x<Math.min(width,Math.ceil(box.right));x++)masked[y*width+x]=1;
 let sampled=0,changed=0;
 const matches=(a,b)=>Math.abs(reference.data[a]-current.data[b])<=3&&Math.abs(reference.data[a+1]-current.data[b+1])<=3&&Math.abs(reference.data[a+2]-current.data[b+2])<=3;
 for(let y=2;y<height-2;y++)for(let x=2;x<width-2;x++){
  const index=y*width+x;if(masked[index])continue;sampled++;const a=index*4;
  if(matches(a,a))continue;
  let nearby=false;
  for(let dy=-radius;dy<=radius&&!nearby;dy++)for(let dx=-radius;dx<=radius;dx++)if(matches(a,((y+dy)*width+x+dx)*4)){nearby=true;break;}
  if(!nearby)changed++;
 }
 return {sampled,changed,fraction:sampled?changed/sampled:1};
}

export function labelInk(image,box){
 let dark=0,total=0;
 for(let y=Math.max(0,Math.floor(box.top));y<Math.min(image.height,Math.ceil(box.bottom));y++)for(let x=Math.max(0,Math.floor(box.left));x<Math.min(image.width,Math.ceil(box.right));x++){
  const i=(y*image.width+x)*4;total++;
  if(image.data[i]+image.data[i+1]+image.data[i+2]<560)dark++;
 }
 return {dark,total};
}
