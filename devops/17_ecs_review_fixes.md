# 🔧 ECS 프로비저닝 코드 리뷰 수정 결과

`review/15_ecs_provisioning_review.md` 피드백을 바탕으로 아래 수정 사항을 적용했습니다.

## 🔴 Critical 수정 (2건)

### 1. 리전 불일치 해소 (`task-definition-template.json`)
- `AWS_REGION` 환경 변수: `us-east-1` → `ap-northeast-2`
- `awslogs-region`: `us-east-1` → `ap-northeast-2`

### 2. `<AWS_ACCOUNT_ID>` 치환 스텝 추가 (`ecr-cicd.yml`)
- `amazon-ecs-render-task-definition` 호출 전에 `sed`로 `<AWS_ACCOUNT_ID>`를 `${{ secrets.AWS_ACCOUNT_ID }}`로 치환하는 스텝을 삽입

## 🟡 Warning 수정 (2건)

### 3. ECS 배포 타임아웃 제한 (`ecr-cicd.yml`)
- `deploy-ecs-production` 잡의 배포 스텝에 `timeout-minutes: 5` 추가하여 CrashLoop 시 무한 대기/과금 방지

### 4. Health Check startPeriod 조정 (`task-definition-template.json`)
- `startPeriod`: `20` → `30`초로 조정하여 앱 기동 시간 여유 확보

## 🟢 Info 수정 (1건)

### 5. Dockerfile HEALTHCHECK 제거
- ECS `task-definition-template.json`에서만 Health Check를 관리하도록 일원화
- Dockerfile의 `HEALTHCHECK` 지시어를 제거하여 관리 포인트 분산 해소
