const {spawnSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=['test_after.js','test_dim_text.js','test_move_file.js','t5_offset.js','t7_fillet.js','t8_final.js','t10_nest.js','t13_all.js','t15.js','t17.js','t18.js','t19_area.js','t21_paste.js','t23_selectall.js','t24_guard.js','t25_snap_ortho.js','t27_dxf.js','t29.js'];
let failed=0;
for(const file of files){const r=spawnSync(process.execPath,[file],{cwd:root,encoding:'utf8'});const pass=r.status===0;console.log(`${pass?'PASS':'FAIL'} ${file}`);if(!pass){console.error(r.stdout,r.stderr);failed++;}}
const result=spawnSync(process.execPath,['tests/workspace.test.cjs'],{cwd:root,stdio:'inherit'});if(result.status!==0)failed++;
const workshop=spawnSync(process.execPath,['tests/panel-workshop.test.cjs'],{cwd:root,stdio:'inherit'});if(workshop.status!==0)failed++;
const audit=spawnSync(process.execPath,['tests/command-audit.test.cjs'],{cwd:root,stdio:'inherit'});if(audit.status!==0)failed++;
const panels=spawnSync(process.execPath,['tests/panel-model.test.cjs'],{cwd:root,stdio:'inherit'});if(panels.status!==0)failed++;
const compat=spawnSync(process.execPath,['tests/compat-export.test.cjs'],{cwd:root,stdio:'inherit'});if(compat.status!==0)failed++;
console.log(`${files.length} legacy regression files + workspace behavior suite; ${failed} failing suites.`);process.exitCode=failed?1:0;
