### 🛠️ 코드베이스 분석 결과
소셜 로그인 리다이렉트 흐름 누락 문제를 분석하고, FastAPI 백엔드 라우터에 해당 기능을 추가했습니다.

### 📋 PM 및 DevOps 전달용 백로그 (복사해서 각 에이전트에게 전달하세요)
- **Epic: FastAPI 웹 서비스화 (Backend)**
  - [x] 구글 OAuth Initial Redirect 추가 (`/api/v1/auth/login/google`)
  - [x] 네이버 OAuth Initial Redirect 및 CSRF state 파라미터 추가 (`/api/v1/auth/login/naver`)
  - [x] 카카오 OAuth Initial Redirect 추가 (`/api/v1/auth/login/kakao`)
