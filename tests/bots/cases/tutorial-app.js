/* 견습 첫 판 안내: 1-1 → 3-3 졸업까지 순서대로 (약 6분) — tests/bots/tut.js */
const {done}=require('../lib.js'),T=require('../tut.js');
(async()=>{await T.partApp();await done();})().catch(e=>{console.error(e);process.exit(1);});
