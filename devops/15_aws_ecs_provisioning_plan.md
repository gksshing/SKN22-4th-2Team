# ☁️ 클라우드 배포 아키텍처 제안 (ECS Fargate 기반)

쇼특허(Short-Cut) API의 안정적인 프로덕션 서비스를 위해 다음과 같은 AWS 인프라 아키텍처를 제안합니다. 초기 배포 단계이므로 비용과 관리 복잡성을 줄이기 위해 서버리스 컴퓨팅인 **AWS Fargate**를 활용합니다.

## 1. 네트워크 및 트래픽 분산 (VPC & ALB)
- **VPC & Subnets**: 기존 VPC를 활용하거나 신규 VPC를 생성합니다. (Public Subnet x2, Private Subnet x2 권장)
- **Application Load Balancer (ALB)**: Public Subnet에 위치하며 인터넷 트래픽(HTTP/HTTPS)을 수신합니다.
- **Target Group**: ALB로 들어온 트래픽을 ECS Fargate 태스크의 8000번 포트로 라우팅합니다. (Health Check: `http://<target>:8000/health`)

## 2. 컨테이너 오케스트레이션 (ECS Cluster & Service)
- **ECS Cluster**: `short-cut-prod-cluster` (가칭)
- **Task Definition**: 
  - 현재 저장소의 `infra/ecs/task-definition-template.json` 활용
  - Compute: **Fargate** (0.5 vCPU, 1GB RAM)
  - 네트워크 모드: `awsvpc`
- **ECS Service**: ALB Target Group과 연결하여 지속적으로 태스크 실행 개수를 유지(Desired Count: 1~2)합니다. 배포 방식은 롤링 업데이트(Rolling Update)를 적용합니다.

## 3. 보안 및 권한 (IAM & Secrets Manager)
- **Task Execution Role (`ecsTaskExecutionRole`)**: ECR에서 도커 이미지를 가져오고 CloudWatch에 로그를 남길 수 있는 기본 권한
- **Task Role (`shortcut-ecs-task-role`)**: 애플리케이션 실행 중 필요한 권한. **AWS Secrets Manager**의 `short-cut/prod/app` 보안 암호를 읽을 수 있는 권한(`secretsmanager:GetSecretValue`)을 부여해야 합니다.
- **Security Groups**: 
  - ALB SG: 80/443 포트 전체 개방
  - ECS SG: ALB SG로부터의 8000번 포트 인바운드 트래픽만 허용

## 4. CI/CD 파이프라인 (GitHub Actions)
- `.github/workflows/ecr-cicd.yml`에 이미 ECS 배포 잡(`deploy-ecs-production`)이 구현되어 있습니다.
- 인프라 구성 완료 후 Github Secrets에 **`ECS_CLUSTER_PROD`**와 **`ECS_SERVICE_PROD`** 값을 추가하면, 다음 `main` 브랜치 푸시부터 배포 자동화가 완성됩니다.

---

### 📋 PM 에이전트 전달용 기술 백로그 (복사해서 PM에게 전달하세요)
- **Epic: AWS 인프라 프로비저닝**
  - [ ] VPC/Subnet 및 보안 그룹(ALB, ECS용) 구성 
  - [ ] 도메인 연결을 위한 ALB(Application Load Balancer) 구성 및 타겟 그룹 생성
  - [ ] AWS Secrets Manager 연동을 위한 Task Role(`shortcut-ecs-task-role`) 생성 및 권한 부여
  - [ ] ECS 클러스터 및 Fargate Task Definition 새 버전 세팅 (`infra/ecs/task-definition-template.json` 활용)
  - [ ] ECR 이미지와 ALB를 연결하는 ECS Service 배포
- **Epic: CI/CD 및 보안**
  - [ ] GitHub Repository Secrets에 `ECS_CLUSTER_PROD`, `ECS_SERVICE_PROD` 변수 추가
  - [ ] main 브랜치 푸시 및 ECS 자동 배포(CD) 성공 여부 최종 확인
