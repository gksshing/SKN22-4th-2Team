### 🛠️ 코드베이스 분석 결과

프론트엔드 및 PM의 요청사항에 따라 서버 부하(Load) 시 발생할 수 있는 잠재적인 CORS 이슈를 선제적으로 방어하기 위해 `src/api/main.py`의 전역 예외 처리 로직을 점검 및 리팩토링했습니다.
기존 아키텍처는 500 단위의 치명적 예외가 발생 시 FastAPI 미들웨어 계층의 작동이 스킵되어 브라우저 측에 CORS 헤더가 전달되지 않는 고질적인 취약점이 있었습니다. 이로 인해 프론트엔드가 정확한 `detail`을 읽지 못하고 'Network Error' 처리로 빠지는 현상이 나타났습니다.
이를 해결하기 위해 `global_exception_handler` 내부에서 사용자 Request의 `Origin`을 추출하여 `ALLOWED_ORIGINS` 검증을 거친 후, 명시적으로 `Access-Control-Allow-Origin` 및 `Access-Control-Allow-Credentials` 헤더를 `JSONResponse`에 직접 주입하도록 로직을 강화했습니다.

### 📋 PM 및 DevOps 전달용 백로그 (복사해서 각 에이전트에게 전달하세요)

- **Epic: RAG 로직 고도화 (Backend)**
  - [x] 500 Internal Server Error 발생 시 CORS 헤더 증발 현상 방어 로직 구현 완료
- **Epic: FastAPI 웹 서비스화 (Backend)**
  - [x] 프론트엔드의 `NETWORK_ERROR` 파싱 안정화를 위한 Exception 객체의 명시적 헤더 주입 체계 구축 완료
- **Epic: 컨테이너 및 인프라 구축 (DevOps에게 전달할 사항)**
  - [ ] 백엔드 단의 CORS 헤더는 완벽하게 세팅되었습니다. 향후 부하 테스트 시 프론트 브라우저 콘솔에서 CORS 에러가 지속 관찰된다면, 이는 애플리케이션 단이 아닌 인프라(ALB 타임아웃 502/504 혹은 WAF 차단) 이슈이므로 인프라 레벨의 모니터링을 중점적으로 부탁드립니다.
