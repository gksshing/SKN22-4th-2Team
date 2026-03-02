### 🎨 UI/UX 개발 내용 요약
소셜 로그인(OAuth) 버튼 클릭 시 호출되는 URL을 백엔드 콜백에서 백엔드의 신규 로그인 시작(Initiate) 엔드포인트로 변경하여 흐름 결함을 해결했습니다.

### 📋 PM 및 Backend 전달용 피드백 (복사해서 전달하세요)
- **Epic: 프론트엔드 화면 개발**
  - [x] `LoginForm.tsx`: 소셜 로그인 버튼(구글, 네이버, 카카오) 링크를 `/auth/login/{provider}`로 수정
  - [x] `SignupForm.tsx`: 소셜 로그인 버튼 링크를 `/auth/login/{provider}`로 수정
  - [ ] (필요시) 현재 로컬 빌드 및 기능 연동 테스트를 위해 백엔드와 머지 후 확인 필요
