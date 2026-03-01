# ☁️ Epic 4 (Auth) Infrastructure & Security Plan

**날짜**: 2026-03-01
**담당**: 수석 DevOps 엔지니어

## 📋 개요
인증 시스템(Epic 4)의 안정적인 운영을 위해 AWS Secrets Manager를 활용한 민감 정보 격리 및 ECS 보안 강화를 수행합니다.

## 🛠️ 상세 계획

### 1. AWS Secrets Manager 구성 (Phase 1)
- **대상 시크릿 이름**: `short-cut/prod/auth`
- **저장 항목**:
  - `SECRET_KEY`: JWT 서명용 비밀키 (최소 32자 랜덤 문자열)
  - `ACCESS_TOKEN_EXPIRE_MINUTES`: `30` (기본값)
  - `REFRESH_TOKEN_EXPIRE_MINUTES`: `1440` (기본값)
  - `DB_PASSWORD`: 데이터베이스 접근 암호

### 2. ECS Task Definition 매핑 (Phase 1)
- ECS 작업 정의의 `containerDefinitions` 섹션에 `secrets` 항목 추가
- **매핑 방식 (Native Injection)**:
  ```json
  "secrets": [
    { "name": "SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:region:account:secret:short-cut/prod/auth:SECRET_KEY::" },
    { "name": "ACCESS_TOKEN_EXPIRE_MINUTES", "valueFrom": "arn:aws:secretsmanager:region:account:secret:short-cut/prod/auth:ACCESS_TOKEN_EXPIRE_MINUTES::" }
  ]
  ```
- 이 방식은 `src/secrets_manager.py`의 fetch 로직을 거치지 않아도 Docker 환경 변수로 직접 주입되므로 성능과 보안 면에서 유리합니다.

### 3. 컨테이너 보안 강화 (Phase 2 예정)
- **Dockerfile 최적화**: 멀티 스테이지 빌드 적용 (이미지 크기 최소화)
- **권한 관리**: `USER appuser` 설정을 통해 컨테이너 내부의 root 권한 탈취 방지

## 📋 PM 에이전트 전달용 기술 백로그
- **Epic: AWS 인프라 및 보안**
  - [ ] AWS Secrets Manager에 인증용 Secret 생성 및 값 등록
  - [ ] ECS Task Definition에 Secrets Manager ARN 매핑 (환경변수 주입)
  - [ ] IAM Execution Role에 `secretsmanager:GetSecretValue` 권한 추가
