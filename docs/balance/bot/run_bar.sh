#!/bin/bash
N=${N:-150}
run(){ tag=$1; shift; for b in smart normal; do env ARMOR=1 "$@" node sim.js knight $b $N > r_${tag}_$b.json; done; }
run capR GATE=cap &
run b10p GATE=bar BF=0.1 BMODE=prob &
wait
run b10r GATE=bar BF=0.1 BMODE=ratio &
run b30r GATE=bar BF=0.3 BMODE=ratio &
wait
run b60r GATE=bar BF=0.6 BMODE=ratio &
run b60p GATE=bar BF=0.6 BMODE=prob &
wait
run b100r GATE=bar BF=1.0 BMODE=ratio &
run b60r1 GATE=bar BF=0.6 BMODE=ratio PIER=0,0.33,0.67,1 &
wait
echo done
