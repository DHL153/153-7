# 니콜 안내 NPC (nicole-guide) — 상태

- **2026-11-03 게임 반영.** 첫 판 안내(견습 1~3장)의 니콜을 러스트 니콜 전투 리그(rust-fork-girl)에서 이 안내 NPC로 바꿈.
- 받은 묶음: `npc01_nicole_guide.zip` (DHL) — `preview/`(실행되는 리그) · `source/`(마스터·표정 12·몸짓 4·중간 그림 7) · `orders/`(제미나이 주문서) · `tools/`(누끼 → 표정 → 몸 보정 → 팔층 → 가중치, 검사) · `qa/`.
- 엔진은 받은 그대로: `preview/npc.js` = `mrstage/assets/rig/nicole-guide/npc.js` (NicoleRig = WebGL 메시 몸 + 표정 조각 + 팔 그림 바꿔 끼우기, NicoleAnim = 동작 시간표).

## 게임 파일 (mrstage/assets/rig/nicole-guide/)
| 파일 | 내용 |
|---|---|
| `npc.js` | 엔진 (수정 없음) |
| `guide.def.js` | 그림 37장(무손실 WebP data URI) + frames · faces · 메시 가중치. `build_def.py`로 다시 만듦, `?v=` = 내용 해시 |
| `guide.js` | 게임 연결: 그림 불러오기 · 2D 캔버스에 그리기 · 이펙트(미리보기 index.html의 그림 그대로, 크기만 니콜 키에 맞춤) |

## 게임에서 (index.html `lm-tut-js`)
- **등장:** 숨어 있다가 대사가 나오면 `appear` — 빛이 모이고(빛 기둥 + 빛가루) 작게 떠오르듯 나타나 콩 내려앉고(먼지 · 효과음 hop) 손 흔들며 웃음.
- **퇴장:** 말풍선을 누르거나 안내가 끝나면 `bye` — 손 흔들고 빛가루 · 꽃잎으로 사라짐(효과음 pop). 사라지는 중에 새 대사가 오면 다시 인사하며 돌아옴.
- **말하기:** 말풍선이 뜨면 글자 수만큼(1.1~3.8초) 표정에 맞는 입으로 말함(슬픔 · 걱정 = 울먹이는 입).
- **동작:** 대사마다 순서표 `NIC_ACTS` (인사 · 안내 · 기뻐요 · 슬퍼요 · 놀람 · 생각 · 걱정 · 흐뭇). 표에 없는 대사는 예전 face/seq 값으로 고름(`FACE_ACT` · `SEQ_ACT`).
- 이펙트는 화면 전체 캔버스 `#lmNicFx`(니콜 칸 밖으로 퍼져도 안 잘림), 그릴 것이 없으면 쉼. 움직임 줄이기 설정이면 이펙트 없음.
- WebGL을 못 쓰면 니콜 없이 말풍선만.
