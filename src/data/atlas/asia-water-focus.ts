import type {AsiaRegionId} from '../../lib/atlas-asia-state';
// Explicit links to the existing BasinATLAS NEXT_SINK records, not guessed
// drainage polygons. Delta branches with separate outlets remain separate.
export const asiaWaterFocus:Record<AsiaRegionId,{id:string;name:string;river:string}[]>={
 'east-asia':[
  {id:'b-4060009880',name:'長江',river:'rivers-145'},
  {id:'b-4060007850',name:'黄河',river:'rivers-213'},
  {id:'b-4060050210',name:'タリム川',river:'rivers-390'},
  {id:'b-4060000880',name:'アムール川',river:'rivers-113'},
 ],
 'southeast-asia':[
  {id:'b-4060017020',name:'メコン川',river:'rivers-254'},
  {id:'b-4060023810',name:'エーヤワディー川',river:'rivers-121'},
  {id:'b-4060023060',name:'サルウィン川',river:'rivers-351'},
 ],
 'south-central-asia':[
  {id:'b-4060025450',name:'ガンジス・ブラマプトラ水系',river:'rivers-194'},
  {id:'b-4060033640',name:'インダス川',river:'rivers-29'},
  {id:'b-4060050220',name:'アムダリヤ川',river:'rivers-112'},
  {id:'b-4060050240',name:'シルダリヤ川',river:'rivers-79'},
 ],
};
