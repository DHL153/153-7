# 니콜 NPC 주문서 (제미나이)

**받는 형식 (공통)**
- 제미나이 **다운로드 버튼**으로 받은 PNG를 그대로 주세요. 캡처나 복사는 쓰지 마세요.
- 한 장마다 **새 채팅**을 열고, 표에 적힌 첨부 파일**만** 넣어 주세요. 같은 채팅에서 이어 하면 머리 크기가 바뀌어요.
- 파일 이름은 그대로 두셔도 돼요. "S1입니다"처럼 번호만 말해 주세요.

| 순서 | 번호 | 무엇 | 첨부 |
|---|---|---|---|
| 1 | **S1** | 팔·손·소매를 뺀 몸 (팔에 가려졌던 옷과 머리카락까지 완성) | `attach_1_master.png` |
| 2 | **A1** | 팔 조각: 퍼프소매 2, 윗팔 2, 팔뚝 2 (관절 둥글게) | `attach_1_master.png` |
| 3 | **E1~E12** | 표정 12장 (1장에 1표정, 얼굴만 바뀜) | `attach_2_head.png` |

손은 받지 않아도 돼요. 이미 받은 몸짓 4장(안내, 손 흔들기, 기뻐요, 슬퍼요)과 기본 자세에 손이 다 있어서, 거기서 잘라 쓸게요.

---

## S1 — 팔 없는 몸  (첨부: attach_1_master.png)

```
Redraw the attached picture exactly: same girl, same size, same position on the canvas, same pose, same face, hair, dress, pendant, legs and shoes, same thick dark outline and painted shading.
Change only ONE thing: remove BOTH arms, BOTH hands and BOTH puff sleeves completely.
Where the arms were, draw what was hidden behind them: the sides of the dress bodice and waist, the skirt, and her long hair behind her shoulders, complete and continuous.
The shoulders of the dress end in a clean rounded edge where the sleeves would be sewn on.
No shadows of arms on the dress. Nothing is left where the arms and hands were.
Plain flat #00FF00 background, no ground shadow, no text, no logo. No green on the character.
```

**같은 채팅에서 고치는 한 줄**
- 팔이나 손이 남았을 때: `There is still part of an arm or hand. Remove every arm, hand and sleeve completely.`
- 소매 없는 원피스가 이상할 때 (어깨가 뾰족하거나 맨살 어깨): `The shoulders must stay covered by the dress fabric, with a round clean edge, no bare shoulders.`
- 몸 크기나 머리가 바뀌었을 때: `Keep the exact size, proportions and position of the attached picture. Only remove the arms.`
- 허리 부분이 비었을 때: `The waist area where the hands were is empty. Fill it with the dress fabric and folds.`

**받으면 제가 확인할 것:** 마스터와 겹쳐서 머리·발·치마 선이 1~2px 안에 맞는지 확인해요. 팔에 가려졌던 자리에는 옷 주름이 자연스럽게 이어져야 하고, 그림자 자국이 없어야 해요.

---

## A1 — 팔 조각  (첨부: attach_1_master.png)

```
Character parts sheet for 2D cut-out animation of the attached girl, at TWICE the size of the attached picture, same three-quarter view.
Draw these 6 pieces, each separate with plenty of background around it:
 1. Her RIGHT puff sleeve alone (the sleeve on the LEFT side of the picture), same shape, folds, cuff band and colours as in the picture. The top is closed and rounded; the arm opening at the bottom is an empty oval.
 2. Her LEFT puff sleeve alone (the sleeve on the RIGHT side of the picture), same style.
 3. Her RIGHT upper arm alone, bare skin, from the shoulder to the elbow, straight, both ends rounded like a capsule.
 4. Her LEFT upper arm alone, bare skin, the same.
 5. Her RIGHT forearm alone, bare skin, from the elbow to the wrist, straight, no hand, both ends rounded like a capsule.
 6. Her LEFT forearm alone, bare skin, the same.
Proportions (use the forearm thickness as 1): upper arm length = 2.9, forearm length = 3.7, puff sleeve width = 2.6. Short, soft child arms, not long adult arms.
Same warm skin tone, same thick dark outline and soft shading as the attached picture.
Plain flat #00FF00 background, no text, no labels, no numbers, no guide lines, no logo. No green on any piece.
COUNT CHECK: exactly 6 pieces: 2 sleeves, 2 upper arms, 2 forearms. No hands, no body, no head.
```

**같은 채팅에서 고치는 한 줄**
- 팔이 길고 어른 같을 때: `The arms are too long. Make them short soft child arms: upper arm 2.9 and forearm 3.7 times the forearm thickness.`
- 손이 붙어 왔을 때: `Remove the hands. The forearms end in a rounded wrist with no hand.`
- 끝이 뭉툭하게 잘렸을 때: `Both ends of each arm piece must be rounded like a capsule, with the outline going all the way around.`
- 소매 디자인이 바뀌었을 때: `The sleeves must look exactly like the puff sleeves in the attached picture: same folds, same cuff band, same colours.`

---

## E1~E12 — 표정 (1장에 1표정, 새 채팅마다 attach_2_head.png만)

> 바로 복사해서 쓰는 완성본은 `E_prompts_copy.md`에 있어요.

모든 표정에 쓰는 공통 앞부분이에요.
```
Redraw the attached image exactly, at the same size: same head, same hair strands, same face outline, same angle, same position in the frame, same thick dark outline, same painted shading and skin colour, same collar.
Change only the FACE: <바꿀 것>.
Keep the hair, ears, face outline, nose, blush, neck and collar exactly as they are.
Plain flat #00FF00 background, no text, no logo.
```

`<바꿀 것>` 자리에 아래 문장을 하나씩 넣어 주세요.

| 번호 | 표정 | `<바꿀 것>` |
|---|---|---|
| E1 | 깜빡임 (눈 감음) | `both eyes gently closed as soft curved lines with the same eyelashes; eyebrows and mouth unchanged` |
| E2 | 반쯤 감음 | `both eyes half closed (upper eyelids lowered to the middle of the iris); eyebrows and mouth unchanged` |
| E3 | 말하기 | `the mouth is slightly open in a friendly smile, as if saying "ah"; eyes and eyebrows unchanged` |
| E4 | 활짝 웃음 | `eyes closed in happy upward arcs, big open laughing mouth with upper teeth and tongue, eyebrows slightly raised` |
| E5 | 놀람 | `eyes wide open with small pupils and white around the iris, eyebrows raised high, small round open mouth` |
| E6 | 살짝 슬픔 | `inner eyebrows raised, glossy eyes looking slightly down, small sad frown, no tears` |
| E7 | 슬픔 + 눈 감음 | `the sad eyebrows of a sad face (inner ends raised), both eyes closed as soft downward curves, small sad frown` |
| E8 | 슬픔 + 말하기 | `inner eyebrows raised, glossy eyes, the mouth slightly open in a sad shape as if speaking softly` |
| E9 | 눈물 | `inner eyebrows raised, glossy teary eyes, one small tear at the outer corner of each eye, small trembling frown` |
| E10 | 걱정 | `worried eyebrows (raised and tilted), eyes looking at the viewer, a small wavy troubled mouth` |
| E11 | 생각 | `both pupils looking up to the upper right, eyebrows relaxed and slightly raised, mouth small and pushed to one side, like a cute "hmm"` |
| E12 | 흐뭇 (눈 감고 미소) | `eyes gently closed in content upward arcs, a soft closed smile` |

**같은 채팅에서 고치는 한 줄**
- 머리카락이나 각도가 바뀌었을 때: `The hair or head angle changed. Copy the attached image exactly; only the eyes, eyebrows and mouth may change.`
- 다른 아이 얼굴이 됐을 때: `The face looks like a different girl. Keep the same face shape, eye shape and size as the attached image.`
- 표정이 약할 때: `The expression is too weak. Make it clearly <표정 이름>.`

**받으면 제가 하는 일:** 마스터 머리에 맞춘 다음 **마스터와 달라진 부분(눈, 눈썹, 입, 눈물)만** 잘라 써요. 머리카락과 얼굴선은 언제나 마스터 것을 쓰니까, 칸마다 머리카락이 달라서 생기던 겹침이 없어져요. 깜빡임(E1, E2, E7)과 말하는 입(E3, E8)은 표정마다 맞는 것을 따로 받아서, 어떤 표정에서 깜빡이거나 말해도 눈썹과 입이 어긋나지 않아요.
