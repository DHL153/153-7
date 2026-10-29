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

## exe로 묶을 때
- 폴더 전체를 그대로 묶으면 됩니다 (모든 경로가 상대 경로).
- 시작 파일: `index.html`
- 정리 후보: `mrstage/assets/`는 `assets/`와 겹치는 사본이 많음 → exe 전에 한 벌로 합치면 용량이 줄어듭니다.

## 정리 기록
- 2026-10-29: 153-6 방치형(idle·spectate)과 그 전용 코드·데이터, 옛 변환 스크립트(tools/) 삭제 — 필요하면 git 기록이나 153-6에서 되살릴 수 있음. 아트·음향 리소스는 그대로 둠.
