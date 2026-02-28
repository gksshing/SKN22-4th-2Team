# 🔥 Permission Denied 근본 원인 분석 및 수정

**작업일**: 2026-02-28  
**작업자**: Backend / DevOps Agent  
**수정 커밋**: `ce2b475`  
**브랜치**: `develop`

---

## 1. 에러 재현 확인

CloudWatch 로그 (2026-02-28 00:15):
```
{"level": "ERROR", "logger": "src.api.middleware",
 "message": "[SecurityMiddleware] Unexpected error:
  [Errno 13] Permission denied: '/home/appuser'"}
```

---

## 2. 근본 원인 분석

### ❌ 직전 수정(`5081a04`)이 부족했던 이유

| 이전 수정 내용 | 문제 |
|---|---|
| `--create-home` 추가 | `/home/appuser` 디렉토리 **생성**은 됨 |
| `chown /home/appuser` 추가 | 홈 디렉토리 **권한**은 맞음 |
| `.cache` 서브디렉토리 미처리 | ❌ **`.cache` 디렉토리가 없어서 쓰기 실패** |

### 🎯 진짜 원인: `tiktoken` 런타임 캐시 쓰기 시도

`openai` SDK 사용 시 내부적으로 `tiktoken` 라이브러리가 작동:
1. 첫 API 호출 시 토크나이저(cl100k_base)를 다운로드
2. 기본 캐시 경로: `~/.cache/tiktoken_cache` → `/home/appuser/.cache/tiktoken_cache`
3. `/home/appuser/.cache` 디렉토리가 **빌드타임에 생성되지 않았기 때문**에 Permission denied 발생

에러가 `SecurityMiddleware`의 `except Exception`에서 잡힌 이유: 미들웨어가 본문을 읽은 뒤 하위 앱으로 디스패치할 때 예외가 전파됨.

---

## 3. 수정 내용 (Dockerfile)

```diff
+ ENV XDG_CACHE_HOME="/app/.cache" \
+     TIKTOKEN_CACHE_DIR="/app/.cache/tiktoken" \
+     HF_HOME="/app/.cache/huggingface"

- RUN mkdir -p /app/src/data /app/src/logs
+ RUN mkdir -p /app/src/data /app/src/logs /app/.cache/tiktoken /app/.cache/huggingface

+ # 빌드타임에 tiktoken 토크나이저 사전 다운로드 (런타임 캐시 쓰기 방지)
+ RUN TIKTOKEN_CACHE_DIR=/app/.cache/tiktoken \
+     python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')"

  RUN chown -R appuser:appgroup /app /home/appuser  # /app/.cache 포함
```

### 수정 전략
- **`XDG_CACHE_HOME=/app/.cache`**: Linux 표준 캐시 환경변수를 앱 디렉토리로 리다이렉트. `~/.cache` 접근 원천 차단
- **빌드타임 워밍업**: `tiktoken.get_encoding('cl100k_base')` 빌드 시 실행 → ECR 이미지에 캐시 파일 포함
- **chown 범위**: `/app` 전체에 `chown` 적용하므로 `/app/.cache`도 자동 포함

---

## 4. 검증 기준

ECS 배포 완료 후:
- AWS CloudWatch → `/ecs/short-cut-api` → 신규 태스크 스트림
- `Permission denied: '/home/appuser'` → **0건** 확인

---

## 5. 재발 방지

서드파티 라이브러리가 `~/.cache`에 쓰는 패턴 → **항상** 아래 조합 사용:
```dockerfile
ENV XDG_CACHE_HOME="/app/.cache"
RUN mkdir -p /app/.cache && chown -R appuser /app
```
