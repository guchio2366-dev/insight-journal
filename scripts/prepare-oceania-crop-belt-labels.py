"""Select crop-label anchors from saved regional concentrations, offline.
Only annotation positions/diagnostics change; source values and images do not.
"""
from pathlib import Path
import gzip, hashlib, importlib.util, json, math
import numpy as np
import scipy
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/atlas/oceania-crops-v1'
manifest = json.loads((SOURCE / 'manifest.json').read_text())
geography_path = ROOT / 'src/data/atlas/oceania-countries.json'
geography = json.loads(geography_path.read_text())
spec = importlib.util.spec_from_file_location('saved_crop_masks', ROOT / 'scripts/prepare-oceania-crops.py')
source_masks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source_masks)
assert [source_masks.WIDTH, source_masks.HEIGHT] == [manifest['display']['width'], manifest['display']['height']]
# Previously adopted geographic reading areas; these windows are neither
# publication boundaries nor new major-country/small-item inclusion rules.
targets = [
 ('wheat-southeast','wheat','AUS','豪州南東部',[138,-39,152,-29],[420,717]),
 ('wheat-nz','wheat','NZL','NZ南島',[166,-48,174.5,-41.3],[738,826]),
 ('coconut-png-islands','coconut','PNG','PNG島嶼部',None,[484,366]),
 ('cacao-solomon-west','cacao','SLB','ソロモン西部',[155,-9.4,158.8,-6],[560,393]),
]
WINDOW = 13
RADIUS = WINDOW // 2

def digest(path):
 return hashlib.sha256(path.read_bytes()).hexdigest()

def bounds(mask,xs,ys,step):
 rows,cols = np.where(mask)
 return [float(xs[cols.min()]-step/2),float(ys[rows.max()]-step/2),float(xs[cols.max()]+step/2),float(ys[rows.min()]+step/2)]

def neighbourhood(col,row,values,domain,component,areas):
 box = np.s_[max(0,row-RADIUS):row+RADIUS+1,max(0,col-RADIUS):col+RADIUS+1]
 local,region,group = values[box],domain[box],component[box]
 footprint = float(np.broadcast_to(areas[:,None],values.shape)[box][group].sum())
 harvested = float(local[group].astype(np.float64).sum())
 return {'windowCells':WINDOW*WINDOW,'positiveRegionCells':int((region&(local>0)).sum()),
         'validZeroRegionCells':int((region&(local==0)).sum()),'missingRegionCells':int((region&(local<0)).sum()),
         'primaryComponentCells':int(group.sum()),'primaryComponentHarvestedHa':harvested,
         'allRegionHarvestedHa':float(local[region&(local>0)].astype(np.float64).sum()),
         'primaryPositiveGridFootprintKm2':footprint,'harvestedHaPerPositiveGridKm2':harvested/footprint if footprint else 0}

def cell_runs(mask):
 runs=[]
 for row in np.flatnonzero(mask.any(axis=1)):
  columns=np.flatnonzero(mask[row]);start=previous=int(columns[0])
  for value in columns[1:]:
   col=int(value)
   if col!=previous+1:runs.append([int(row),start,previous+1]);start=col
   previous=col
  runs.append([int(row),start,previous+1])
 return runs

places,evidence = [],[]
for identifier,crop,country,name,reading_bounds,old_cell in targets:
 layer = next(item for item in manifest['layers'] if item['id']==crop)
 path = SOURCE/layer['grid'];source_hash = digest(path)
 assert source_hash==manifest['files'][layer['grid']]['sha256']
 values = np.frombuffer(gzip.decompress(path.read_bytes()),dtype='<f4').reshape(layer['height'],layer['width'])
 tags = layer['nativeGeoTiffTags'];step = tags['pixelScale'][0]
 native_columns = np.concatenate([np.arange(start,end) for start,end in manifest['display']['sourceColumnSpans']])
 native_rows = np.arange(*manifest['display']['sourceRowRange'])
 xs = tags['modelTiepoint'][3]+(native_columns+.5)*step;xs[xs<110]+=360
 ys = tags['modelTiepoint'][4]-(native_rows+.5)*step
 feature = next(item for item in geography['features'] if item['properties']['code']==country)
 domain = source_masks.country_masks({'features':[feature]},step,tags['modelTiepoint'][4])[country]
 definition = 'Native cell centres inside the saved country outline and stated geographic reading window.'
 if reading_bounds:
  west,south,east,north = reading_bounds
  domain &= (xs[None,:]>=west)&(xs[None,:]<=east)&(ys[:,None]>=south)&(ys[:,None]<=north)
 else:
  geom=feature['geometry'];polygons=geom['coordinates'] if geom['type']=='MultiPolygon' else [geom['coordinates']]
  parts=[]
  for polygon in polygons:
   part=source_masks.ring_mask(polygon[0],xs,ys)
   for hole in polygon[1:]:part &= ~source_masks.ring_mask(hole,xs,ys)
   parts.append(part)
  domain &= ~max(parts,key=lambda part:part.sum())
  definition='PNG country mask excluding its largest land polygon (New Guinea mainland); all remaining saved island parts are eligible.'
 # Spherical grid footprint, not actual cropped/farm area.
 areas=6371.0088**2*math.radians(step)*(np.sin(np.radians(ys+step/2))-np.sin(np.radians(ys-step/2)))
 positive=domain&(values>0)
 labels,count=ndimage.label(positive,structure=ndimage.generate_binary_structure(2,1))
 counts=np.bincount(labels.ravel());totals=np.bincount(labels.ravel(),weights=np.where(positive,values,0).ravel());totals[0]=0
 ranked=sorted(range(1,count+1),key=lambda group:(-totals[group],group));primary_id=ranked[0];primary=labels==primary_id
 rows,cols=np.where(primary);weights=values[primary].astype(np.float64)
 centroid=[float(np.average(cols,weights=weights)),float(np.average(rows,weights=weights))]
 rolling=ndimage.uniform_filter(np.where(primary,values,0).astype(np.float64),size=WINDOW,mode='constant')*WINDOW**2
 peak=float(rolling[primary].max())
 # Floating-point tie tolerance only, never a crop inclusion threshold.
 ties=primary&np.isclose(rolling,peak,rtol=1e-12,atol=1e-6);tr,tc=np.where(ties)
 nearest=int(np.argmin((tc-centroid[0])**2+(tr-centroid[1])**2));col,row=int(tc[nearest]),int(tr[nearest])
 assert primary[row,col] and values[row,col]>0
 coordinates=[float(xs[col]),float(ys[row])];local=neighbourhood(col,row,values,domain,primary,areas)
 old_col,old_row=old_cell;old_local=neighbourhood(old_col,old_row,values,domain,primary,areas);old_group=int(labels[old_row,old_col])
 top=[];total=float(totals.sum())
 for group in ranked[:3]:
  group_mask=labels==group;footprint=float(np.broadcast_to(areas[:,None],values.shape)[group_mask].sum())
  top.append({'positiveCells':int(counts[group]),'harvestedHa':float(totals[group]),'shareOfReadingRegionHa':float(totals[group]/total),
              'positiveGridFootprintKm2':footprint,'harvestedHaPerPositiveGridKm2':float(totals[group]/footprint),'bounds':bounds(group_mask,xs,ys,step)})
 eight,_=ndimage.label(positive,structure=ndimage.generate_binary_structure(2,2));eight_group=eight==eight[row,col]
 bbox=top[0]['bounds'];scales=[{'mapWidthCssPx':width,'componentBoundingWidthCssPx':(bbox[2]-bbox[0])/140*1200*width/1100,
                             'componentBoundingHeightCssPx':(bbox[3]-bbox[1])/83*757*width/1100} for width in [520,900]]
 selection={'id':identifier,'readingRegion':{'country':country,'bounds':reading_bounds,'definition':definition},
            'regionPositiveCells':int(positive.sum()),'regionHarvestedHa':total,'fourNeighbourComponentCount':count,
            'regionPositiveCellRuns':cell_runs(positive),'primaryComponentCellRuns':cell_runs(primary),
            'topComponentsByHarvestedHa':top,'primaryHarvestWeightedCentroidCell':centroid,
            'selectedCell':[col,row],'selectedCoordinates':coordinates,'selectedCellHa':float(values[row,col]),
            'selectedNeighbourhood':local,'maximumPrimaryNeighbourhoodHa':peak,
            'eightNeighbourSensitivity':{'containingGroupCells':int(eight_group.sum()),'harvestedHa':float(values[eight_group].astype(np.float64).sum())},
            'previousAnchor':{'cell':old_cell,'cellHa':float(values[old_row,old_col]),'insidePrimaryComponent':bool(primary[old_row,old_col]),
                              'componentRankByHa':ranked.index(old_group)+1 if old_group else None,
                              'componentCells':int(counts[old_group]) if old_group else 0,'componentHa':float(totals[old_group]) if old_group else 0,
                              'neighbourhood':old_local,'fractionOfPeakPrimaryNeighbourhoodHa':old_local['primaryComponentHarvestedHa']/local['primaryComponentHarvestedHa']},
            'mapScaleDiagnostics':scales,'sourceGrid':str(path.relative_to(ROOT)),'sourceGridSha256':source_hash}
 evidence.append(selection)
 places.append({'id':identifier,'product':crop,'country':country,'name':name,'coordinates':coordinates,'offset':[0,-26],
                'displayCell':[col,row],'nativeSourceCell':[int(native_columns[col]),int(native_rows[row])],'sourceCellHa':float(values[row,col]),
                'sourceGrid':str(path.relative_to(ROOT)),'sourceGridSha256':source_hash,
                'selection':{'primaryComponentCells':top[0]['positiveCells'],'primaryComponentHa':top[0]['harvestedHa'],'regionHaShare':top[0]['shareOfReadingRegionHa'],
                             'neighbourhoodPrimaryCells':local['primaryComponentCells'],'neighbourhoodPrimaryHa':local['primaryComponentHarvestedHa']}})
 print(identifier,[col,row],'component',top[0]['positiveCells'],'cells',round(top[0]['harvestedHa'],1),'ha; local',round(local['primaryComponentHarvestedHa'],1),'ha')
method='Within each already adopted geographic reading area, use 4-neighbour connected positive native cells; choose the group with most model harvested hectares, then a positive cell at the maximum 13×13-cell group-ha neighbourhood. Numerically tied maxima choose the cell nearest the harvest-weighted group centroid. No underlying value, source image or publication inclusion threshold changes.'
output={'year':2020,'unit':'harvested ha/native 5 arc-minute source cell','source':manifest['source']['catalogUrl'],'license':manifest['source']['license'],
        'method':method,'selectionEvidence':'docs/oceania-crop-belt-selection-20261013.json','places':places}
(ROOT/'src/data/atlas/oceania-crop-belt-labels.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
report={'year':2020,'method':method,'geometrySha256':digest(geography_path),'sourceCitation':manifest['source']['citation'],
        'requiredAdaptationAttribution':manifest['source']['adaptationAttribution']['requiredText'],'license':manifest['source']['license'],
        'componentConnectivity':'Edge-sharing positive native cells; no bridge across zero, missing, sea or the reading-area boundary.',
        'neighbourhood':'13×13 native cells = about 1.083° × 1.083°; group-only ha defines the selection score.',
        'footprintDefinition':'Spherical native-cell footprint in km², not measured farm/cropped area. Harvested hectares can count repeated harvests. Shares are model reading-region diagnostics, not official national statistics.',
        'reproduction':{'script':'scripts/prepare-oceania-crop-belt-labels.py','numpy':np.__version__,'scipy':scipy.__version__},'selections':evidence}
(ROOT/'docs/oceania-crop-belt-selection-20261013.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
