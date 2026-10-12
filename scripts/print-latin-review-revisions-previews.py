"""Bounded, SHA-verified PC artifact previews without rescaling or source retrieval."""
import base64,hashlib,json,os,sys
from pathlib import Path
root=Path(sys.argv[1]);topic=sys.argv[2]
assert topic in ['agriculture','forestry','climate','rivers','rainfall','terrain','elevation','population','ethnicity','religion']
for stage in ['before','after']:
 folder=root/stage
 if not (folder/'report.json').exists():continue
 report=json.loads((folder/'report.json').read_text())
 assert report['result'] in ['baseline-recorded','passed','failed']
 if stage=='after':assert report['commit']==os.environ['LATIN_REVIEW_EXPECTED_HEAD']
 shots=[s for s in report['shots'] if s['file'].startswith(topic+'-')]
 assert shots
 print('LATIN_REVIEW_TOPIC_REPORT '+json.dumps({**report,'shots':shots},ensure_ascii=False))
 for s in shots:
  data=(folder/s['preview']['file']).read_bytes()
  assert hashlib.sha256(data).hexdigest()==s['preview']['sha256']
  assert hashlib.sha256((folder/s['file']).read_bytes()).hexdigest()==s['sha256']
  encoded=base64.b64encode(data).decode('ascii')
  for i in range(0,len(encoded),48000):print('LATIN_REVIEW_PREVIEW '+json.dumps({'file':stage+'/'+s['preview']['file'],'part':i//48000,'total':(len(encoded)+47999)//48000,'base64':encoded[i:i+48000]}))
