# ☁️ AWS ECS 프로비저닝 결과 보고서

Issue #15의 인프라 프로비저닝 계획에 따라 모든 AWS 리소스가 성공적으로 생성 및 연결되었습니다.

## 1. 생성된 네트워크 및 보안 리소스
- **ALB Security Group**: `sg-07328d1dac2209f5c` (80포트 Public 허용)
- **ECS Security Group**: `sg-0214c1ad591552f0e` (8000포트 ALB 허용)
- **Application Load Balancer (ALB)**: 
  - ARN: `arn:aws:elasticloadbalancing:ap-northeast-2:263636208782:loadbalancer/app/short-cut-alb/e5599b7333febf78`
  - DNS Endpoint: `http://short-cut-alb-183482512.ap-northeast-2.elb.amazonaws.com`
- **Target Group**: `arn:aws:elasticloadbalancing:ap-northeast-2:263636208782:targetgroup/short-cut-tg/21f4fd0e186ac755`

## 2. 생성된 IAM Roles
- **ecsTaskExecutionRole**: ECR 이미지 당겨오기 및 CloudWatch 로그 생성 권한 부여됨
- **shortcut-ecs-task-role**: `secretsmanager:GetSecretValue` 권한이 부여된 Task Role (AWS Secrets Manager에서 `short-cut/prod/app*` 읽기 가능)

## 3. ECS 클러스터 및 서비스 지정 내역
- **ECS Cluster**: `short-cut-prod-cluster`
- **ECS Service**: `short-cut-api-service`
- **배포 구성**: ALB Target Group 연결 및 Public Subnet 할당 (`assignPublicIp: ENABLED`) 완료. Fargate 컨테이너에서 인터넷(ECR) 아웃바운드 가능하도록 Public Subnet 활용 구성.

## 4. CI/CD 연동 및 파이프라인
- Github Repository Action Secrets에 **`ECS_CLUSTER_PROD`**와 **`ECS_SERVICE_PROD`** 변수가 성공적으로 주입되었습니다.
- 차후 `main` 브랜치에 코드가 병합(Merge)/푸시되면 Github Actions 파이프라인에서 자동으로 ECS 서비스에 컨테이너가 배포될 준비가 완료되었습니다.

---

### 📋 PM 에이전트 전달용 상태 업데이트
- **Epic: AWS 인프라 프로비저닝**
  - [x] VPC/Subnet 및 보안 그룹(ALB, ECS용) 구성 
  - [x] 도메인 연결을 위한 ALB(Application Load Balancer) 구성 및 타겟 그룹 생성
  - [x] AWS Secrets Manager 연동을 위한 Task Role(`shortcut-ecs-task-role`) 생성 및 권한 부여
  - [x] ECS 클러스터 및 Fargate Task Definition 새 버전 세팅 (`infra/ecs/task-definition-template.json` 활용)
  - [x] ECR 이미지와 ALB를 연결하는 ECS Service 배포
- **Epic: CI/CD 및 보안**
  - [x] GitHub Repository Secrets에 `ECS_CLUSTER_PROD`, `ECS_SERVICE_PROD` 변수 추가
  - [ ] main 브랜치 푸시 및 ECS 자동 배포(CD) 성공 여부 최종 확인 (Backend 에이전트 또는 PM 주도 테스트 예정)
