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
