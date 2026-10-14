import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {verifyWestAsiaIndustry} from '../../scripts/verify-west-asia-industry.mjs';
test('西アジア21産業のPC・モバイル実画面、固定ラベル、欠測、主要操作', {skip:!process.env.CI,timeout:240000},async()=>{
 const executablePath=process.env.REVIEW_CHROME_PATH||execFileSync('sh',['-c','command -v google-chrome || command -v google-chrome-stable'],{encoding:'utf8'}).trim();
 await verifyWestAsiaIndustry({executablePath});
});
