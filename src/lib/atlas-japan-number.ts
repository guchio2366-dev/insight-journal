/** Keep a modelled small positive quantity distinct from a genuine zero. */
export function formatJapanQuantity(value:number):string {
 if(value>0&&value<.1)return '0超〜0.1未満';
 return value.toLocaleString('ja-JP',{maximumFractionDigits:1});
}
