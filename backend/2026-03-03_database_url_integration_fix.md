# DATABASE_URL 코드 연동 검증 및 수정

**날짜:** 2026-03-03  
**작업자:** Antigravity (Backend Agent)  
**대상 브랜치:** develop

---

## 🔍 검증 결과 요약

### AWS Secrets Manager 상태

| 항목 | 값 | 상태 |
|---|---|---|
| Secret Name | `short-cut/prod/app` | ✅ 존재 |
| Region | `ap-northeast-2` | ✅ 정상 |
| `DATABASE_URL` 포함 여부 | `postgresql://shortcut_admin:***@short-cut-db.c7goqum42vcp.ap-northeast-2.rds.amazonaws.com:5432/shortcut` | ✅ 등록됨 |
| `JWT_SECRET_KEY` | 존재 | ✅ |
| `OPENAI_API_KEY` | 존재 | ✅ |
| `PINECONE_API_KEY` | 존재 | ✅ |

---

## 🐛 발견된 버그: 타이밍 경쟁 (Race Condition)

### 문제 원인

```
main.py
  └─ bootstrap_secrets()  ← Secrets Manager에서 DATABASE_URL 주입
  └─ from src.database.connection import Base, engine  ← 이미 해결됨?
```

**핵심 BUG:** `connection.py`의 기존 코드는 **모듈 임포트 시점**에 `os.environ.get("DATABASE_URL")`을 고정 실행하였습니다.

```python
# ❌ 기존 코드 (버그)
DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_DB_URL)  # 임포트 시점에 고정!
engine = create_engine(DATABASE_URL, ...)  # 항상 SQLite로 생성될 위험
```

`bootstrap_secrets()`가 `main.py`에서 먼저 호출되더라도, Python 모듈 캐싱으로 인해 `connection.py`가 **다른 곳에서 먼저 임포트될 경우** Secrets Manager 주입 이전의 값(`None` → SQLite 폴백)으로 엔진이 고정됩니다.

### 실제 발생 시나리오
1. ECS 컨테이너 시작 → `uvicorn src.api.main:app` 실행
2. `main.py`가 `bootstrap_secrets()` 호출 전, `from src.database.connection import ...` 과정에서 `dependencies.py` 등 중간 모듈이 먼저 `connection.py`를 임포트
3. `DATABASE_URL`이 `None`인 상태 → SQLite 경로로 엔진 생성 완료
4. `bootstrap_secrets()`가 뒤늦게 `os.environ["DATABASE_URL"]`을 주입해도 이미 SQLite 엔진은 고정된 상태

---

## ✅ 수정 내역

### 1. `src/database/connection.py` — Lazy 초기화 패턴 적용

**변경 전:**
```python
DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_DB_URL)  # 임포트 시 고정
engine = create_engine(DATABASE_URL, ...)
SessionLocal = sessionmaker(..., bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**변경 후:**
```python
_engine = None
_SessionLocal = None

def _get_engine():
    """최초 호출 시점에 DATABASE_URL을 읽어 엔진 생성 (Lazy)"""
    global _engine, _SessionLocal
    if _engine is not None:
        return _engine
    database_url = os.environ.get("DATABASE_URL", _DEFAULT_DB_URL)
    # postgresql:// → postgresql+psycopg2:// 자동 정규화
    ...
    _engine = create_engine(database_url, pool_pre_ping=True, pool_recycle=1800, ...)
    return _engine

def get_db() -> Generator[Session, None, None]:
    _get_engine()  # bootstrap_secrets() 이후 보장
    db = _SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
```

**추가 기능:**
- `pool_pre_ping=True` — RDS 재시작 후 stale 커넥션 자동 감지
- `pool_recycle=1800` — 30분 idle timeout 대응
- `verify_db_connection()` — `SELECT 1` 헬스체크 함수 추가
- `postgresql://` → `postgresql+psycopg2://` 자동 변환 (드라이버 명시화)
- 에러 발생 시 `db.rollback()` 자동 처리

### 2. `src/api/main.py` — get_engine() 참조 방식 변경

**변경 전:**
```python
from src.database.connection import Base, engine
await run_in_threadpool(Base.metadata.create_all, bind=engine)
```

**변경 후:**
```python
from src.database.connection import Base, get_engine, verify_db_connection
await run_in_threadpool(Base.metadata.create_all, bind=get_engine())

# DB 연결 검증 로그 추가
db_status = await run_in_threadpool(verify_db_connection)
logger.info("DB 연결 검증: type=%s, host=%s", db_status["db_type"], db_status["url_hint"])
```

**`/health` 엔드포인트 응답 개선:**
```json
{
  "status": "ok",
  "message": "Healthy",
  "database": {
    "ok": true,
    "db_type": "postgresql",
    "url_hint": "short-cut-db.c7goqum42vcp.ap-northeast-2.rds.amazonaws.com:5432/shortcut"
  }
}
```

---

## 📋 검증 방법

ECS 재배포 후 아래 명령으로 DB 연결 상태를 확인하세요:

```bash
# ALB URL로 헬스체크
curl https://<ALB_URL>/health

# 예상 응답 (PostgreSQL 정상 연결 시)
{
  "status": "ok",
  "database": {
    "ok": true,
    "db_type": "postgresql"
  }
}
```

SQLite 폴백이 발생하는 경우 `db_type`이 `"sqlite"`로 노출되어 즉시 감지 가능합니다.

---

## 🔄 다음 단계 권장 사항

- [ ] DevOps 에이전트: ECS Task Definition 재배포 트리거 (현재 패치를 ECR에 반영)
- [ ] 재배포 후 `/health` 엔드포인트에서 `db_type: "postgresql"` 확인
- [ ] RDS 보안 그룹에서 ECS Task의 Security Group으로부터 5432 포트 인바운드 허용 여부 재확인
