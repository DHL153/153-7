Merge & Run 전체 게임 파일 (v9)

index.html: 게임 본체
assets/art/: 전체 아트 및 캐릭터 달리기 프레임
assets/audio/: BGM 및 효과음
assets/data/: 리소스 설정 JSON
assets/ui/: UI 스타일 및 JavaScript

실행: 압축을 모두 해제하고 폴더 구조를 유지해 웹 서버에 올리세요.
로컬에서는 이 폴더에서 python -m http.server 8000 실행 후
브라우저에서 http://localhost:8000 을 열면 됩니다.
기존 게임의 개인 진행 데이터는 브라우저에 저장되므로 이 ZIP에 포함되지 않습니다.

[이모지 이미지]
assets/art/emojis/ 폴더에 PNG를 넣습니다. 파일 이름(확장자 제외)이 곧 아이템 고정 ID입니다.
- game_reaction_0001~ : 반응 (소셜에서 보내기용)
- myroom_<분류>_0001~ : 마이룸 꾸미기 (animal, plant, food, furniture, decor, face, game)
- character_emoji_0001~ : 전투 캐릭터 이모지 (추가 예정)
새 이미지를 추가하면 index.html의 EMOJI_SETS에서 해당 분류의 count만 늘리면 됩니다.
권장 크기: 256x256, 투명 배경 PNG.
