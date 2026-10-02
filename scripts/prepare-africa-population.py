"""Package Africa population density from the checked GHS equal-area aggregation.

Offline preparation only; requires NumPy and Pillow. Raw global sources stay private.
"""
from pathlib import Path
import argparse,gzip,json,platform,importlib.util
import numpy as np
from PIL import Image,__version__ as pillow_version
_spec=importlib.util.spec_from_file_location('africa_physical',Path(__file__).with_name('prepare-africa-physical.py'))
_physical=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_physical)
BOUNDS,WIDTH,HEIGHT,STEP=_physical.BOUNDS,_physical.WIDTH,_physical.HEIGHT,_physical.STEP
land_masks,sha,write=_physical.land_masks,_physical.sha,_physical.write
ROOT=Path(__file__).resolve().parents[1]
BREAKS=[1,10,100,500,2000,10000]
COLORS=['#f0f1e8','#dce8df','#b0d2cc','#7ab5bb','#438b9f','#28627f','#173b60']

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--density',type=Path,required=True)
    ap.add_argument('--output',type=Path,default=ROOT/'public/assets/atlas/africa-population-v1')
    args=ap.parse_args();meta=json.loads(args.density.read_text(encoding='utf8'))
    source=args.density.parent/meta['file'];countfile=args.density.parent/meta['countsFile']
    if meta['bounds']!=BOUNDS or meta['width']!=WIDTH or meta['height']!=HEIGHT or not meta['conserved'] or sha(source)!=meta['sha256'] or sha(countfile)!=meta['countsSha256']:raise ValueError('Checked population aggregation metadata mismatch')
    density=np.fromfile(source,dtype='<f4').reshape(HEIGHT,WIDTH)
    counts=np.fromfile(countfile,dtype='<u4').reshape(HEIGHT,WIDTH)
    boundary=ROOT/'src/data/atlas/africa-geography.json'
    land,countries=land_masks(json.loads(boundary.read_text(encoding='utf8')))
    density[~land]=-1
    if not np.isfinite(density).all() or (density[land]<-1).any():raise ValueError('Non-finite or unexpected population values')
    palette=np.array([[*bytes.fromhex(c[1:]),255] for c in COLORS],dtype=np.uint8)
    rgba=palette[np.searchsorted(BREAKS,density,side='right')];rgba[density<0]=0
    out=args.output;out.mkdir(parents=True,exist_ok=True)
    Image.fromarray(rgba).save(out/'population.png',optimize=True)
    (out/'population.values.gz').write_bytes(gzip.compress(density.tobytes(),mtime=0))
    reread=np.frombuffer(gzip.decompress((out/'population.values.gz').read_bytes()),dtype='<f4').reshape(HEIGHT,WIDTH)
    reps=[]
    for item in meta['representativeSpots']:
        row,col=item['displayRow'],item['displayCol'];masked=float(density[row,col])
        reps.append({**item,'maskedDisplayPersonsPerKm2':None if masked<0 else masked,'landAtDisplayCellCentre':bool(land[row,col]),'queryEqualsPngClass':bool(np.array_equal(rgba[row,col],np.array([0,0,0,0],dtype=np.uint8) if masked<0 else palette[np.searchsorted(BREAKS,masked,side='right')]))})
    checks={'float32GridExactRoundTrip':bool(np.array_equal(reread,density)),'imageEqualsQueryClasses':bool(np.array_equal(np.asarray(Image.open(out/'population.png')),rgba)),'missingIsTransparent':bool((rgba[density<0,3]==0).all()),'zeroPopulationPreserved':bool(((density==0)&land).any() and (reread[(density==0)&land]==0).all() and (rgba[(density==0)&land,3]==255).all()),'oceanMaskedUnavailable':bool((reread[~land]==-1).all()),'originalAreaMeanConservedBeforeLandMask':bool(meta['conserved']),'representativeMeans':all(p['meanCheck'] for p in reps),'representativeImageQueries':all(p['queryEqualsPngClass'] for p in reps)}
    if not all(checks.values()):raise ValueError('Population packaging consistency check failed')
    labels=['0–1人/km²','1–10人/km²','10–100人/km²','100–500人/km²','500–2,000人/km²','2,000–10,000人/km²','10,000人/km²以上']
    original=meta['source']
    layer={'image':'population.png','grid':'population.values.gz','encoding':'float32-le-gzip','noData':-1,'bounds':BOUNDS,'crs':'EPSG:4326','width':WIDTH,'height':HEIGHT,'resolutionDegrees':STEP,'gridOrder':'row-major north-to-south, west-to-east','unit':'persons/km²','period':'2020 population estimate; R2023A V1-0 release','sourceName':'GHS-POP E2020 R2023A 1km equal-area population','publisher':'European Commission Joint Research Centre','sourceUrl':original['sourceUrl'],'downloadUrl':original['downloadUrl'],'license':'CC BY 4.0','licenseUrl':original['licenseUrl'],'citation':'Schiavina, M.; Freire, S.; Carioli, A.; MacManus, K. (2023): GHS-POP R2023A – GHS population grid multitemporal (1975–2030). European Commission, JRC. DOI:10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE','sourceEdition':'R2023A V1-0','sourceResolutionMetres':1000,'sourceCrs':'ESRI:54009 Mollweide','sourceUnit':'persons per equal-area 1km² cell','sourceNoData':-200,'sourceSha256':original['sourceSha256'],'sourceBytes':original['sourceBytes'],'sourceArchiveSha256':original['archiveSha256'],'sourceArchiveBytes':original['archiveBytes'],'sourceRetrievedAt':original['retrievedAt'],'breaks':BREAKS,'colors':COLORS,'legend':[{'id':f'density-{i}','label':label,'color':COLORS[i]} for i,label in enumerate(labels)],'validPixels':int((density>=0).sum()),'positivePixels':int((density>0).sum()),'zeroPixels':int((density==0).sum()),'missingPixels':int((density<0).sum()),'method':meta['method']+' Apply the unchanged Africa country polygon mask at destination-cell centres. PNG colors and float32 query values use exactly the same masked array; zeros remain available and opaque, noData-1 is transparent.','queryMethod':'floor((lon-west)/0.1), floor((north-lat)/0.1); outside bounds or -1 returns unavailable'}
    manifest={'schemaVersion':1,'version':'1.0.0','bounds':BOUNDS,'crs':'EPSG:4326','width':WIDTH,'height':HEIGHT,'resolutionDegrees':STEP,'layers':{'population':layer},'boundary':{'file':boundary.relative_to(ROOT).as_posix(),'sha256':sha(boundary),'license':'Natural Earth public domain','method':'Even-odd cell-centre polygon mask, original supplied geometry unchanged'},'limitations':['2020 population is a census-informed spatial estimate, not a present-day census or a measured population at the clicked point.','0.1-degree output aggregates 1km equal-area source cells by their centres. Target cells have different geographic areas by latitude; density is source persons divided by the summed1km² area, not persons per latitude/longitude pixel.','Generalized country outlines and coarse display cells can omit very small islands and coastal settlements. Missing cells remain missing; no nearest-land or nearest-population filling.','A display value is a cell-area mean, not a city total or national total. Aggregation smooths dense urban cells and source cell centres approximate display-cell boundary overlaps.','GHS source zeros include water as well as unpopulated land; the Africa display land mask excludes offshore cell centres, while coarse coastal cells can still contain water.'], 'processing':{'decoderScript':'scripts/decode-africa-population.mjs','decoderSha256':sha(ROOT/'scripts/decode-africa-population.mjs'),'packagerScript':'scripts/prepare-africa-population.py','packagerSha256':sha(Path(__file__)),'landMaskScriptSha256':sha(Path(__file__).with_name('prepare-africa-physical.py')),'python':platform.python_version(),'numpy':np.__version__,'pillow':pillow_version,'unmaskedDensitySha256':meta['sha256'],'unmaskedCountsSha256':meta['countsSha256'],'mollweideRadiusMetres':6378137,'sourcePopulationSumBeforeMask':meta['inputSum'],'binnedPopulationSumBeforeMask':meta['binnedSum']},'representativeSpots':reps,'countryCoverage':{code:{'maskPixels':int(mask.sum()),'validPixels':int((mask&(density>=0)).sum()),'zeroPixels':int((mask&(density==0)).sum())} for code,mask in countries.items()},'checks':checks,'files':{p.name:{'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(out.iterdir()) if p.is_file() and p.name!='manifest.json'}}
    notice=args.density.parent.parent/'copyright.txt'
    if notice.exists():
        (out/'source-notice.txt').write_bytes(notice.read_bytes())
        layer['sourceNotice']='source-notice.txt'
        manifest['files']['source-notice.txt']={'bytes':notice.stat().st_size,'sha256':sha(notice)}
    manifest['processing']['reproduction']={'decoder':'node scripts/decode-africa-population.mjs --source <immutable-JRC-population.tif> --source-proof <private-cache>/source-provenance.json --out <private-cache>/derived --geotiff-package <GeoTIFF.js-package>','packager':'python scripts/prepare-africa-population.py --density <private-cache>/derived/africa-population-density.json','cachePolicy':'Original global ZIP/TIFF and pre-mask source aggregation stay private; final masked PNG/grid, source notice and provenance are shipped.'}
    write(out/'manifest.json',manifest)
    print(json.dumps({'output':str(out),'checks':checks,'validPixels':layer['validPixels'],'zeroPixels':layer['zeroPixels'],'maximumDensity':float(density.max()),'files':manifest['files'],'representativeSpots':reps},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
