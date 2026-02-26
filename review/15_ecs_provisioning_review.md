### 🔍 총평 (Architecture Review)
ECS 인프라 설계 측면에서 보안 그룹 룰, OIDC 연동 및 컨테이너 멀티스테이지 적용은 우수합니다. 그러나 Task Definition 내부의 `<AWS_ACCOUNT_ID>` 텍스트와 잘못된 리전(`us-east-1`) 하드코딩으로 인해 실제 배포 시 명백한 배포 실패가 예상됩니다. 리전 불일치 및 미치환 변수 문제를 해결해야만 Production 서비스의 정상 구동이 보장됩니다.

### 🚨 코드 리뷰 피드백 (개발 에이전트 전달용)
*(아래 내용을 복사해서 Backend 또는 DevOps 에이전트에게 전달하세요)*

**[🔴 Critical: 치명적 결함 - 즉시 수정 필요]**
- `infra/ecs/task-definition-template.json:49-50` - `taskRoleArn`과 `executionRoleArn`에 `<AWS_ACCOUNT_ID>`가 문자열 그대로 명시되어 있습니다. GitHub Actions의 render 액션(`amazon-ecs-render-task-definition`)은 컨테이너 이미지만 교체하므로, 그 전에 `sed` 명령을 이용해 파이프라인 상에서 `${{ secrets.AWS_ACCOUNT_ID }}`로 치환하는 스텝을 추가해야 합니다.
- `infra/ecs/task-definition-template.json:20,31` - 실제 생성된 ALB 및 ECR 리전은 `ap-northeast-2`(서울)이나, 해당 템플릿 내 CloudWatch `awslogs-region`과 `AWS_REGION` 환경 변수는 `us-east-1`로 하드코딩되어 있습니다. 리전을 `ap-northeast-2`로 동기화하십시오.

**[🟡 Warning: 잠재적 위험 - 개선 권장]**
- `.github/workflows/ecr-cicd.yml:267` - `wait-for-service-stability: true` 설정이 포함되어 배포 중 에러로 인해 정상화되지 못할 경우 타임아웃(기본 10~30분) 파이프라인이 정지 및 과금될 수 있습니다. ECS 배포 실패 시 롤백 전략이나 Health Check 타임아웃 제한을 명확히 설정하는 것을 권장합니다.
- `infra/ecs/task-definition-template.json:36` - Health Check Command가 Python 내장 패키지(urllib)를 통하지만 애플리케이션 시작 전에 여러 차례 실패가 기록될 수 있으므로 `startPeriod`(현재 20s)가 앱이 뜨는 데 충분한지 확인하세요.

**[🟢 Info: 클린 코드 및 유지보수 제안]**
- `Dockerfile:73` 및 `infra/ecs/task-definition-template.json:36` - Dockerfile과 ECS 템플릿 양쪽에 모두 HealthCheck 명령이 정의되어 있어 관리 포인트가 분산됩니다. ECS 환경에서는 `task-definition-template.json` 쪽에 선언하고 Dockerfile의 HealthCheck는 의존도를 낮추기 위해 제외하여 응집도를 높이는 것을 추천합니다.

### 💡 Tech Lead의 머지(Merge) 권고
- [ ] 이대로 Main 브랜치에 머지해도 좋습니다.
- [x] Critical 항목이 수정되기 전까지 머지를 보류하세요.
