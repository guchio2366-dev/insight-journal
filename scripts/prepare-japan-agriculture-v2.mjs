/** Offline preparation of verified representative-locality facts. No network or inferred field geometry. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {japanAgriculturePointCollection,japanAgricultureSources,japanAgricultureProducts,japanAgricultureSelectionCandidates,japanForestrySupply} from '../src/data/atlas/japan-agriculture-v2.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public/assets/atlas/japan-agriculture-v2');
await fs.mkdir(output,{recursive:true});
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const files=[];
for(const [name,value] of [['sites.geojson',japanAgriculturePointCollection()],['sources.json',japanAgricultureSources],['selection.json',japanAgricultureSelectionCandidates],['wood-balance-2024.json',japanForestrySupply]]){
 const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');
 await fs.writeFile(path.join(output,name),bytes);files.push({name,bytes:bytes.length,sha256:digest(bytes)});
}
const input='src/data/atlas/japan-agriculture-v2.ts',bytes=await fs.readFile(path.join(root,input));
const manifest={schemaVersion:1,prepared:'2026-10-10',region:'Japan',files,sourceInput:{path:input,sha256:digest(bytes)},products:japanAgricultureProducts.map(({id,title})=>({id,title})),method:'Editorial representative-locality anchors from verified public-source descriptions. EPSG:4326. No polygons, inferred agricultural extent, density, municipality statistics or production ranking. Quantity and extent remain null. Forestry quantities are the Forestry Agency 2024 roundwood-equivalent balance, independently transcribed from the cited public table.',acquisition:{municipalWorkbook:'blocked-proxy-403',treeCoverOverview:'blocked-proxy-403',newExternalServices:0},limitations:['Ten products are an editorial selection, not the statistical top ten.','Locality sources have different dates; no claim of same-year national distribution.','Municipal 2024 detailed workbook unavailable. Suppression/unknown values are never changed to zero.','No detailed tree-cover layer; regional basemap fill is not forest extent.','Wood import/export partner amounts unavailable; all-goods trade is never substituted.'],reproduce:'node scripts/prepare-japan-agriculture-v2.mjs'};
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({products:manifest.products.length,sites:japanAgriculturePointCollection().features.length,files}));
