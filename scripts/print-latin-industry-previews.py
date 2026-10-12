"""Deliver the bounded, unscaled own-work PC previews with hashes."""
import base64,hashlib,json,os,sys
from pathlib import Path
folder=Path(sys.argv[1]);report=json.loads((folder/'report.json').read_text())
assert report['commit']==os.environ['LATIN_REVIEW_EXPECTED_HEAD']
print('LATIN_INDUSTRY_REPORT '+json.dumps(report,ensure_ascii=False))
for s in report['shots']:
 data=(folder/s['preview']['file']).read_bytes()
 assert hashlib.sha256(data).hexdigest()==s['preview']['sha256']
 assert hashlib.sha256((folder/s['file']).read_bytes()).hexdigest()==s['sha256']
 encoded=base64.b64encode(data).decode('ascii')
 for i in range(0,len(encoded),48000):print('LATIN_INDUSTRY_PREVIEW '+json.dumps({'file':s['preview']['file'],'part':i//48000,'total':(len(encoded)+47999)//48000,'base64':encoded[i:i+48000]}))
