#!/bin/bash
# usage: batch.sh TAG N "ENV..."  → r_TAG_{smart,normal}.json (기사)
tag=$1; n=$2; shift 2
for b in smart normal; do env ARMOR=1 "$@" node sim.js ${DIFF:-knight} $b $n > r_${tag}_$b.json & done; wait
