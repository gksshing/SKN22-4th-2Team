# 🔍 Senior Architect Review — Issue #51 스트리밍 UI 버그 최종 기획서

> **작성자**: 수석 아키텍트 (Senior Reviewer)
> **참조 문서**: `review/39_issue51_streaming_ui_fix.md`
> **작성일**: 2026-03-02

---

## 🔍 총평 (Architecture Review)

현재 Frontend의 `useRagStream.ts`는 웹 표준 SSE 파서가 올바르게 구현되어 있으나, Backend가 표준 SSE 포맷 대신 단순 JSON 라인(NDJSON)을 응답으로 내려 파싱이 실패합니다.
결과적으로 원시 JSON 문자열이 화면에 그대로 노출되는 치명적 UX 버그가 발생하고 있습니다.
**Backend의 스트리밍 응답 포맷을 SSE 표준으로 수정하는 것이 근본 해결책이며, Frontend는 추가 수정이 필요하지 않습니다.**

---

## 🚨 코드 리뷰 피드백 (Backend 에이전트 전달용)

**[🔴 Critical: 치명적 결함 - 즉시 수정 필요]**

- `Backend /api/v1/analyze (스트리밍 응답 핸들러)` — 현재 응답 형식이 표준 SSE가 아닌 단순 JSON 라인으로, Frontend SSE 파서가 `event:` 필드 없이 원문을 화면에 그대로 노출시킵니다.

  **현재 Back 응답 (문제)**:
  ```
  {"status":"processing","message":"Starting analysis..."}
  {"status":"processing","message":"Searching and grading patents..."}
  ```

  **수정 후 응답 (표준 SSE)**:
  ```
  event: progress
  data: {"percent": 10, "message": "특허 DB 검색 중..."}

  event: progress
  data: {"percent": 80, "message": "AI 유사도 분석 중..."}

  event: complete
  data: {"result": { ... }}

  ```

  **FastAPI 수정 예시**:
  ```python
  from fastapi.responses import StreamingResponse
  import json

  async def generate():
      yield "event: progress\n"
      yield f"data: {json.dumps({'percent': 10, 'message': '특허 DB 검색 중...'})}\n\n"

      yield "event: progress\n"
      yield f"data: {json.dumps({'percent': 80, 'message': 'AI 유사도 분석 중...'})}\n\n"

      yield "event: complete\n"
      yield f"data: {json.dumps({'result': result})}\n\n"

  return StreamingResponse(generate(), media_type="text/event-stream")
  ```

  **Frontend가 기대하는 이벤트 타입 목록**:
  | event 타입 | data 필드 | 처리 |
  |---|---|---|
  | `progress` | `{ percent: number, message: string }` | 진행바 업데이트 |
  | `complete` | `{ result: RagAnalysisResult }` | 결과 화면 표시 |
  | `empty` | 없음 | "결과 없음" 에러 처리 |
  | `error` | 없음 | 통신 에러 처리 |

---

**[🟡 Warning: 잠재적 위험 - 임시 대응 방안]**

Backend 수정 전까지 Frontend에서 즉시 임시 대응이 필요합니다.

- `useRagStream.ts:106-125` — `useRagStream.ts`의 라인 분리 기준을 `\n\n`(SSE 표준)에서 `\n`(NDJSON)으로, 파싱 필드를 `parsedData.status` / `parsedData.message` 기반으로 임시 변경합니다.

  **임시 대응 코드 (Frontend Option B)**:
  ```ts
  // 기존: SSE 표준 \n\n 기준 분리
  const lines = buffer.split('\n\n');
  
  // 임시 변경: NDJSON \n 기준 분리
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
      if (!line.trim()) continue;
      try {
          const parsed = JSON.parse(line);
          // status 필드 기반으로 분기
          if (parsed.status === 'processing' || parsed.status === 'searching') {
              setMessage(parsed.message ?? '분석 중...');
              // percent가 없으면 애니메이션 값으로 대입
              setPercent(prev => Math.min(prev + 20, 90));
          } else if (parsed.status === 'complete') {
              setPercent(100);
              setResultData(parsed.result);
              ...
          }
      } catch (e) { /* JSON 파싱 실패 무시 */ }
  }
  ```

---

**[🟢 Info: 클린 코드 및 유지보수 제안]**

- `useRagStream.ts:106` — Backend와 Frontend 간 스트리밍 계약(이벤트 타입, data 스키마)을 `types/rag.ts` 에 별도 타입으로 명시적으로 정의해 두면, 향후 Backend 명세 변경 시 타입 에러로 즉시 감지할 수 있습니다.

  ```ts
  // types/rag.ts에 추가 권장
  export type StreamEventType = 'progress' | 'complete' | 'empty' | 'error';
  export interface StreamProgressEvent {
      percent: number;
      message: string;
  }
  ```

---

## 💡 Tech Lead의 머지(Merge) 권고

- [ ] ~~이대로 Main 브랜치에 머지해도 좋습니다.~~
- [x] **Critical 항목이 수정되기 전까지 머지를 보류하세요.**

> JSON 원문이 사용자에게 그대로 노출되는 것은 신뢰도를 심각하게 저하시키는 **P0 UX 버그**입니다.
> Backend SSE 포맷 수정을 최우선 처리하고, 그 이전에는 Frontend Option B 임시 대응을 적용하세요.
