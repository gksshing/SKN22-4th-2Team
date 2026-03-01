### 🛠️ 코드베이스 분석 결과

현재 백엔드 코드(`src/history_manager.py` 및 `src/api/v1/router.py`)를 분석한 결과, 히스토리 조회 기능이 기본적으로 세션/사용자 단위로 잘 구축되어 있지만 확장 쿼리가 누락되어 있고 알림 파이프라인이 부재함을 확인했습니다.

**개선 방향 및 계획:**
1. **히스토리 API 고도화 (Filtering & Sorting):**
   - `src/history_manager.py`의 `load_recent` 메서드에 `keyword`, `sort_by` 파라미터를 추가하고 SQLAlchemy 쿼리에 `ilike` 필터와 조건부 `order_by`를 적용합니다.
   - `src/api/v1/router.py`의 `get_history` 엔드포인트에 FastAPI `Query` 파라미터를 추가하여 프론트엔드에서 검색어 및 정렬 옵션을 유연하게 전달받을 수 있도록 변경합니다.
2. **이메일 알림 API 추가 (Mocking/Integration):**
   - `src/api/schemas/request.py`에 이메일 발송 요청을 위한 Pydantic 스키마(`EmailNotificationRequest`)를 신규 정의합니다.
   - `src/api/v1/router.py`에 `POST /notify/email` 엔드포인트를 추가합니다. 초기 단계이므로 SMTP 연동 전, 로거(Logger)를 활용해 "이메일 발송 흉내(Mocking)"를 내고 HTTP 200 OK를 반환하는 논블로킹(BackgroundTasks 활용) 구조를 뼈대로 작성하겠습니다.

### 📋 PM 및 DevOps 전달용 백로그
- **Epic: 멀티테넌시 및 마이데이터 확장 (Backend)**
  - [ ] `GET /api/v1/history` 엔드포인트 파라미터 추가 (`keyword`, `sort_by`)
  - [ ] `HistoryManager.load_recent` SQLAlchemy 동적 쿼리 및 정렬 기능 구현
- **Epic: 외부 알림 시스템 연동 (Backend)**
  - [ ] `POST /api/v1/notify/email` 엔드포인트 생성
  - [ ] Pydantic 검증 로직 및 FastAPI `BackgroundTasks`를 통한 이메일 발송 Mocking 구현
- **Epic: 컨테이너 및 인프라 구축 (DevOps에게 전달할 사항)**
  - [ ] 추후 실제 이메일 연동 시 AWS SES 등 이메일 발송 권한(IAM) 및 SMTP 환경 변수 구성 요청 예정
