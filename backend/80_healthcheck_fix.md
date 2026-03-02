### 🛠️ 코드베이스 분석 결과
ECS Fargate 배포 시 컨테이너 상태를 점검하는 `/health` 엔드포인트가 `main.py`에 누락되어 있어서, 이전 배포(Revision 91)가 정상적으로 켜졌음에도 불구하고 헬스체크 실패(404 Not Found)로 인해 트래픽을 받지 못하고 롤백되는 문제가 발생했습니다. (이 때문에 예전 70번 리비전이 계속 화면에 보임)

해결책으로 `main.py`에 헬스체크용 `@app.get("/health")` 엔드포인트를 추가하였습니다.

### 📋 PM 및 DevOps 전달용 백로그
- **Epic: FastAPI 웹 서비스화 (Backend)**
  - [x] 상태 점검(Health check)용 `/health` 엔드포인트 누락 수정 및 배포 (포트 8000)
- **Epic: 컨테이너 및 인프라 구축 (DevOps에게 전달할 사항)**
  - [x] ECS 서비스 Health Check 설정과 동일한 경로(`/health`) 응답 확인
