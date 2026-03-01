### 🛠️ 코드베이스 및 인프라 에러 분석 결과

MVP 서버(ECS)에 발생한 전반적인 에러 현상의 원인을 분석한 결과입니다.

1. **Dev 클러스터 (`short-cut-cluster`)**
   - **Pinecone 인증 에러 (401 Unauthorized)**: Uvicorn 서버는 기동되었으나, `Pinecone` 벡터 DB 초기화 시 API Key 인증 실패로 `401 Unauthorized` 에러가 발생했습니다. AWS Secrets Manager에 저장된 `PINECONE_API_KEY` 값이 만료되었거나 잘못되었을 가능성이 큽니다.

2. **Prod 클러스터 (`short-cut-prod-cluster`)**
   - **Redis 연결 실패 (Connection Refused)**: `src/rate_limiter.py`에서 `REDIS_URL` 환경 변수가 없을 경우 `redis://localhost:6379/0` 로 접속을 시도합니다. 그러나 ECS Fargate 환경의 Task Definition 내에 Redis 컨테이너가 배포되어 있지 않아 연결이 거부되고 있습니다. 현재 `Fail open` 처리되어 요청이 차단되지는 않지만, 지속적인 에러 로그를 발생시킵니다.
   - **ECS Deployment 실패 (Tasks failed to start)**: 2월 28일 새벽에 3차례의 Task 시작 실패가 발생하며 배포가 Rollback 되었습니다. 이는 CI/CD 파이프라인에서 ECS Task Definition을 업데이트할 때, ECR에 아직 푸시되지 않은 이미지 태그를 참조하여 발생했거나, Secrets Manager 권한을 누락했을 가능성이 높습니다.
   - **`/api/v1/analyze` 503 에러**: Redis 에러 직후 분석 요청이 503을 반환하는 로그들이 확인되었습니다. 이는 트래픽 유입 시 Uvicorn 워커가 Pinecone 연결 실패/타임아웃, 또는 OOM(Out of Memory)으로 인해 비정상 종료되면서 발생하는 것으로 추정됩니다.

### 📋 PM 및 DevOps 전달용 백로그
- **Epic: RAG 로직 및 외부 API 고도화 (Backend)**
  - [ ] `rate_limiter.py`의 Redis 의존성 개선 (Redis 미존재 시 메모리 기반 폴백 적용 로직 보완)
  - [ ] Pinecone 초기화 및 인증 실패 시 명확한 앱 상태(Health) 반영 또는 재시도 로직 추가
- **Epic: 컨테이너 및 인프라 구축 (DevOps에게 전달할 사항)**
  - [ ] Dev/Prod AWS Secrets Manager의 `PINECONE_API_KEY` 값 갱신 및 유효성 검증
  - [ ] ECS Fargate 배포 시 `REDIS_URL` 환경변수(ElastiCache 등) 삽입 구성
  - [ ] CI/CD GitHub Actions에서 ECR 이미지 푸시 완료 후 ECS Task 배포가 진행되도록 파이프라인(Ordering) 수정
