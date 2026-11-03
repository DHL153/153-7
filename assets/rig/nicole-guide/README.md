# 니콜 안내 NPC (튜토리얼 가이드) — 넘겨받는 분께

원판 니콜(쇠스랑 소녀)을 하얀 원피스로 꾸민 온보딩 안내 캐릭터예요. 전신, 화면 왼쪽에 서서 오른쪽(대사창)을 향하는 배치.

## 바로 보기
`preview/` 폴더에서 `python3 -m http.server 8000` → 브라우저로 http://localhost:8000
(파일을 더블클릭으로 열면 이미지 로드가 막혀요. 꼭 로컬 서버로.)

- 버튼: 등장 E · 퇴장 Q · 튜토리얼 데모 D · 인사1 안내2 기뻐요3 슬퍼요4 놀람5 생각6 걱정7 흐뭇8 · 말하기 T · 느리게 · 이펙트 ON/OFF
- 니콜을 누르면 기뻐하거나 인사해요. 말풍선·글자는 없어요(게임 UI 몫).

## 게임에서 쓰는 법 (API, `preview/npc.js`)
```js
const rig = new NicoleRig(glCanvas, {img, frames, faces, weights: window.NICOLE_W});
const an  = new NicoleAnim(frames, {kp:{}, anchors:[]});
// 매 프레임
const o = an.update(dt); rig.renderBody(o, {x: 발x, y: 발y, k: 크기}); ctx.drawImage(glCanvas, 0, 0);
// 연출 (끝나면 기본 자세로 돌아옴)
an.play('appear'|'hello'|'guide'|'happy'|'sad'|'surprise'|'think'|'content'|'worried'|'bye');
// 직접 조합 (대사 중 유지)
an.gesture('idle'|'guide'|'wave'|'happy'|'sad');
an.face('smile'|'laugh'|'surprise'|'sad'|'cry'|'worried'|'think'|'content');
an.talk(true|false);       // 대사 나오는 동안 true → 표정에 맞는 입으로 말함
an.events                  // 'land','pop','poof','shock','gesture:*','act:*','face:*' → 효과음 연결용
```
`o.fx`(gather, sparkle, tears, think, sweat, shock)는 이펙트 신호예요. 이펙트 그리기는 `index.html`에 있고 팀 이펙트로 바꿔도 돼요.

## 구조 (왜 이렇게 만들었나)
- **몸** `img/base.png`: 팔 없는 몸 한 장(제미나이 '팔 없는 몸' + 원본). 숨쉬기, 고개, 머리카락, 치맛자락은 이 몸 하나가 메시로 살짝 움직여요(`w.js` 가중치).
- **팔** `img/arms_<자세>.png`: 각 자세 그림에서 몸과 다른 픽셀만(팔·소매·손·옷 그림자). 몸 + 팔층 = 원본 그림(멈춘 자세 차이는 외곽선 1px 수준).
  - 자세 5개(idle, guide, wave, happy, sad) + 중간 그림 7장(wave_a, wave_b, wave_l, wave_r, guide_a, happy_a, sad_a).
  - 자세 바뀜은 **그린 그림을 순서대로 한 장씩 바꿔 끼우기**. 휘기·겹쳐 섞기는 일부러 안 써요(잔상·채색 깨짐이 생겨서 사용자가 되돌림).
  - 목·옷깃은 언제나 몸 그림 것(자세마다 목 음영이 달라 보이던 문제 방지). 손만 그 위에 올라와요.
- **표정** `img/eyes_*.png`, `img/mouth_*.png`: 제미나이 '같은 머리 다시 그리기' 12장에서 **눈·눈썹·입·눈물 선만** 가져옴. 피부·홍조·코·머리카락·얼굴선은 언제나 원본. 한 프레임에 바꿈(섞지 않음 → 눈 두 겹 없음).
  - 깜빡임: 반쯤(half) → 감음(blink) → 반쯤. 슬픈 표정은 슬픈 감은 눈(sadclosed).
  - 말하기: 표정마다 맞는 입(기본=talk, 슬픔·걱정·눈물=sadtalk, 웃음=content↔laugh).

## 폴더
| 폴더 | 내용 |
|---|---|
| `preview/` | 실행되는 리그 전체 |
| `source/master` | 마스터(원본 정리본), 팔 없는 몸, (안 쓴) 팔 조각 시트 |
| `source/faces` | 표정 다시 그리기 12장 (03 깜빡임 ~ 14 흐뭇) |
| `source/poses`, `source/inbetween` | 몸짓 4장, 중간 그림 7장 (15~21번) |
| `orders/` | 제미나이 주문서(복사해서 쓰는 프롬프트)와 첨부 파일 |
| `tools/` | 누끼(k.py) → 표정(faces3.py) → 몸 보정(base2/3.py) → 팔층(layers3.py) → 가중치(weights2.py), 검사(diffqa, zoomall, motqa) |
| `qa/` | 표정 전체, 인사 얼굴, 전환, 자세별 목 비교 |

## 그림 추가할 때 지킨 규칙 (제미나이)
1. 몸짓은 **새 채팅 + 마스터 하나만 첨부 + 비율 잠금 문장**. 표정 시트가 있는 채팅에서 받으면 머리가 커져요.
2. 표정은 **1장에 1표정, 머리 크롭 첨부, "얼굴만 바꿔"**. 바뀐 선만 쓰므로 머리카락이 조금 달라도 괜찮아요.
3. 팔이 움직이는 그림은 팔마다 위치를 적고 "원래 자리에 손이 남지 않게".
4. 과장된 통통 튐은 그림체를 깨요. 움직임은 작게(콩 3~6px, 고개 1~3°).

원안: PORKSODA 작가님의 니콜 / 리그·보정: Claude
