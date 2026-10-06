/** Product colors and badge vocabulary match the shared U.S. agriculture map. */
export const mexicoCrops = [
 {id:'corn',name:'とうもろこし',color:'#ecc759'},
 {id:'wheat',name:'小麦',color:'#d5a56c'},
 {id:'beans',name:'インゲン豆',color:'#a3bc73'},
 {id:'sorghum',name:'ソルガム',color:'#ce8f58'},
 {id:'sugarcane',name:'さとうきび',color:'#75a985'},
 {id:'rice',name:'稲作',color:'#54acd0'},
 {id:'cotton',name:'綿花',color:'#b886b2'},
 {id:'coffee',name:'コーヒー',color:'#89634b'},
 {id:'fruit',name:'果樹',color:'#e89c6c'},
 {id:'vegetables',name:'野菜',color:'#84aa9a'},
 {id:'other',name:'その他',color:'#b7b69e'},
] as const;
export const mexicoLivestockKinds = [
 {id:'beef',label:'肉牛',symbol:'牛',color:'#8f4f35'},
 {id:'dairy',label:'酪農',symbol:'乳',color:'#356b7a'},
 {id:'pork',label:'養豚',symbol:'豚',color:'#a86272'},
 {id:'broiler',label:'鶏肉',symbol:'鶏',color:'#ad742c'},
 {id:'eggs',label:'採卵鶏',symbol:'卵',color:'#7a6430'},
] as const;
export const mexicoAgricultureIds=[...mexicoCrops.map(item=>item.id),...mexicoLivestockKinds.map(item=>item.id),'pine','irrigation','cattle'];
export function mexicoAgricultureLabel(id:string):string {
 return mexicoCrops.find(item=>item.id===id)?.name??mexicoLivestockKinds.find(item=>item.id===id)?.label??({pine:'森林資源と木材生産',irrigation:'灌漑と農地',cattle:'牛の飼養頭数（2022年センサス）'}[id]??id);
}
