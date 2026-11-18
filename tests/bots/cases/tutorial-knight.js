/* 기사 첫 판 안내: 머지 & 런 (약 2분) — tests/bots/tut.js */
const {done}=require('../lib.js'),T=require('../tut.js');
(async()=>{await T.partKnight();await done();})().catch(e=>{console.error(e);process.exit(1);});
