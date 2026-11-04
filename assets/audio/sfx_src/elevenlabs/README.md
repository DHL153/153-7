# ElevenLabs 효과음 원본 (2026-11-04, DHL)
ElevenLabs Sound Effects v2로 받은 원본. 게임 파일(assets/audio/sfx/*.ogg)은 앞뒤 무음 자름 · 2ms/12ms 페이드 · 최대 −3dBFS로 맞춰 OGG로 바꿈.

| 원본 | 소리 모양 | 넣은 곳 |
|---|---|---|
| el_card_swish.mp3 | 0.25초 · 밝은 스치는 소리 | sfx_card_deal_a (카드 날아옴 — _b와 번갈아) |
| el_card_tick.mp3 | 0.03초 · 또렷한 '틱' (1.5kHz) | sfx_fire_merge_spin_a/b/c (뒤집기·고르기·호버는 11-04 전용 소리로 바뀜) |
| el_card_tock.mp3 | 0.02초 · 조금 낮은 '톡' (1.1kHz) | sfx_fire_merge_stop (해제는 11-04 전용 소리로 바뀜) |
| el_back_taps.mp3 | 0.06초 · 낮은 '톡톡' 두 번 (300→266Hz, 내려감) | sfx_ui_back (뒤로 버튼) |
| el_back_alt_tick.mp3 | 0.33초 늦게 시작 · 1.5kHz 틱 | 안 씀 (보관) |
(같은 묶음 3번째 파일은 거의 안 들리고(−34dB) 잡음이 많아 뺌)
| el_tab_tap.mp3 | 0.04초 · 낮은 가죽 '톡' (200Hz, 고음 0%) | sfx_ui_tab (탭 전환: 게임 설정 탭 · 플레이 탭 · 도감 · 배우기) |
| el_tab_tap2.mp3 | 같은 계열, 조금 작음 | 안 씀 (보관) |
| el_panel_open_11 · 10 · 9.mp3 | 0.3~0.37초 · 부드러운 창 열림 (잡음 0.03~0.11) | sfx_panel_open_a · _b · _c (창 열림 — 3개를 돌아가며, 소리 크기 같게 맞춤) |
| el_panel_close_13 · 12.mp3 | 0.1~0.15초 · 낮고 부드러운 '툭' (141Hz · 94Hz) | sfx_panel_close_a · _b (닫기 · ✕ 버튼, 2개 돌아가며) — 휴대폰 스피커에선 작게 들릴 수 있음 |
| el_page_turn.mp3 | 0.2초 · 종이 한 장 넘김 (고음 19% — 예전 58%) | sfx_page_turn_a (배우기 · 도감 쪽 넘김, 한 개를 높이만 살짝씩 흔들어 씀) |
| el_title_logo.mp3 | 0.5초 + 잔향 · 밝게 반짝이는 '스르릉' (잡음 0.03) | sfx_title_logo (타이틀 화면이 뜰 때 · 첫 실행 다시 보기에서 풍차가 돌기 시작할 때) |
| el_card_deal.mp3 | 0.25초 · 카드가 탁자 위를 미끄러지는 '슥' | sfx_card_deal_b (카드 날아옴 — _a와 번갈아, 소리 크기 _a에 맞춤) |
| el_card_select.mp3 | 0.16초 · 낮고 도톰한 '착' 집어 듦 (188Hz) | sfx_card_select_b (카드 고르기) |
| el_card_flip.mp3 | 0.08초 · 또렷한 '탁' 뒤집기 (3kHz) | sfx_card_flip_a (카드 뒤집기 · 손패 펼칠 때 · 길 고르기) |
| el_card_deselect.mp3 | 0.14초 · 카드를 내려놓는 낮은 '톡' (94Hz + 종이결) | sfx_card_deselect (고른 카드 해제 — 고르기 '착'과 짝) |
| el_card_hover.mp3 | 0.37초 · 아주 작은 종이 스침 (잡음 0.42) → 앞 0.24초만, 120Hz 아래 깎음 | sfx_card_hover (PC에서 손패 카드 위에 마우스를 올릴 때 — 11-04 처음 연결) |
| el_hand_sort.mp3 | 0.26초 · 카드를 촤라락 모아 '탁' 맞춤 (원본 넘침 +0.9dB → 줄임, 9kHz 위 살짝 깎음) | sfx_hand_sort (정렬 버튼 — 11-04 새로 연결 · 이겼을 때 카드가 덱으로 다 들어가는 끝) |
| el_card_discard.mp3 | 0.3초 · 휙 던져 0.3초에 '탁' 떨어짐 (잡음 0.20 — 예전 0.49) | sfx_card_discard (버리기) |
| el_deck_shuffle.mp3 | 0.6초 · 리플 셔플 '촤르륵' (고음 28% — 예전 46%, 10kHz 위 살짝 깎음) | sfx_deck_shuffle (손패 크게 새로 받을 때) |
| el_card_fog.mp3 | 0.4초 · 바람결과 함께 뒷면 카드가 '스르륵 탁' | sfx_card_fog (안개 규칙으로 뒷면 카드가 손패에 들어올 때 · 첫 손패가 모두 뒷면인 판 — 11-04 처음 연결) |
| el_card_burn.mp3 | 0.14초 · 쇠갈고리 '척' + 종이 '찍' (잡음 0.39 — 예전 0.51, 11kHz 위 살짝 깎음) | sfx_card_burn (거인 '갈고리' 규칙으로 카드가 뜯겨 나갈 때) |
| el_merge.mp3 | 0.53초 · 두 카드가 마법처럼 합쳐지는 반짝임 (잡음 0.23 · 원본 넘침 +2.9dB → 줄임) | sfx_merge (카드 머지 · 곧이어 별 오름 소리) |
| el_orb_trigger_mult.mp3 | 0.18초 + 잔향 · 유리 구슬 '팅' 화음 (785Hz=솔, 잡음 0.00) → 완전5도 내려 '도'에 가깝게 | sfx_orb_trigger_mult_a (× 구슬 발동 — 점수 노래의 한 음, _b/_c 삭제) |
| el_orb_equip.mp3 | 0.24초 · 아주 작은 유리 '띵' (소리 대부분 8~16kHz) → 완전5도 낮춰 덜 쏘게 | sfx_orb_equip (구슬을 칸에 끼움 · 상점에서 구슬 살 때) |
| el_orb_swap.mp3 | 0.34초 · 유리 구슬 '띵…띵' 두 번 (거의 8kHz 위) → 끼움과 같이 완전5도 낮춤 | sfx_orb_swap (구슬 순서 바꿈) |
| el_atk_greatsword.mp3 | 0.38초 · 묵직한 대검 '부웅—쿵' (중심 225Hz, 잡음 0.29 — 예전 0.46 · 원본 넘침 +3.1dB → 줄이고 35Hz 아래 깎음) | sfx_atk_greatsword (대검 동료 공격 · 컷인) |
| el_atk_hammer.mp3 | 0.45초 · 큰 전쟁 망치 '쾅' 바로 내리침 (중심 507Hz, 잡음 0.41 — 예전 0.47) | sfx_atk_hammer (망치 동료 공격 · 컷인) |
| el_atk_bigblade.mp3 | 0.18초 · 넓은 칼날 '휙' 짧고 굵게 (중심 888Hz — 예전 4.9kHz) | sfx_atk_bigblade (큰 칼날 동료 공격 · 컷인) |
| el_atk_gun.mp3 | 0.28초 · 옛 화승총 한 발 '탕' (잡음 0.23 — 예전 0.48 · 원본 넘침 +3.8dB → 줄임) | sfx_atk_gun_a · _b(높이 −6%) · _c(+6%) (총 동료 공격 · 연사 때 3개 번갈아) |
| el_atk_fist.mp3 | 0.39초 · 쇠장갑 주먹 '퍽' (원본은 소리 대부분이 60Hz 아래라 작은 스피커에선 거의 안 들림 → 70Hz 아래 깎고 2.2kHz +5dB로 맞는 결을 살림) | sfx_atk_fist (주먹 동료 공격 · 컷인) |
| el_atk_staff.mp3 | 0.43초 · 마법 지팡이 '샤라랑' 반짝임 (맑은 음, 잡음 0.00 — 예전 0.45 · 12kHz 위 살짝 깎음) | sfx_atk_staff (지팡이 동료 공격 · 컷인) |
| el_atk_shieldaxe.mp3 | 0.22초 · 무거운 방패로 '쿵' 밀치기 (원본은 대부분 150Hz 아래 → 70Hz 아래 깎고 2.5kHz +5dB로 쇠 부딪힘 살림) | sfx_atk_shieldaxe (방패도끼 동료 공격 · 컷인) |
| el_atk_widesword.mp3 | 0.29초 · 넓은 대검 가로 베기 '부왕' (중심 368Hz, 잡음 0.20 — 예전 0.47 · 원본 넘침 +2.5dB → 줄이고 45Hz 아래 깎음) | sfx_atk_widesword (넓은 검 동료 공격 · 컷인) |
| el_atk_dual.mp3 | 0.2초 · 짧은 칼 '샥' (원본은 대부분 60Hz 아래 '둥' → 120Hz 아래 깎고, 같은 소리를 0.075초 뒤 8% 높게 한 번 더 겹쳐 쌍검 '샥샥') | sfx_atk_dual (쌍검 동료 공격 · 컷인) |
