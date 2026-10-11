'use strict';
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function run(command,args){
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
if(process.platform!=='win32'){
  console.error('Release blocked: run the signed-release workflow on Windows for native GUI and Authenticode verification.');
  process.exit(1);
}
const win=require('../package.json').build.win;
const signingConfigured=!!(process.env.CSC_LINK||process.env.WIN_CSC_LINK||win.certificateSubjectName||win.certificateSha1||win.sign);
if(!signingConfigured){
  console.error('Release blocked: configure a code-signing certificate from a trusted provider or a signing service. Keep signing credentials outside source control and chat.');
  process.exit(1);
}
run(process.execPath,['scripts/check.cjs']);
run(process.execPath,['scripts/test.cjs']);
run(process.execPath,['tests/electron-smoke.cjs']);
run(process.execPath,[require.resolve('electron-builder/cli.js'),'--win','portable','--x64',
  '-c.forceCodeSigning=true','-c.win.signAndEditExecutable=true','-c.win.signDlls=true']);
run('powershell.exe',['-NoProfile','-File',path.join(__dirname,'verify-windows-signatures.ps1')]);

