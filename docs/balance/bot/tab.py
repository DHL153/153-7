import json,sys,glob
tags=sys.argv[1:]
print('tag      bot    clear  OTK%  close  | top10 kill/avg/otk | mid kill/avg/otk | bot25 kill/avg | brkShare zeroBrk brks')
for t in tags:
  for b in ['smart','normal']:
    try: d=json.load(open(f'r_{t}_{b}.json'))
    except Exception as e: print(t,b,'-');continue
    T=d['tiers'];f=lambda x:f"{x['kill']*100:3.0f}%/{x['avgRuns']:.2f}/{x['otk']*100:2.0f}%"
    print(f"{t:8} {b:6} {d['clear']*100:4.0f}% {d['firstRunWinShare']*100:4.0f}% {d['closeWinShare']*100:4.0f}% | {f(T['top10'])} | {f(T['mid'])} | {T['bot25']['kill']*100:3.0f}%/{T['bot25']['avgRuns']:.2f} | {T['all']['brkShare']:.2f} {T['all']['zeroBrkWin']:.2f} {T['all']['brks']:.2f}  cut{T['cut']}")
