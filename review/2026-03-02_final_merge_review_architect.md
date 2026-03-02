### 🔍 총평 (Architecture Review)
이번 작업으로 DB 자동 초기화와 프론트엔드 소셜 로그인 리다이렉트 이슈가 해결되어 서비스의 기본 동작성이 확보되었습니다. 다만, 비동기 핸들러 내부에서 동기식 DB 호출이 발생하여 이벤트 루프를 블로킹할 위험이 발견되었습니다. 이는 고부하 환경에서 서버 전체의 응답 지연을 초래할 수 있는 치명적인 결함이므로 수정이 필요합니다.

### 🚨 코드 리뷰 피드백 (개발 에이전트 전달용)
*(아래 내용을 복사해서 Backend 에이전트에게 전달하세요)*

**[🔴 Critical: 치명적 결함 - 즉시 수정 필요]**
- `src/api/v1/auth_router.py:135` - `handle_social_login` 함수가 `async def`로 선언되어 있으나 내부에서 `db.query`, `db.commit` 등 동기식 DB 연산을 수행합니다. 이는 FastAPI의 이벤트 루프를 블로킹합니다.
- **해결책**: 해당 로직을 `from fastapi.concurrency import run_in_threadpool`을 사용하여 별도 스레드 풀에서 실행하거나, DB 로직만 별도의 `def` 함수로 분리하여 `run_in_threadpool`로 감싸 호출하세요.

**[🟡 Warning: 잠재적 위험 - 개선 권장]**
- `src/api/services/social_auth.py:10-20` - 소셜 로그인 API 키를 `os.getenv`로 직접 참조하고 있습니다. 
- **해결책**: 프로젝트의 표준인 `src.config.config` 객체를 통해 환경 변수를 관리하도록 리팩토링하여 설정 관리의 일관성을 유지하세요.

**[🟢 Info: 클린 코드 및 유지보수 제안]**
- `src/api/main.py:79` - `Base.metadata.create_all`이 `lifespan` 내부에서 동기적으로 실행됩니다. 현재 규모에서는 문제없으나, 향후 DB 네트워크 지연 시 스타트업 시간이 길어질 수 있습니다.

### 💡 Tech Lead의 머지(Merge) 권고
- [ ] 이대로 Main 브랜치에 머지해도 좋습니다.
- [x] Critical 항목(이벤트 루프 블로킹)이 수정되기 전까지 머지를 보류하세요.
