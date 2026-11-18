/* 안내 도중에 게임을 껐다 켜면 (지금 동작을 적어 두기만 함) — tests/bots/tut.js */
const {done}=require('../lib.js'),T=require('../tut.js');
(async()=>{await T.partQuit();await done();})().catch(e=>{console.error(e);process.exit(1);});
