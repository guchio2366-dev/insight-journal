"""Group retained BasinATLAS cells by real MAIN_BAS; do not reconstruct missing extent."""
from pathlib import Path
import gzip,hashlib,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];FOLDER=ROOT/'public/assets/atlas/europe/drainage-v1'
records=json.loads((FOLDER/'basins.json').read_text())
raw=(FOLDER/'values.bin.gz').read_bytes();grid=np.frombuffer(gzip.decompress(raw),dtype='<f4').reshape(1502,1800)
groups=[('rhine','ライン川',2040023010,'#92bbcf'),('danube','ドナウ川',2040008490,'#b6cda7'),('seine','セーヌ川',2040022150,'#c7bbd9'),('don','ドン川',2040006590,'#e0c998'),('volga','ヴォルガ川',2040068680,'#adcbd1')]
rgba=np.zeros((1502,1800,4),dtype='uint8');rgba[grid!=-1]=[232,234,228,255]
metadata=[]
for identifier,name,main,color in groups:
 units=[r for r in records if r['MAIN_BAS']==main];ids={r['HYBAS_ID'] for r in units};assert all(r['NEXT_DOWN']==0 or r['NEXT_DOWN'] in ids for r in units);mask=np.isin(grid,[r['index'] for r in units])
 rgba[mask]=[*bytes.fromhex(color[1:]),255]
 metadata.append({'id':identifier,'name':name,'mainBasin':main,'color':color,'unitIds':[r['HYBAS_ID'] for r in units],'displayPixels':int(mask.sum()),'coverage':'retained country-masked display cells only; not the complete natural basin'})
output=FOLDER/'main-basin-overview.png';Image.fromarray(rgba).save(output,optimize=True)
manifest={'source':'https://doi.org/10.6084/m9.figshare.9890531.v1','licence':'CC BY4.0 (BasinATLAS geometry/topology)','inputSha256':hashlib.sha256(raw).hexdigest(),'method':'Assign retained raster cells to five source MAIN_BAS identifiers; no smoothing or extension. Other model units neutral. Existing raw indices, selectable outlines and numeric lookup remain.','bounds':[-25,32,65,73],'width':1800,'height':1502,'groups':metadata,'unavailable':['Thames: existing level4 unit includes other British coastal catchments; must not rename it Thames','Ural: absent in existing country-masked display'],'imageSha256':hashlib.sha256(output.read_bytes()).hexdigest()}
(FOLDER/'main-basin-overview-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print([(g['id'],len(g['unitIds'])) for g in metadata])
