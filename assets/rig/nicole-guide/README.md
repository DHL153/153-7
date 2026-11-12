# 니콜 안내 NPC — 딸기 축제 옷 (최종)

튜토리얼(온보딩) 안내용 NPC 니콜이에요. 전신이고, 화면 왼쪽에 서서 오른쪽(대사창)을 바라보는 배치예요.
원안: PORKSODA 작가님의 니콜 / 옷·표정 그림: Gemini / 리그·보정: Claude

## 1. 바로 보기
```
cd preview
python3 -m http.server 8000
```
브라우저에서 http://localhost:8000 을 열어요. (파일을 더블클릭해서 열면 이미지가 안 떠요. 꼭 로컬 서버로 여세요.)

- 버튼: 등장 E · 퇴장 Q · 튜토리얼 데모 D · 인사 1 · 안내 2 · 기뻐요 3 · 슬퍼요 4 · 놀람 5 · 생각 6 · 걱정 7 · 흐뭇 8 · 말하기 T · 느리게 · 이펙트 ON/OFF
- 니콜을 클릭하면 기뻐하거나 인사해요. 말풍선과 글자는 없어요(게임 UI 쪽 몫).

## 2. 게임에서 쓰는 법 (`preview/npc.js`)
```js
const rig = new NicoleRig(glCanvas, { img, frames, faces, weights: window.NICOLE_W });
const an  = new NicoleAnim(frames, { kp: {}, anchors: [] });

// 매 프레임
const o = an.update(dt);
rig.renderBody(o, { x: 발X, y: 발Y, k: 크기 });
ctx.drawImage(glCanvas, 0, 0);

// 연출 (끝나면 기본 자세로 돌아와요)
an.play('appear' | 'hello' | 'guide' | 'happy' | 'sad' | 'surprise' | 'think' | 'content' | 'worried' | 'bye');

// 대사 중에 직접 조합할 때
an.gesture('idle' | 'guide' | 'wave' | 'happy' | 'sad');   // 팔 자세
an.face('smile' | 'laugh' | 'surprise' | 'sad' | 'cry' | 'worried' | 'think' | 'content');
an.talk(true | false);   // 대사가 나오는 동안 true → 표정에 맞는 입으로 말해요

an.events   // 'land', 'pop', 'poof', 'shock', 'gesture:*', 'act:*', 'face:*' → 효과음 연결용
```
`o.fx`(gather, sparkle, tears, think, sweat, shock)는 이펙트 신호예요. 이펙트 그리기 코드는 `preview/index.html`에 있고, 팀 이펙트로 바꿔도 돼요.
이미지 목록과 불러오는 순서는 `preview/index.html`의 로딩 부분을 그대로 참고하면 돼요.

## 3. 구조 (왜 이렇게 만들었나)
- **몸** `img/base.png`: 팔이 없는 몸 한 장이에요. 숨쉬기, 고개 기울임, 머리카락과 치맛자락의 작은 흔들림은 이 몸 하나가 메시로 움직여요(`w.js` 가중치).
- **팔** `img/arms_<자세>.png`: 각 자세 그림에서 가슴~치마 윗단과 팔, 손을 통째로 가져온 층이에요.
  - 자세 5개(idle, guide, wave, happy, sad) + 중간 그림 7장(wave_a, wave_b, wave_l, wave_r, guide_a, happy_a, sad_a).
  - 자세가 바뀔 때는 **그린 그림을 순서대로 한 장씩 바꿔 끼워요.** 휘기나 겹쳐 섞기는 일부러 안 써요(잔상, 채색 깨짐 방지).
  - 얼굴 앞에서는 손가락 조각만 가져와요(턱, 입은 언제나 표정 그림 것).
- **표정** `img/eyes_<표정>.png`: 표정마다 **얼굴·앞머리·눈썹을 그 그림 한 장에서 통째로** 가져와요. 두 그림의 눈썹이나 입이 섞이지 않아서, 눈썹 두 개 같은 문제가 생기지 않아요.
  - `img/mouth_<표정>.png`: 말할 때 입 둘레만 바꾸는 조각이에요.
  - 깜빡임: 반쯤 감음(half) → 감음(blink) → 반쯤 감음. 슬픈 표정은 슬픈 감은 눈(sadclosed).
  - 웃으며 말할 때는 입을 덮지 않고 웃음 ↔ 흐뭇 머리를 통째로 번갈아 바꿔요.
- 움직임은 일부러 작게 했어요(콩 3~6px, 고개 1~3°). 크게 통통 튀면 이 그림체가 깨져요.

## 4. 폴더
| 폴더 | 내용 |
|---|---|
| `preview/` | 실행되는 리그 전체(이것만 있으면 돌아가요) |
| `source/outfit_13/` | 딸기 옷 그림 13장: 01 마스터, 02 sad_a, 03 happy_a, 04 wave_r, 05 wave, 06 guide_a, 07 wave_b, 08 wave_a, 09 sad, 10 happy(허리띠 수정본), 11 wave_l, 12 guide, 13 팔 없는 몸 |
| `source/faces_12/` | 표정 12장: 01 깜빡임, 02 반쯤 감음, 03 말하기, 04 웃음, 05 놀람, 06 슬픔, 07 슬픔+감음, 08 슬픔+말하기, 09 눈물, 10 걱정, 11 생각, 12 흐뭇 |
| `source/original_white_master.png` | 처음 흰 원피스 마스터(위치 기준 좌표의 원본) |
| `orders/` | 제미나이 주문서(복사해서 쓰는 프롬프트)와 첨부 그림. 옷이나 표정을 새로 받을 때 그대로 쓰면 돼요 |
| `tools/` | 다시 만들 때 쓰는 스크립트 |
| `qa/` | 검수 화면(표정 조합 18개, 연출별 얼굴 프레임) |

## 5. 옷이나 표정을 바꾸고 싶을 때
1. 옷: `orders/니콜_딸기축제옷_13장.md` 순서대로 13장을 받아요(1번 마스터를 먼저 확인).
2. 표정: `orders/니콜_딸기옷_표정12장.md`로 새 마스터 머리를 첨부해서 12장을 받아요.
3. 스크립트 순서: `new_align.py`(위치 맞추기) → `new_build.py`(피부톤) → `base4.py`(팔 없는 몸) → `layers5.py`(팔층) → `weights2.py`(흔들림 가중치) → `head_align.py` → `heads.py`(표정)
4. 검수: `facegrid.py`(표정 모음), `zoomall.py <자세>`(원본과 확대 비교), `motqa.py`/`motsheet.py`(움직임 프레임)

**제미나이 규칙:** 한 장마다 새 채팅, 적힌 그림 하나만 첨부, 다운로드 버튼으로 저장. 같은 채팅에서 이어 받으면 머리가 커지거나 그림체가 바뀌어요.

## 6. 알려진 작은 점
- 생각하는 얼굴에서 깜빡일 때는 기본 깜빡임 그림을 빌려 써서, 0.1초 동안 눈썹 높이가 살짝 바뀌어요. "생각 + 눈 감음" 1장을 받으면 없앨 수 있어요.
