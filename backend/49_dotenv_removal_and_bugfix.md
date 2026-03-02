# [49] .env 의존성 제거 및 버그 수정

**작업일**: 2026-03-03  
**담당**: Backend Agent

---

## 완료한 작업

### 1. `.env` 의존성 완전 제거 (`src/secrets_manager.py`)

- `_load_from_dotenv()` 함수 및 모든 호출부 삭제
- `APP_ENV` 분기 로직 제거 — 로컬/프로덕션 구분 없이 **항상 AWS Secrets Manager 사용**
- **Skip 조건**: `OPENAI_API_KEY`, `PINECONE_API_KEY`가 이미 환경에 존재하면 SM 호출 생략 (ECS native secrets injection 호환)
- SM 로드 실패 시 앱 기동 중단 (치명적 오류로 처리, `raise` 전파)
- 리전 기본값 `"us-east-1"` 명시 추가

> ⚠️ **로컬 개발 환경 변경사항**  
> 이제 `.env` 파일이 동작하지 않습니다.  
> 로컬 실행 시 `~/.aws/credentials` 또는 아래 환경변수가 필요합니다:
> ```
> AWS_ACCESS_KEY_ID=...
> AWS_SECRET_ACCESS_KEY=...
> AWS_REGION=us-east-1
> SECRET_NAME=short-cut/prod/app   # 기본값, 생략 가능
> ```

---

### 2. `analyze_service.py` — `Optional` import 누락 수정

- `from typing import AsyncGenerator, Optional` 추가
- 없으면 함수 시그니처 파싱 단계에서 `NameError` 발생

---

### 3. `main.py` — 존재하지 않는 `config.llm` 참조 수정

- `config.llm.model_name` → `config.agent.analysis_model`으로 교체
- `PatentGuardConfig`에 `llm` 필드가 없어 `lifespan` 내에서 `AttributeError` 발생 → 앱 기동 실패 원인이었음

---

### 4. `database/models.py` — `UserSession` 모델 `user_id` 컬럼 추가

- `user_id = Column(Integer, nullable=True, index=True)` 추가
- `history_manager.py`가 `UserSession(user_id=...)` 생성 및 `UserSession.user_id` 필터를 사용하는데 컬럼이 없어 `OperationalError` 발생
- Auth 완성 시 `User` 모델 + FK로 교체 예정 (현재는 nullable 정수 컬럼으로 임시 처리)

---

## 다음 단계 권장사항

- **Auth 구현**: `auth_router.py`, `LoginForm.tsx`, `SignupForm.tsx` 등 stub 파일 실구현
- **Alembic 마이그레이션 실행**: `UserSession.user_id` 컬럼 추가로 DB 스키마 변경 필요 (`alembic upgrade head`)
- **로컬 개발 가이드 업데이트**: `.env` 대신 AWS 자격증명 설정 방법을 팀에 공유

---

## PM 에이전트 상태 업데이트 요약

- ✅ `.env` 파일 의존성 제거 완료 — AWS Secrets Manager 단일화
- ✅ 앱 기동 실패 버그 3건 수정 (`ImportError`, `AttributeError`, `OperationalError`)
- 🔲 Auth 기능 구현 대기 중 (다음 세션에서 진행 예정)
- 🔲 Alembic 마이그레이션 실행 필요 (DevOps 또는 배포 시 `alembic upgrade head`)
