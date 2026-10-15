/** Node --import hook for opt-in browser E2E: keep Chromium's sandbox and XSS warnings. */
import {chromium} from 'playwright';
import {appendFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const launch=chromium.launch.bind(chromium);
chromium.launch=async(options={})=>{
 assert.notEqual(options.chromiumSandbox,false,'Browser QA must keep the Chromium sandbox enabled');
 assert.notEqual(options.ignoreDefaultArgs,true,'Browser QA retains the standard launch protections');
 const unsafe=/^--(?:no-sandbox|disable-setuid-sandbox|disable-gpu-sandbox|disable-seccomp-filter-sandbox|disable-namespace-sandbox|disable-web-security|ignore-certificate-errors)(?:=|$)/;
 assert.ok(!(options.args??[]).some(arg=>unsafe.test(arg)),'Browser QA must not disable security protections');
 const browser=await launch({...options,executablePath:options.executablePath??'/usr/bin/chromium',chromiumSandbox:true,
  env:{...process.env,...options.env,XDG_CONFIG_HOME:'/tmp/insight-chromium-config',XDG_CACHE_HOME:'/tmp/insight-chromium-cache'},
  ignoreDefaultArgs:[...(options.ignoreDefaultArgs??[]),'--unsafely-disable-devtools-self-xss-warnings']});
 const cdp=await browser.newBrowserCDPSession();
 const command=await cdp.send('Browser.getBrowserCommandLine');
 const prohibited=command.arguments.filter(arg=>unsafe.test(arg)||arg==='--unsafely-disable-devtools-self-xss-warnings');assert.deepEqual(prohibited,[]);await cdp.detach();
 await mkdir('/tmp/atlas-full-e2e',{recursive:true});
 await appendFile('/tmp/atlas-full-e2e/browser-launches.ndjson',JSON.stringify({testFile:process.argv[1],browser:browser.version(),chromiumSandbox:true,prohibitedArguments:prohibited})+'\n');
 return browser;
};
