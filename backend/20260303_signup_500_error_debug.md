# 🐛 회원가입 500 에러 디버깅 보고서

**일자:** 2026-03-03  
**담당:** Backend AI Agent  
**태스크:** `POST /api/v1/auth/signup` 500 Internal Server Error 원인 분석 및 수정

---

## 1. 발견된 오류 (ECS 로그)

```
WARNING: (trapped) error reading bcrypt version  [passlib.handlers.bcrypt]
ERROR: 회원가입 처리 중 오류: password cannot be longer than 72 bytes
POST /api/v1/auth/signup → 500 Internal Server Error
```

---

## 2. 원인 분석

### 🔴 [원인 1] bcrypt 버전 충돌 (직접 원인)
- `passlib 1.7.4`는 `bcrypt 4.x`의 내부 구조 변경을 인식하지 못함
- passlib이 bcrypt 버전을 읽지 못해 내부적으로 잘못된 데이터 타입을 전달
- 이로 인해 실제 66비트짜리 패스워드(`2@shing2@`)에도 "72 bytes 초과" 오류가 발생
- **해결:** `bcrypt>=4.0.1` → `bcrypt==3.2.0`으로 버전 고정

```diff
# requirements-api.txt
- bcrypt>=4.0.1
+ bcrypt==3.2.0
```

### 🔴 [원인 2] `config.auth` 속성 부재 (코드 버그)
- `src/api/services/security.py`의 JWT 토큰 생성/검증 함수가 `config.auth.secret_key`, `config.auth.algorithm`을 참조
- 그러나 `src/config.py`의 `PatentGuardConfig`에 `auth` 필드(`AuthConfig`)가 **존재하지 않았음**
- 런타임에서 `AttributeError: 'PatentGuardConfig' object has no attribute 'auth'` 발생 가능성 존재
- **해결:** `src/config.py`에 `AuthConfig` 데이터클래스 추가 및 `PatentGuardConfig`에 연결

```python
# src/config.py 에 추가됨
@dataclass
class AuthConfig:
    """JWT 인증 설정 (Secrets Manager의 JWT_SECRET_KEY 환경 변수와 연동)"""
    secret_key: str = field(default_factory=lambda: os.environ.get("JWT_SECRET_KEY", "insecure-dev-secret-change-me"))
    algorithm: str = "HS256"
    access_token_expire_minutes: int = field(...)
    refresh_token_expire_minutes: int = field(...)
```

### 🟠 [원인 3] DB 연결 누락 - SQLite 폴백 동작 중 (아직 미수정)
- `src/database/connection.py`는 `DATABASE_URL` 환경 변수가 없으면 **로컬 SQLite 파일**로 폴백
- Secrets Manager(`short-cut/prod/app`) 및 ECS Task Definition 어디에도 `DATABASE_URL`이 설정되지 않음
- 현재 ECS에서 회원가입 시 유저 정보가 컨테이너 내부 SQLite에 저장 → **컨테이너 재시작 시 유저 消滅**
- **해결 필요:** DevOps 팀에 RDS(PostgreSQL) 엔드포인트 생성 요청 및 Secrets Manager에 `DATABASE_URL` 추가 요청

---

## 3. 완료된 수정 사항

| 파일 | 수정 내용 |
|------|-----------|
| `requirements-api.txt` | `bcrypt==3.2.0`으로 버전 고정 |
| `src/config.py` | `AuthConfig` 데이터클래스 추가, `PatentGuardConfig.auth` 필드 연결 |

---

## 4. 다음 단계 권장 사항 (DevOps 전달)

- [ ] AWS RDS(PostgreSQL) 인스턴스 생성 또는 기존 DB 엔드포인트 확인
- [ ] Secrets Manager(`short-cut/prod/app`)에 `DATABASE_URL` 키 추가
  - 예: `postgresql://user:password@rds-endpoint:5432/shortcut_db`
- [ ] 새 이미지 빌드(ECR 푸시) 및 ECS 서비스 재배포 요청

---

## 5. PM 에이전트 전달용 상태 업데이트

- ✅ `bcrypt` 버전 충돌 수정 완료 → 재배포 시 회원가입 bcrypt 에러 해소 예상
- ✅ `config.auth` 부재 버그 수정 완료 → JWT 토큰 발급/검증 정상화 예상
- 🔴 **블로커:** RDS `DATABASE_URL` 미설정 → 재배포해도 유저 데이터가 컨테이너 재시작 시 사라짐. DevOps 팀 협조 필요
