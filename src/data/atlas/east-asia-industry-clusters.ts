import type {IndustryTopic} from './asia-industry';
export const eastIndustries=[
 {id:'auto',label:'自動車',color:'#a65b3b',lead:'中国の沿海部と長江沿い、日本の中京・北部九州、韓国の蔚山などに生産拠点が集まります。',reason:'完成車工場の周りに部品企業が集まり、頻繁な納入を支えます。大きな市場、熟練した人材、港と道路・鉄道が生産と販売を結びます。',source:'https://global.toyota/en/company/profile/facilities/manufacturing-worldwide/japan.html'},
 {id:'chips',label:'半導体・電子',color:'#795a9d',lead:'台湾の新竹・台南、韓国の平沢・清州、中国の上海、日本の九州などに製造・研究開発の拠点があります。',reason:'研究開発人材と部品・材料・装置の企業が近くに集まり、工程の改良を支えます。製造には安定した電力と大量の高純度の水が必要です。設計、ウエハー製造、組立・検査は別の工程です。',source:'https://www.tsmc.com/english/aboutTSMC/TSMC_Fabs'},
 {id:'steel',label:'鉄鋼',color:'#557e8e',lead:'中国の河北・沿海部、日本の臨海工業地帯、韓国の浦項、台湾の高雄などが代表的な立地です。',reason:'高炉を使う製鉄では鉄鉱石・原料炭を大量に運ぶため、港と大規模な用地が重要です。鉄鋼を使う機械・造船・建設の需要、鉄道や水運も立地を支えます。電気炉は鉄スクラップと電力の条件が関わります。',source:'https://globalenergymonitor.org/projects/global-iron-steel-tracker/'},
 {id:'batteries',label:'電池',color:'#78843d',lead:'中国の寧徳・長江デルタ、韓国の清州周辺、日本の関西などに電池製造の拠点があります。',reason:'セル（電池の基本単位）製造は正極・負極などの材料、製造装置、車両メーカーとの連携で成り立ちます。企業本社の所在と工場の所在は別で、韓国・日本企業の海外工場も国内立地と区別します。',source:'https://www.iea.org/reports/global-ev-outlook-2025/electric-vehicle-batteries'},
 {id:'ships',label:'造船',color:'#318b80',lead:'中国の長江河口・舟山、韓国の蔚山・巨済、日本の瀬戸内・長崎などの海岸に造船所が立地します。',reason:'大型船を建造し進水させるため、深い水域に面した広い敷地が必要です。鋼材・舶用機械の供給と熟練した作業者が周辺に集まり、港湾を通じて世界の船主に届けます。',source:'https://unctad.org/system/files/official-document/rmt2025ch2_en.pdf'},
 {id:'chemicals',label:'石油化学',color:'#bd8530',lead:'中国の上海・南京、日本の四日市、韓国の蔚山などに化学工業の拠点があります。',reason:'港は原油・原料の大量輸送に適し、コンビナートでは隣り合う工場が原料や蒸気を融通します。中国の南京は河川沿いの工業用地と市場への接続を持ちます。石油精製と化学製品の製造は関連しますが別の工程です。',source:'https://www.basf.com/cn/en/who-we-are/organization/key-production-sites/jiangsu'},
] as const;
export type EastIndustryId=typeof eastIndustries[number]['id'];
export type EastCluster={id:string;name:string;country:string;point:[number,number];industries:EastIndustryId[];source:string;sources?:string[]};
// City-scale examples, not factory footprints or proportional quantities.
export const eastClusters:EastCluster[]=[
 {id:'toyota',name:'豊田・中京',country:'JPN',point:[137.15,35.08],industries:['auto'],source:eastIndustries[0].source},
 {id:'kitakyushu',name:'北九州',country:'JPN',point:[130.85,33.88],industries:['steel'],source:'https://www.nipponsteel.com/works/kyushu/'},
 {id:'kumamoto',name:'熊本',country:'JPN',point:[130.83,32.87],industries:['chips'],source:'https://www.tsmc.com/english/aboutTSMC/TSMC_Fabs'},
 {id:'osaka',name:'大阪・関西',country:'JPN',point:[135.50,34.69],industries:['batteries'],source:'https://www.panasonic.com/global/energy/company/global-network.html'},
 {id:'imabari',name:'今治・瀬戸内',country:'JPN',point:[133.00,34.07],industries:['ships'],source:'https://www.imazo.co.jp/'},
 {id:'nagasaki',name:'長崎',country:'JPN',point:[129.87,32.75],industries:['ships'],source:'https://www.mhi.com/company/location/nagasakiw'},
 {id:'yokkaichi',name:'四日市',country:'JPN',point:[136.62,34.97],industries:['chemicals'],source:'https://www.chemiway.co.jp/en/company/yokkaichi.html'},
 {id:'shanghai',name:'上海',country:'CHN',point:[121.47,31.23],industries:['auto','chips','chemicals'],sources:['https://www.lingang.gov.cn/html/website/lg/English/Investment/Companies/c1795283222837358594.html',eastIndustries[1].source],source:'https://www.basf.com/cn/en/who-we-are/organization/key-production-sites'},
 {id:'guangzhou',name:'広州',country:'CHN',point:[113.27,23.13],industries:['auto'],source:'https://global.toyota/en/company/profile/facilities/manufacturing-worldwide/asia.html'},
 {id:'wuhan',name:'武漢',country:'CHN',point:[114.30,30.59],industries:['auto'],source:'https://global.honda/en/newsroom/news/2024/c241011eng.html'},
 {id:'tangshan',name:'唐山・河北',country:'CHN',point:[118.18,39.63],industries:['steel'],source:eastIndustries[2].source},
 {id:'ningde',name:'寧徳',country:'CHN',point:[119.55,26.67],industries:['batteries'],source:'https://www.catl.com/en/about/profile/'},
 {id:'changzhou',name:'溧陽・常州',country:'CHN',point:[119.48,31.42],industries:['batteries'],source:'https://www.catl.com/en/about/profile/'},
 {id:'zhoushan',name:'舟山',country:'CHN',point:[122.21,29.99],industries:['ships'],source:'https://www.lr.org/en/shipyards/china/cosco-zhoushan-shipyard-co-ltd/'},
 {id:'nanjing',name:'南京',country:'CHN',point:[118.80,32.06],industries:['chemicals'],source:eastIndustries[5].source},
 {id:'pyeongtaek',name:'平沢',country:'KOR',point:[127.05,37.04],industries:['chips'],source:'https://semiconductor.samsung.com/foundry/manufacturing/manufacturing-sites/'},
 {id:'cheongju',name:'清州',country:'KOR',point:[127.49,36.64],industries:['chips','batteries'],sources:['https://news.lgensol.com/company-news/supplementary-stories/1741/'],source:'https://news.skhynix.com/en/sk-hynix-to-produce-dram-from-m15x-in-cheongju/'},
 {id:'ulsan',name:'蔚山',country:'KOR',point:[129.31,35.54],industries:['auto','ships','chemicals'],sources:['https://hd-hhi.com/en/business/shipbuilding','https://english.motir.go.kr/eng/article/EATCLffca659a6/2678/view'],source:'https://www.hyundai.com/worldwide/en/onepage/country'},
 {id:'pohang',name:'浦項',country:'KOR',point:[129.34,36.02],industries:['steel'],source:'https://www.posco.co.kr/homepage/docs/eng7/jsp/common/posco/s91a1000012c.jsp'},
 {id:'geoje',name:'巨済',country:'KOR',point:[128.62,34.88],industries:['ships'],source:'https://www.hanwhaocean.com/en/whoweare/ig/ship/'},
 {id:'hsinchu',name:'新竹',country:'TWN',point:[121.01,24.78],industries:['chips'],source:eastIndustries[1].source},
 {id:'tainan',name:'台南',country:'TWN',point:[120.27,23.10],industries:['chips'],source:eastIndustries[1].source},
 {id:'kaohsiung',name:'高雄',country:'TWN',point:[120.30,22.63],industries:['steel'],source:'https://www.csc.com.tw/csc_e/wb/contact.html'},
];
export const eastClusterTopics:IndustryTopic[]=[{id:'east-clusters',title:'主要産業の集積',parent:'製造業',kind:'clusters',unit:'代表的な都市・工業地域',year:'資料別',source:eastIndustries[1].source,note:'位置と産業の種類を示す概略図。記号の大きさは生産量を表しません。'},...eastIndustries.map(i=>({id:'east-'+i.id,title:i.label,parent:'製造業',kind:'clusters' as const,unit:'代表的な都市・工業地域',year:'資料別',source:i.source,note:i.reason}))];
