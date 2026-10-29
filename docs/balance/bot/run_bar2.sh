#!/bin/bash
N=${N:-150}
run(){ tag=$1; shift; for b in smart normal; do env ARMOR=1 "$@" node sim.js knight $b $N > r_${tag}_$b.json; done; }
run b60rT16 GATE=bar BF=0.6 BMODE=ratio TMUL=1.6 &
run b60rT22 GATE=bar BF=0.6 BMODE=ratio TMUL=2.2 &
wait
run b60r1T22 GATE=bar BF=0.6 BMODE=ratio PIER=0,0.33,0.67,1 TMUL=2.2 &
run b30rT22 GATE=bar BF=0.3 BMODE=ratio TMUL=2.2 &
wait
echo done
