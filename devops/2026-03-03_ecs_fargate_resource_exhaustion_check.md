### ☁️ 부분 클라우드 인프라 모니터링 액션 플랜 (ECS Fargate 집중)

백엔드 로직 수정이 배포된 이후에도 브라우저 상의 네트워크/CORS 타임아웃 오류가 발생할 경우, 이는 십중팔구 **FastAPI 서버가 구동되는 ECS Fargate Task 컨테이너 자체의 리소스 고갈 파직(Exit)** 을 의심해야 합니다. PM님의 우선순위 조정 지시에 따라, 현 시간부로 오직 "컨테이너 내구도 한계치 추적"에만 착수하겠습니다.

1. **ECS Container Insights 분석 가이드라인:**
   - AWS Console > CloudWatch > Container Insights 진입.
   - 대상 클러스터 및 Fargate 서비스 선택 후, **오류(Network Error) 발생 시점** 전후 10분간의 `CPUUtilization` 및 `MemoryUtilization` 지표 스파이크 관찰.
   - 특히 메모리가 할당량의 90% 이상을 터치했는지 확인 (Python 특성상 RAG 대규모 문서 유사도 연산 중 급격한 메모리 치솟음 현상, 일명 OOM Killer 개입 여부).

2. **비정상 종료(Stop Code) 및 백엔드 스로틀링 추적:**
   - AWS Console > ECS > 클러스터 내 Task 탭 > '중지됨(Stopped)' 상태의 Task 선택.
   - 상세 정보에서 `Stopped reason` 또는 `Exit Code` 식별.
     - `Exit Code 137` 이라면 메모리 부족(OOM).
     - 프로세스가 hang(멈춤) 상태에 빠져 ALB의 Target Group Health Check를 응답하지 못해 도려내어졌는지(Draining 됨) 확인.

### 📋 (셀프) DevOps 트러블슈팅 액션 아이템

- **Epic: AWS 인프라(ECS) 원인 분석**
  - [ ] CloudWatch Container Insights를 통해 CPU/Memory 스파이크 로그 덤프 추출
  - [ ] 최근 1시간 내 ECS 서비스의 '중지된(Stopped) 태스크' 이력 확인 및 상세 원인(OOM/Healthcheck failed) 조사 후 PM 보고
