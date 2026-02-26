# 🔍 코드 리뷰 — 08. OpenAI API 비동기 처리 및 예외 처리/로깅 강화

> **리뷰어:** 수석 아키텍트 (15년 차)  
> **리뷰 대상:** `src/patent_agent.py`, `src/utils.py`, `tests/test_patent_agent_error_handling.py`  
> **리뷰 일시:** 2026-02-26  

---

### 🔍 총평 (Architecture Review)

전체적으로 **잘 설계된 리팩토링**입니다. 3개의 공통 래퍼(`_call_openai`, `_call_openai_stream`, `_call_embed`)로 API 호출을 중앙 집중시키고, `tenacity` 기반 exponential backoff + 예외 분류(`BadRequestError` 즉시 실패 vs `RateLimitError`/`APITimeoutError` 재시도)를 일관되게 적용한 점은 프로덕션 수준의 안정성을 확보하는 올바른 접근입니다. 구조화 로깅(`OpenAICallMetrics` + JSON 포매터)을 통해 CloudWatch 등 로그 파이프라인에 바로 연동 가능한 관측 가능성(Observability) 기반도 갖추었습니다. 다만, 아래와 같은 **경미한 개선 포인트**들이 확인됩니다.

---

### 🚨 코드 리뷰 피드백 (개발 에이전트 전달용)
*아래 내용을 복사해서 Backend 에이전트에게 전달하세요*

**[🔴 Critical: 치명적 결함 - 즉시 수정 필요]**

- 없음 ✅ — 치명적 수준의 결함은 발견되지 않았습니다.

---

**[🟡 Warning: 잠재적 위험 - 개선 권장]**

- `utils.py:26` — `_JsonFormatter.format()` 내부에서 `__import__('datetime').timezone.utc`로 timezone을 동적 임포트하고 있습니다. 이 방식은 **매 로그 출력마다 `__import__`를 호출**하여 불필요한 오버헤드를 발생시킵니다. 파일 상단에 이미 `from datetime import datetime`가 있으므로, `datetime.timezone.utc` 대신 `from datetime import timezone`을 상단에 추가하고 `timezone.utc`로 직접 참조하도록 수정하세요.

  ```python
  # 수정 전
  "timestamp": datetime.now(tz=__import__('datetime').timezone.utc).isoformat(),
  
  # 수정 후 (상단에 from datetime import datetime, timezone 추가)
  "timestamp": datetime.now(tz=timezone.utc).isoformat(),
  ```

- `patent_agent.py:305` — `_RETRYABLE_EXCEPTIONS`를 `except` 절에서 **튜플 변수로 참조**하고 있습니다. Python의 `except` 문은 튜플 리터럴 또는 단일 예외 클래스를 기대하지만, 모듈 수준 변수를 사용하는 것도 동작하긴 합니다. 다만, 이 구조에서 `_RETRYABLE_EXCEPTIONS` catch가 `tenacity`의 retry 데코레이터 **이전에** 실행되어 **retry 전에 로그가 2중으로 기록**될 수 있습니다. retry 시도마다 except 블록에서 `log_api_call`을 호출하고, `before_sleep_log`도 WARNING을 기록하므로, 동일 에러에 대해 **3~6줄의 중복 로그**가 발생할 수 있습니다. 운영 환경에서 로그 볼륨이 과도해질 수 있으니, retry 내부의 except 블록에서는 `log_api_call`을 호출하지 않고, 최종 실패 시에만 기록하는 방안을 검토하세요.

- `patent_agent.py:832-875` — `rewrite_query()` 메서드는 `_call_openai`를 호출하지만, **JSON 파싱 실패 시에만 예외를 catch**하고 있습니다. `_call_openai`가 래퍼 내부에서 retry 후에도 실패하면 예외가 호출자(`search_with_grading`)까지 전파됩니다. `grade_results()`는 외부 try-except이 있지만 `rewrite_query()`에는 API 호출 자체의 예외 처리가 없으므로, 최소한 기본 `QueryRewriteResponse(optimized_query=user_idea, ...)` 반환 fallback을 추가하세요.

- `patent_agent.py:473-490` — `_fetch_by_ids_safe()`에 `retry_if_exception_type(Exception)`이 적용되어 있어, **모든 예외**에 대해 5회까지 재시도합니다. `ValueError` (부분 검색 결과)뿐 아니라, 논리 오류(`TypeError`, `AttributeError` 등)도 재시도 대상이 되어 불필요한 지연이 발생할 수 있습니다. `retry_if_exception_type((ValueError, ConnectionError))`처럼 대상을 좁히는 것을 권장합니다.

---

**[🟢 Info: 클린 코드 및 유지보수 제안]**

- `patent_agent.py:71-74` — `OPENAI_API_KEY`를 `os.environ.get()`으로 읽은 후 빈 문자열 체크를 하고 있으나, `.env` 미로딩 시에도 빈 문자열 `""`로 통과됩니다. `os.environ.get("OPENAI_API_KEY")` 결과가 `None`인 경우와 `""`인 경우를 모두 처리하려면 `or None` 패턴을 쓰거나, `__init__`의 `if not OPENAI_API_KEY:` 체크와 일관되게 처리하세요. 현재 구현은 동작하지만, `""` 값이 의도된 것인지 혼동을 줄 수 있습니다.

- `patent_agent.py:365` — 스트리밍 래퍼의 `completion_tokens = chunk_count`로 **chunk 수를 토큰 수 근사값으로 기록**하고 있습니다. 주석에 "근사값"이라 명시한 점은 좋으나, 실제 chunk 1개 = 토큰 1개가 아닌 경우가 많습니다 (특히 한국어). 메트릭 필드명을 `estimated_chunks`로 변경하거나, 로그 출력 시 `(approx)` 표기를 추가하면 운영팀의 혼동을 줄일 수 있습니다.

- `patent_agent.py:248-253` — `_call_openai`의 `@retry` 데코레이터에 `before_sleep=before_sleep_log(logger, log_level=30)`에서 `30`이라는 매직 넘버를 사용합니다. `logging.WARNING`으로 대체하면 가독성이 향상됩니다.

- `tests/test_patent_agent_error_handling.py:18` — 테스트 파일에서 `os.environ.setdefault("OPENAI_API_KEY", "test-key-for-unit-tests")`로 API 키를 설정합니다. 기능적으로 문제는 없지만, `conftest.py`에 fixture로 이동하면 테스트 격리성이 더 향상됩니다.

- `tests/test_patent_agent_error_handling.py` — **Happy Path 테스트 커버리지**가 부족합니다. 현재 7개 테스트는 모두 에러 시나리오에 집중되어 있으나, 정상 호출 → 정상 응답 → 정상 로깅의 통합 흐름 테스트(예: `analyze()` E2E mock 테스트)가 있으면 회귀 방지에 더 효과적입니다.

---

### ✅ 잘한 점 (Highlights)

| 항목 | 평가 |
|------|------|
| `_call_openai` / `_call_openai_stream` / `_call_embed` 3개 래퍼 패턴 | ⭐⭐⭐ 중앙 집중화로 DRY 원칙 준수 |
| `BadRequestError` 즉시 실패 vs 일시적 에러 재시도 분리 | ⭐⭐⭐ 토큰 초과에 재시도하는 안티패턴 방지 |
| `OpenAICallMetrics` dataclass + JSON 포매터 | ⭐⭐⭐ CloudWatch 연동 용이한 관측성 |
| `generate_hypothetical_claim`의 프롬프트 축소 fallback | ⭐⭐ 파이프라인 중단 방지 |
| `httpx.Timeout(60.0, connect=10.0)` 전역 타임아웃 | ⭐⭐⭐ 이벤트 루프 블로킹 방지 |
| 7개 단위 테스트 전체 통과 | ⭐⭐ 핵심 시나리오 커버 |

---

### 💡 Tech Lead의 머지(Merge) 권고

- [x] **이대로 Main 브랜치에 머지해도 좋습니다.**
- [ ] Critical 항목이 수정되기 전까지 머지를 보류하세요.

> 🟡 Warning 항목들은 **머지 후 후속 이터레이션**에서 개선해도 무방합니다.  
> 특히 로그 중복 이슈(`_RETRYABLE_EXCEPTIONS` except 내 `log_api_call`)는 운영 단계에서 로그 볼륨을 모니터링한 뒤 조정해도 됩니다.
