# 점검 도구 (게임 실행에는 필요 없음)

리팩토링이나 큰 수정 뒤에 "아무것도 안 깨졌는지" 확인하는 도구 두 가지예요.

| 도구 | 확인하는 것 | 시간 |
|---|---|---|
| `node tests/rules-check.js` | 게임 규칙 계산(점수 · 목표 · 족보 · 구슬 · 상점)이 **완전히 같은지** — 고정 난수로 봇 판을 돌려 결과 지문 비교 | 약 35초 |
| `node tests/smoke.js` | 실제 화면에서 게임을 자동으로 진행하며 **오류 · 없는 파일(404) · 진행 막힘**이 없는지 | 약 3~4분 |

## 쓰는 법
```bash
# 1) 고치기 전에 규칙 기준 저장
node tests/rules-check.js --save /tmp/rules-base.json
# 2) 고친 뒤 비교 (다르면 실패)
node tests/rules-check.js --cmp /tmp/rules-base.json
# 3) 화면 점검
node tests/smoke.js
```
- 필요: Node.js 18+ · `playwright` (smoke.js만). 클라우드 세션에는 이미 있어요. 내 PC에서는 `npm i -g playwright && npx playwright install chromium`.
- 규칙을 **일부러** 바꾼 커밋이면 1)의 기준을 다시 저장하세요. (규칙 검사는 "바뀌었는지"만 알려 줌)
- smoke.js 환경값: `PLAYS`(런 몇 번까지, 기본 20) · `SECS`(최대 초, 기본 240) · `SHOT=폴더`(마지막 화면 저장) · `HEADED=1`(창 보이기)

## 버그 찾기 봇 (`tests/bots/`) — 2026-11-17 QA에서 버그 11건을 찾은 도구
위 두 도구가 "안 깨졌는지"를 본다면, 이쪽은 **사람이 안 해 볼 조작까지 해서 멈춤 · 엉뚱한 창을 찾아요.** 모두 진짜 마우스 클릭으로 누릅니다.

| 도구 | 하는 일 | 시간 |
|---|---|---|
| `node tests/bots/monkey.js` | **무작위 조작 봇** — 보이는 버튼 · 카드 · 구슬 · 탭을 아무거나 누름(덜 눌러 본 것 먼저). Esc · 키보드 · 더블클릭 · 5연타 · 우클릭 · 끌기 · 새로고침 · 창 크기 바꾸기를 섞음 | `SECS` (기본 540초) |
| `node tests/bots/full.js` | **완주 봇** — 점수만 올려 주고 진짜 클릭으로 엔딩 → 무한 원정까지 | 3~10분 |
| `node tests/bots/exhaust.js` | **카드 소진 행렬** — 난이도 × 거인 규칙 24종 × 얇은 덱으로 판이 끝(승리 · 패배)까지 가는지 | 약 15분 |
| `node tests/bots/run-cases.js` | **표적 테스트 모음** (`cases/`) — 메인 메뉴 나갔다 오기 · 연출 중 판 버리기 · 연타 · 더블클릭 · 새로고침 뒤 이어하기 · 낼 카드 0장 · 단축키 · **첫 실행 안내 따라가기**(`tutorial-*` — 견습 1-1 → 3-3 졸업 · 기사 첫 판 · 안내 건너뛰기 · 도중에 끄기, 대사 · 빛 · 잠금을 단계마다 확인) | 약 40분 |

| `node tests/bots/design.js <폴더>` | **디자인 일관성 점검** — 봇을 `DESIGN=<폴더>`로 돌려 모은 화면(사진 + 버튼 · 글자 · 판 모양)을 서로 비교해 '혼자 다른 것' 후보를 뽑음: 같은 이름인데 모양이 다른 버튼 · 키트 그림이 아닌 버튼 · 뒤로/닫기 종류 · 11px 미만 글자 · 잘린 글자 · 낮은 대비 · 늘어난 그림 · 작은 누름 칸 | 수집 20~40분 + 비교 1초 |

봇이 매번 보는 것: 스크립트 오류 · 없는 파일 · 숫자 아님(NaN) · 골드/런 음수 · 구슬 칸 초과 · 카드 중복 · 라운드 밖에 남은 봉인/뒷면 · **할 수 있는 일이 없는데 판이 안 끝남** · **누를 수 있는 것이 하나도 없음** · 120번 눌러도 화면이 안 바뀜 · 화면의 undefined/NaN 글자.

### 자주 쓰는 실행
```bash
# 판 안에 머무는 무작위 봇 5분 (이길 수 있게 좋은 패 · 점수 도움)
MODE=game SECS=300 ASSIST=.45 BOOST=.6 node tests/bots/monkey.js
# 메뉴 · 안내 창 · 컬렉션까지 돌아다니는 무작위 봇
SECS=300 node tests/bots/monkey.js
# 얇은 덱(5장 안팎)으로 카드 소진 길 / 첫 실행 안내 켠 채
MODE=game THIN=5 node tests/bots/monkey.js
MODE=game TUT=1 STORY=1 SPEED=2 node tests/bots/monkey.js
# 편력 8장부터 엔딩 · 무한 원정 3라운드
DIFF=errant JUMP=8 ENDR=3 node tests/bots/full.js
# 디자인 점검: 화면을 모은 뒤(게임 봇 · 메뉴 봇 · 완주 봇을 같은 폴더로) 비교 — 뽑힌 것은 후보라 사진(폴더 안 png)으로 확인
DESIGN=/tmp/lm-design MODE=game SECS=300 node tests/bots/monkey.js
DESIGN=/tmp/lm-design SECS=360 node tests/bots/monkey.js
DESIGN=/tmp/lm-design DIFF=knight JUMP=7 node tests/bots/full.js
node tests/bots/design.js /tmp/lm-design
# 표적 테스트 중 이름에 camp · fog가 든 것만
node tests/bots/run-cases.js camp fog
# 첫 실행 안내만 (대사마다 한 줄씩 보려면 V=1)
V=1 node tests/bots/cases/tutorial-app.js
```
- `SEED`를 바꾸면 다른 길로 갑니다. 발견이 있으면 `★`로 찍히고 종료 코드가 1이에요.
- 화면 사진 · 기록(`findings.json` — 발견 직전 조작 25개 포함)은 저장소 밖 임시 폴더(`OUT_DIR`, 기본 `/tmp/lm-bots`)에 쌓여요.
- **한 번에 하나씩** 돌리세요. 두 개를 같이 돌리면 서로 느려져 '막힘'으로 잘못 잡힐 수 있어요.
- 봇은 화면 그리기를 초당 15번으로 줄여 돌려요(`FPS=0`이면 끔). 연출 타이밍까지 보려면 끄고 돌리세요.
- 새 버그를 고치면 `cases/`에 그 재현을 한 파일로 넣어 두세요 (`lib.js`의 `boot · newRun · clickSel · killRound · cont · reload · rec` 사용).

