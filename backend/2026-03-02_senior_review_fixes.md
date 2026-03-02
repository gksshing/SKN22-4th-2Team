# 🛠️ 시니어 아키텍트 리뷰 반영 및 최적화 리포트 (2026-03-02)

수석 아키텍트의 리뷰 피드백을 바탕으로 백엔드 시스템의 안정성과 보안성을 강화하는 작업을 수행했습니다.

## 1. 주요 수정 사항

### 🔴 이벤트 루프 블로킹 해결 (Critical)
- **대상**: `src/api/v1/auth_router.py`
- **문제**: 소셜 로그인 콜백 핸들러가 `async def`임에도 불구하고 내부에서 동기식 DB 처리(`sqlalchemy.orm.Session`)를 수행하여 전체 서버 성능 저하 위험이 있었습니다.
- **해결**: `handle_social_login` 로직을 동기 함수로 전환하고, FastAPI의 `run_in_threadpool`을 사용하여 별도 스레드 풀에서 안전하게 실행되도록 구조를 개선했습니다.

### 🟡 설정 관리 체계 일관성 확보 (Warning)
- **대상**: `src/api/services/social_auth.py`, `src/config.py`
- **문제**: 소셜 로그인 API 키를 `os.getenv`로 직접 참조하여 프로젝트의 표준 설정 관리 방식에서 벗어나 있었습니다.
- **해결**: `src/config.py`에 `SocialAuthConfig` 클래스를 추가하고, 모든 소셜 로그인 관련 설정을 `config` 객체를 통해 일관되게 관리하도록 리팩토링했습니다.

### 🟢 스타트업 성능 최적화 (Info)
- **대상**: `src/api/main.py`
- **문제**: 앱 시작 시 DB 초기화(`create_all`)가 메인 스레드에서 동기적으로 실행되어 스타트업 지연 가능성이 있었습니다.
- **해결**: `lifespan` 내의 DB 초기화 로직을 `run_in_threadpool`로 감싸 비동기적으로 처리함으로써 시스템 가동 효율을 높였습니다.

## 2. 향후 권장 사항
- **Async DB 드라이버 검토**: 현재는 스레드 풀을 통해 동기 연산을 처리하고 있으나, 향후 고부하 상황을 대비하여 `SQLAlchemy`의 비동기 기능을 활용하는 `AsyncSession` 도입을 권장합니다.
