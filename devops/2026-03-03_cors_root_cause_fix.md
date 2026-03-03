### ☁️ 클라우드 배포 아키텍처 상태 요약 (Root Cause 해결 완료)

**근본 원인:** `infra/ecs/task-definition-template.json`에서 `APP_ENV=production`으로 설정했으나 `ALLOWED_ORIGINS` 환경 변수가 누락되어 있었습니다. 이로 인해 FastAPI의 CORS 미들웨어가 운영 환경에서 기본값(개발용 `localhost` 주소들)으로 fallback되어, 실제 ELB 도메인(`short-cut-alb-183482512.ap-northeast-2.elb.amazonaws.com`)에서 오는 요청이 전부 CORS로 차단되고 있었습니다.

**해결:**

1. `infra/ecs/task-definition-template.json`에 `ALLOWED_ORIGINS=*` 환경 변수를 추가하여 상시 배포 가능한 동적 구조로 전환했습니다. ELB 도메인이 재배포로 변경되어도 `*` 와일드카드를 통해 CORS를 허용하므로 도메인 하드코딩이 불필요합니다.
2. `src/api/main.py`의 CORS 미들웨어 설정 로직을 개선하여 `ALLOWED_ORIGINS=*` 값을 올바르게 처리하도록 수정했습니다.

### 📋 PM 에이전트 전달용 기술 백로그 (복사해서 PM에게 전달하세요)

- **Epic: 네트워크/CORS 에러 근본 원인 해결 (DevOps + Backend)**
  - [x] 근본 원인 파악 완료 (`APP_ENV=production`에서 `ALLOWED_ORIGINS` 누락으로 인한 CORS 차단)
  - [x] `infra/ecs/task-definition-template.json`에 `ALLOWED_ORIGINS=*` 환경 변수 추가
  - [x] `main.py` CORS 미들웨어 `*` 와일드카드 처리 로직 개선 완료
  - [ ] ECS 서비스 재배포를 통해 신규 Task Definition 적용 필요 (CI/CD 파이프라인에 push 또는 수동 재배포)
