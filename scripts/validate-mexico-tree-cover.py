#!/usr/bin/env python3
"""Verify the Mexico tree-cover output against retained categorical source codes."""
from pathlib import Path
import json,gzip,hashlib,base64,zlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];P=ROOT/'public/assets/atlas/mexico-agriculture-v2';S=ROOT/'data-source/atlas/mexico/tree-cover-2021'
m=json.loads((P/'tree-cover-manifest.json').read_text());im=np.array(Image.open(P/'tree-cover-2021.png').convert('RGBA'));codes=np.frombuffer(gzip.decompress((S/'tree-cover-display-codes.bin.gz').read_bytes()),dtype=np.uint8).reshape(1160,1800)
assert im.shape==(1160,1800,4) and m['mapViewBox']=='0 0 900 580'
assert np.array_equal(im[:,:,3]>0,codes==10)
assert set(np.unique(im[:,:,3]))=={0,170}
assert np.all(im[codes==10,:3]==[57,113,65])
assert hashlib.sha256((P/'tree-cover-2021.png').read_bytes()).hexdigest()==m['sha256']
assert hashlib.sha256((S/'worldcover-overview-snapshot.json.gz').read_bytes()).hexdigest()==m['inputs']['sourceSnapshot']['sha256']
assert int((codes==10).sum())==m['coverage']['treeDisplayPixels']==171807
assert m['coverage']['missingDisplayPixels']==7 and m['coverage']['missingTileCounts']=={'N18W117':7}
assert m['extraction']['complete10mTilesDownloaded']==0 and m['extraction']['boundedAcquisitionBytes']==3547793
assert len(m['coverage']['stateCoverage'])==32
assert sum(s['treePixels'] for s in m['coverage']['stateCoverage'])==171807
snap=json.loads(gzip.decompress((S/'worldcover-overview-snapshot.json.gz').read_bytes()));assert len(snap['tiles'])==45
for t in snap['tiles']:
 header=base64.b64decode(t['prefixBase64']);block=base64.b64decode(t['overviewBase64']);assert len(header)==65536
 assert hashlib.sha256(header).hexdigest()==t['prefixSha256'] and hashlib.sha256(block).hexdigest()==t['overviewSha256']
 grid=np.frombuffer(zlib.decompress(block),dtype=np.uint8).reshape(1024,1024)[:562,:562]
 assert set(np.unique(grid))<={0,10,20,30,40,50,60,70,80,90,95,100}
assert m['source']['license']=='CC-BY-4.0' and m['source']['referenceYear']==2021
print('Mexico tree cover passed: 45 bounded source tiles, original range hashes, categorical class10/alpha, exact1800×1160 Lambert frame, 32 state balances and explicit7-pixel offshore missingness.')
