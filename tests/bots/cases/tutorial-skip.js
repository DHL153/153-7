/* 안내 건너뛰기: 1-1 전투 중 · 첫 라운드 고르기 · 기사 첫 판 — tests/bots/tut.js */
const {done}=require('../lib.js'),T=require('../tut.js');
(async()=>{await T.partSkip();await done();})().catch(e=>{console.error(e);process.exit(1);});
