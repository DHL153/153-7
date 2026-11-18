/* 표적 테스트 모음 — tests/bots/cases/ 의 파일을 차례로 돌려 ✅/❌ 만 모아 보여 줌
   사용: node tests/bots/run-cases.js            전부 (약 25분)
         node tests/bots/run-cases.js camp fog   이름에 그 글자가 든 것만 */
const {spawnSync}=require('child_process'),fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'cases'),want=process.argv.slice(2);
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js')&&(!want.length||want.some(w=>f.includes(w)))).sort();
let ok=0,bad=0;const t0=Date.now();
for(const f of files){console.log('== '+f.replace('.js',''));
  const r=spawnSync(process.execPath,[path.join(dir,f)],{encoding:'utf8',timeout:600000,env:process.env});
  const lines=((r.stdout||'')+(r.stderr||'')).split('\n').filter(l=>/^[✅❌]/.test(l)||/Error|오류:/.test(l));
  lines.forEach(l=>{console.log(l.slice(0,240));if(l.startsWith('✅'))ok++;else if(l.startsWith('❌'))bad++;});
  if(r.error||(r.status&&!lines.some(l=>l.startsWith('❌')))){bad++;console.log('❌ '+f+' 가 끝까지 못 돌았어요 '+(r.error?r.error.message:'(종료 코드 '+r.status+')'));}}
console.log(`\n표적 테스트: 통과 ${ok} · 실패 ${bad} · ${((Date.now()-t0)/1000|0)}초  결과: ${bad?'실패 ❌':'통과 ✅'}`);
process.exitCode=bad?1:0;
