import {spawn} from 'node:child_process';

// Preserve the review's exit status and ordinary output, while making its
// failure readable in check annotations when log delivery is unavailable.
const args=process.argv.slice(2);
if(!args.length)throw new Error('A Node review script or --test arguments are required');
let tail='';
const child=spawn(process.execPath,args,{stdio:['inherit','pipe','pipe']});
for(const [stream,destination] of [[child.stdout,process.stdout],[child.stderr,process.stderr]])stream.on('data',chunk=>{
 destination.write(chunk);tail=(tail+chunk.toString()).slice(-14000);
});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('close',(code,signal)=>{
 if(code!==0){
  const message=(signal?`Signal ${signal}\n`:'')+tail;
  console.error('::error title=Browser review failure::'+message.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A'));
 }
 process.exitCode=code??1;
});
