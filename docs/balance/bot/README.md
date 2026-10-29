# 라만차 밸런스 봇

`index.html`의 게임 코어(족보 · 점수 · 목표 · 맞춤 · 구슬 · 상점 규칙)를 그대로 가져와, 화면 없이 수백 판을 돌리는 봇이에요. 관문(방패 · 강인도) 실험용으로 만들었어요(2026-10-29). 설계 결과는 [`../toughness-balance.md`](../toughness-balance.md).

> 게임 실행에는 필요 없는 개발 도구예요. exe로 묶을 때는 `docs/` 폴더를 빼도 됩니다.

## 만들기
```bash
cd docs/balance/bot
python3 build.py            # ../../../index.html에서 코어 스크립트를 뽑아 sim_body.js와 합쳐 sim.js 생성
```
`index.html` 구조가 바뀌어 코어 블록(`function score(` + `function handType`)을 못 찾으면 오류로 알려 줘요.

## 실행
```bash
ARMOR=1 GATE=cap node sim.js knight smart 200          # 지금 규칙(55% 방패 + 3개 관통)
./batch.sh capR 300 GATE=cap                           # 숙련 · 보통 봇을 같이 → r_capR_smart.json, r_capR_normal.json
python3 tab.py capR none F1c                           # 요약 표
```
- 인자: `<난이도 app|knight|errant> <봇 smart|normal> <판 수> [무한 원정 0|1]`
  - smart = 숙련자(맞춤 가치 계산 · 상점을 잘 씀), normal = 보통(그때그때 최대 피해만).
- `ARMOR=1`은 꼭 붙이기 (맞춤 규칙 켜기).

| 환경값 | 뜻 | 기본 |
|---|---|---|
| `GATE` | `none` 상한 없음 · `cap` 지금 관통 · `tough` 강인도 | `cap` |
| `HITF` | 한 번 최대 피해 (적 체력 대비) | `0.55` |
| `TGH` | 강인도 졸개,기사,거인 | `3,4,5` |
| `PRE` | 브레이크 전: `cap`(HITF 상한) 또는 배율(예 `0.5`) | `0.5` |
| `BRK` | `now` 깨는 런부터 상한 없음 · `next` 다음 런부터 | `next` |
| `GROG` · `GN` | 그로기 배율 · 런 수 | `1.5` · `1` |
| `REG` | 재브레이크마다 강인도 + | `1` |
| `KV` | 숙련 봇이 맞춤 1개에 주는 가치(목표 대비) | `0.08` |
| `TMUL` | 모든 목표(체력) 배수 | `1` |
| `DIFF` | `batch.sh`의 난이도 | `knight` |

**추천안 F1c:** `GATE=tough PRE=cap HITF=0.35 BRK=now TGH=3,4,5 GROG=1.5 GN=1 REG=1`

## 출력 (JSON)
- `clear` 게임 클리어율, `firstRunWinShare` 첫 런 처치, `closeWinShare` 아슬아슬 승리(목표 ×1.25 미만)
- `tiers`
  - 빌드 등급별 결과: `top10` · `mid` · `bot25`. 등급은 라운드 첫 런 원시 피해 ÷ 적 체력으로 나눠요.
  - 등급마다 `kill` 처치율, `avgRuns` 평균 처치 런, `otk` 첫 런 처치, `brkShare` 브레이크 구간 피해 비중, `zeroBrkWin` 브레이크 없이 이긴 비율이 나와요.
  - `byRd`는 같은 등급 결과를 졸개 · 기사 · 거인별로 나눈 거예요.
- `bestByJang`, `topOrbs`, `htWinRun` 등 장별 · 구슬 · 족보 통계

## 한계
- 봇의 판단(상점 · 버리기 · 머지)은 단순한 규칙이라 사람과 달라요. 절대값보다 **안끼리 비교**로 보세요.
- 거인 규칙 반격 · 갑옷 회복 · 약점 바꾸기는 본체 `doPlay`의 처리를 옮겨 왔어요. 화면 쪽 규칙이 바뀌면 `sim_body.js`의 `playRound`도 같이 고쳐야 해요.
