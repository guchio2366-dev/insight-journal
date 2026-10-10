// Preserve compact, self-contained review evidence in the existing read-only
// Actions log as well as the artifact. No upload credentials or new permissions.
import {readFile,readdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory=path.resolve('review-artifacts/japan');
const files={};
for(const name of (await readdir(directory)).sort())if(/^[\w.-]+\.(json|jpg)$/.test(name))files[name]=(await readFile(path.join(directory,name))).toString('base64');
const packed=gzipSync(Buffer.from(JSON.stringify(files)));
console.log('JAPAN_REVIEW_SHA256 '+createHash('sha256').update(packed).digest('hex'));
const encoded=packed.toString('base64');
for(let i=0;i<encoded.length;i+=16384)console.log('JAPAN_REVIEW_CHUNK '+encoded.slice(i,i+16384));
console.log('JAPAN_REVIEW_END '+Object.keys(files).length);
