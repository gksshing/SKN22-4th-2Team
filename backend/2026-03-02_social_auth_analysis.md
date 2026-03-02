### 🛠️ 코드베이스 분석 결과
소셜 로그인(OAuth) 연동 구조를 검토한 결과, 구글, 네이버, 카카오로부터 인증 코드(`code`)를 전달받아 처리하는 콜백(`callback`) 엔드포인트와 DB 연동 로직은 `auth_router.py` 및 `social_auth.py`에 잘 구현 및 설정되어 있습니다. 
하지만, 사용자가 최초로 소셜 로그인을 시도할 때 **각 인증 제공자(Google, Naver, Kakao)의 로그인(동의) 페이지로 리다이렉트시키는 시작 엔드포인트(`.api/v1/auth/login/{provider}`)가 구현되어 있지 않습니다.** 이로 인해 현재 프론트엔드에서 버튼 클릭 시 OAuth 인증 과정을 건너뛰고 바로 백엔드 콜백 URL로 이동하게 되어 422 또는 400 에러가 발생하는 구조적 결함이 있습니다.

### 📋 PM 및 DevOps(Frontend) 전달용 백로그 (복사해서 각 에이전트에게 전달하세요)
- **Epic: FastAPI 웹 서비스화 (Backend)**
  - [ ] 소셜 로그인 인증 시작(Initiate)을 위한 리다이렉트 엔드포인트 (`/login/google`, `/login/naver`, `/login/kakao`) 추가 개발
  - [ ] `state` 파라미터 기반 CSRF(Cross-Site Request Forgery) 방어 로직 추가 (특히 네이버/카카오 연동 시 필수)
- **Epic: UI 컴포넌트 고도화 (Frontend)**
  - [ ] 소셜 로그인 버튼 클릭 시, 프론트엔드에서 `/api/v1/auth/login/{provider}` 로 이동하도록 링크 주소 변경 요청
