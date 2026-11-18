/* 안내 도중에 게임을 껐다 켜면 다음 새 판에서 안내가 처음부터 다시 (DHL 11-18 A안) — tests/bots/tut.js */
const {done}=require('../lib.js'),T=require('../tut.js');
(async()=>{await T.partQuit();await done();})().catch(e=>{console.error(e);process.exit(1);});
