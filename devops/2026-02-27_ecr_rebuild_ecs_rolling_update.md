# ☁️ ECR 재빌드 & ECS 롤링 업데이트 배포 보고서

**작업일**: 2026-02-27  
**작업자**: DevOps Agent (Antigravity)  
**배포 브랜치**: `develop`  
**목적**: `Permission denied: /home/appuser` 에러 해결을 위한 신규 Docker 이미지 재빌드 및 ECS 롤링 업데이트 적용

---

## 1. 배포 배경 및 원인

| 항목 | 내용 |
|------|------|
| **에러 메시지** | `[Errno 13] Permission denied: '/home/appuser'` |
| **발생 위치** | CloudWatch → ECS 태스크 로그 |
| **근본 원인** | Dockerfile에서 `adduser --no-create-home` 옵션 사용으로 `/home/appuser` 홈 디렉토리 미생성 |
| **수정 커밋** | `5081a04` (2026-02-27 14:45 UTC) |

### 수정 내용 요약 (Dockerfile)
```diff
- RUN adduser --disabled-password --no-create-home --gecos "" appuser
+ RUN adduser --disabled-password --create-home --gecos "" appuser

+ RUN mkdir -p /app/src/data /app/src/logs
  RUN chown -R appuser:appuser \
+     /home/appuser \
      /app
```

---

## 2. 배포 트리거

- **방식**: 빈 커밋(empty commit) push → GitHub Actions 자동 실행
- **트리거 커밋**: `e3b07e3` (`ci: ECR 재빌드 및 ECS 롤링 업데이트 강제 트리거`)
- **워크플로우 파일**: `.github/workflows/ecr-cicd.yml`
- **GitHub Actions Run**: [#37 - In Progress](https://github.com/gksshing/SKN22-4th-2Team/actions/runs/22491071676)

---

## 3. 파이프라인 실행 현황

| Job | 상태 | 소요 시간 |
|-----|------|-----------|
| 🚀 Production 빌드/푸시 (develop) | ✅ 성공 | 39초 |
| 🏗️ ECS 서비스 업데이트 (Production) | 🔄 진행 중 | ~10분+ |
| 🚀 Staging 빌드/푸시 (develop) | ⏭️ Skip (비활성) | 0초 |

### ECS 배포 대상
- **클러스터**: `short-cut-prod-cluster`
- **서비스**: `short-cut-api-service-d7flqqqv`
- **배포 방식**: Rolling Update (기존 태스크 드레이닝 후 신규 태스크 기동)

---

## 4. 검증 기준

### ✅ 검증 성공 조건
CloudWatch Logs의 `/ecs/short-cut-api` 로그 그룹에서 아래 에러가 **더 이상 출력되지 않을 것**:
```
[Errno 13] Permission denied: '/home/appuser'
```

### 검증 방법
1. AWS Console → CloudWatch → Log Groups → `/ecs/short-cut-api`
2. ECS 서비스 업데이트 완료 후(안정화 확인) 최신 로그 스트림 확인
3. `Permission denied` 키워드 검색 결과 `0건`이면 검증 완료

---

## 5. 롤백 계획

ECS 서비스가 불안정하거나 신규 에러 발생 시:
```bash
# 이전 Task Definition 리비전으로 롤백
aws ecs update-service \
  --cluster short-cut-prod-cluster \
  --service short-cut-api-service-d7flqqqv \
  --task-definition short-cut-api:<이전_리비전_번호> \
  --force-new-deployment \
  --region $AWS_REGION
```

---

**다음 단계**: ECS 배포 완료 후 CloudWatch 로그 검토 → Permission denied 에러 소멸 확인
