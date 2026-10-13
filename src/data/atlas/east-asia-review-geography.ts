/** Reference locations, not production magnitudes, factory footprints or
 * observations of a current's instantaneous path. Sources checked 2026-10-12. */
export const eastForestSites = [
 {id:'asahikawa',name:'旭川工場',point:[142.393581,43.777044] as [number,number],kind:'factory',country:'JPN',source:'https://www.nipponpapergroup.com/about/sales/asahikawa/',role:'北海道の製紙工場。公式所在地図の中心を案内点に使います。'},
 {id:'ishinomaki',name:'石巻工場',point:[141.293617,38.422427] as [number,number],kind:'factory',country:'JPN',source:'https://www.nipponpapergroup.com/about/sales/ishinomaki/',role:'宮城県の製紙工場。公式所在地図の中心で、工場敷地の輪郭ではありません。'},
 {id:'yatsushiro',name:'八代工場',point:[130.621911,32.504777] as [number,number],kind:'factory',country:'JPN',source:'https://www.nipponpapergroup.com/about/sales/yatsushiro/',role:'熊本県の製紙工場。公式所在地図の中心で、生産量は示しません。'},
 {id:'shimizu',name:'清水港',point:[138.509894,35.014444] as [number,number],kind:'port',country:'JPN',source:'https://www.portofshimizu.com/overview/%E5%9F%A0%E9%A0%AD/%E5%AF%8C%E5%A3%AB%E8%A6%8B%E5%9F%A0%E9%A0%AD/',role:'富士見埠頭は木材チップを取り扱い、専用荷役機械を備えます。点はNatural Earthの港の位置で、埠頭の正確な輪郭や取扱量ではありません。'},
 {id:'changshu',name:'常熟・製紙',point:[120.8,31.7] as [number,number],kind:'factory',country:'CHN',source:'https://www.upmspecialtymaterials.com/about-upm-specialty-materials/',role:'UPMの製紙工場は長江沿いの常熟港近くと公式に案内されています。小数1桁の地域参照点で、厳密な工場座標・敷地外形ではありません。'},
] as const;
export const eastOceanNames = [
 {id:'kuroshio',name:'黒潮',point:[138,30] as [number,number],source:'https://www.data.jma.go.jp/kaiyou/data/db/kaikyo/knowledge/kuroshio.html',meaning:'東シナ海からトカラ海峡を通り、日本南岸を経て房総半島沖へ向かう暖流。流路は変動します。'},
 {id:'oyashio',name:'親潮',point:[145,42] as [number,number],source:'https://www.data.jma.go.jp/kaiyou/data/db/hakodate/knowledge/oyashio.html',meaning:'千島列島沿いから日本の東へ南下する寒流。南への張り出しは季節で変わります。'},
 {id:'tsushima',name:'対馬暖流',point:[135,38] as [number,number],source:'https://www.data.jma.go.jp/kaiyou/data/db/maizuru/knowledge/tsushima_current.html',meaning:'対馬海峡から日本海へ入り、津軽・宗谷海峡を経て出る暖流。分枝や流路は変動します。'},
 {id:'winter-monsoon',name:'北西季節風',point:[123,43] as [number,number],source:'https://www.jma.go.jp/jma/kishou/know/kisetsu_riyou/tenkou/gaisetu.html',meaning:'日本付近の冬の季節風。シベリア高気圧とアリューシャン低気圧の配置に対応し、日本海側の雪と太平洋側の乾燥に関わります。'},
] as const;
