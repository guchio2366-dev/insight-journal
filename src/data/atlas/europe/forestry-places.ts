import type { EuropeReading } from './readings';

/** Verified processing locations; markers are not wood procurement areas or quantities. */
export const europeForestryPlaces:EuropeReading[]=[
 {id:'kotka-wood-port',name:'コトカ・木材製品の港',field:'agriculture',country:'FIN',coordinates:[26.941814,60.461111],group:'木材物流',layer:'treecover',body:'ハミナ・コトカ港は製材品など木材加工製品の輸出を扱い、鉄道・道路・海上輸送をつなぎます。Natural Earthのコトカ港代表点を表示し、埠頭の境界や森林の調達範囲は示しません。点の数・大きさは取扱量を表しません。',question:'樹木被覆・加工拠点・輸出港という異なる位置を読み比べます。',source:'https://www.haminakotka.com/services-and-price-list/wood-processing-industry',sourceLabel:'Port of HaminaKotka：Wood-processing industry',period:'2026-10-12参照'},
 {id:'rauma-pulp',name:'ラウマ・パルプ加工',field:'agriculture',country:'FIN',coordinates:[21.465131,61.1102011],group:'木材加工',layer:'treecover',body:'Metsä Fibreのラウマ工場は針葉樹パルプを製造し、隣接する製材工場のチップも原料に使います。点は運営会社が公開する来訪住所の位置で、森林の伐採地や調達範囲ではありません。',question:'加工拠点と樹木被覆の広がりを区別して読みます。',source:'https://www.metsagroup.com/metsafibre/about-metsafibre/pulp-production/rauma-pulp-mill/',sourceLabel:'Metsä Fibre：Rauma pulp mill・公開住所と地図',period:'2026-10-12参照'},
];
