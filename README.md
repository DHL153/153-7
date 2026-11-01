# Merge & Run La Mancha — 153-7

153-6의 리소스 전체와 라만차 v3(손패) 아티팩트의 최신 파일을 합친 저장소입니다. (2026-10-29 이관)

## 실행
- 웹: GitHub Pages — `index.html`
- 로컬: 이 폴더에서 `python3 -m http.server 8000` → http://localhost:8000

## 폴더
| 경로 | 내용 |
|---|---|
| `index.html` | Merge & Run La Mancha — 메인 게임 (손패) |
| `mrstage/stage.html` | 전투 무대 (index.html이 iframe으로 불러옴) |
| `mrstage/assets/`, `mrstage/fx/` | 전투 무대 전용 리소스 (가벼운 webp 사본) |
| `assets/` | 공용 리소스 — 153-6 원본 + v3 UI(카드·구슬·아이콘·버튼 등) |
| `assets/rig/` | 리깅 캐릭터 원본 데이터·제작 도구 (게임은 `mrstage/assets/rig/` 사용) |
| `docs/balance/` | 밸런스 설계 기록 — 강인도·브레이크 보관안(`toughness-balance.md`)과 봇 시뮬레이터(`bot/`) · 게임 실행에는 필요 없음 |

## exe로 묶을 때
- 폴더 전체를 그대로 묶으면 됩니다 (모든 경로가 상대 경로).
- 시작 파일: `index.html`
- `docs/` 폴더는 개발 기록이라 빼고 묶어도 됩니다.
- **`assets/rig/`(약 480MB)는 리깅 제작 원본이라 빼고 묶으세요** — 게임은 그림이 들어 있는 `mrstage/assets/rig/*/rig.def.js`만 씁니다. (`assets/` 663MB 중 481MB)
- 정리 후보: `mrstage/assets/`는 `assets/`와 겹치는 사본이 많음 → exe 전에 한 벌로 합치면 용량이 줄어듭니다.

## 정리 기록
- 2026-10-29: 153-6 방치형(idle·spectate)과 그 전용 코드·데이터, 옛 변환 스크립트(tools/) 삭제 — 필요하면 git 기록이나 153-6에서 되살릴 수 있음. 아트·음향 리소스는 그대로 둠.
- 2026-11-01: 전체 QA + 코드 정리 — 어디서도 부르지 않는 함수 정리(index.html 14개: 옛 팁 · 구슬 툴팁 · 힘 공식 등 / stage.html 6개: 방치형 경제 · 일일 임무 흔적), 산초의 조언 구슬 흔적 정리(#101).
