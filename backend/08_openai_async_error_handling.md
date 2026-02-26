# 08. OpenAI API 비동기 처리 및 예외 처리/로깅 강화

> **Issue:** #1 — RAG 고도화  
> **날짜:** 2026-02-26  
> **담당:** Backend  

---

## 1) 완료한 작업 내역

### `src/utils.py` — 구조화 로깅 유틸리티 추가
- `get_structured_logger()` — JSON 형식 로거 팩토리
- `OpenAICallMetrics` — API 호출 메트릭 dataclass (모델, 소요시간, 토큰 사용량, 에러 정보)
- `log_api_call()` — 성공/실패 분기 로깅 헬퍼

### `src/patent_agent.py` — 공통 API 래퍼 3개 + 7개 메서드 리팩토링

| 래퍼 메서드 | 용도 |
|------------|------|
| `_call_openai()` | chat.completions (비스트리밍) |
| `_call_openai_stream()` | chat.completions (스트리밍) |
| `_call_embed()` | embeddings |

**적용 내용:**
- `@retry` — `wait_random_exponential(min=1, max=30)`, `stop_after_attempt(3)`
- retry 대상: `RateLimitError`, `APITimeoutError`, `APIConnectionError`
- retry 제외: `BadRequestError` (토큰 초과 등)
- 모든 호출에 `time.perf_counter()` 기반 소요시간 + `response.usage` 토큰 로깅
- `generate_hypothetical_claim()` — BadRequestError 시 프롬프트 축소 fallback
- `critical_analysis_stream()` — 스트림 에러 시 에러 메시지 yield

### `tests/test_patent_agent_error_handling.py` — 7개 테스트 케이스
1. RateLimitError 2회 → 3회째 성공 (retry 동작)
2. BadRequestError 즉시 실패 (retry 안 함)
3. APITimeoutError 3회 소진 → 최종 예외 전파
4. 토큰 사용량 로깅 검증 (`log_api_call` mock)
5. `_call_embed` RateLimitError retry
6. `generate_hypothetical_claim` BadRequestError fallback
7. `critical_analysis_stream` 에러 메시지 yield

**테스트 결과: ✅ 7 passed, 0 warnings (8.99s)**

---

## 2) 다음 단계 권장 사항
- 실제 API 키 환경에서 E2E 테스트 수행 → 구조화된 로그 출력 확인
- 운영 환경에서 로그 수집 파이프라인 (CloudWatch 등) 연동 검토

---

## 3) PM 에이전트 전달용 상태 업데이트

```
Issue #1 "OpenAI API 비동기 처리 및 예외 처리/로깅 강화" 구현 완료.
- 모든 OpenAI API 호출에 retry (exponential backoff) + 예외별 핸들링 적용
- 구조화된 로깅 (요청 시간, 토큰 사용량, 에러 타입) 적용
- 7개 자동화 테스트 전체 통과
- 상태: Done → Code Review 대기
```
