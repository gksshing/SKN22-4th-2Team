# 📋 Issue #51 기획서 — 스트리밍 로딩 상태 UI 개선 (JSON 원문 노출 → 친화적 로딩 UI)

> **작성자**: PM / 수석 아키텍트 공동 리뷰
> **발견 경위**: 실제 분석 실행 화면에서 JSON 원문이 그대로 노출되는 UX 버그 발견
> **연계 이슈**: Issue #24 (RAG 스트리밍 연동), Issue #47 (Auth UX)

---

## 🔍 현상 (스크린샷 기반)

```
{"status":"processing","message":"Starting analysis..."}
{"status":"processing","message":"Searching and grading patents..."}
```

위 JSON이 "분석 진행 현황" 영역에 **그대로 출력**되고 있음. 사용자 입장에서 오류 화면처럼 보이는 심각한 UX 버그.

---

## 🔴 원인 분석

### Frontend (`useRagStream.ts:114-125`)
```ts
// 현재 Frontend가 기대하는 SSE 형식 (표준 SSE)
const eventMatch = line.match(/event:\s*([^\n]+)/);   // event:progress 파싱
const dataMatch  = line.match(/data:\s*([^\n]+)/);    // data:{...} 파싱
```

Frontend는 **표준 SSE 포맷** (`event:progress\ndata:{...}\n\n`)을 기대함.

### Backend (실제 응답)
```
{"status":"processing","message":"Starting analysis..."}
{"status":"processing","message":"Searching and grading patents..."}
```

Backend는 **단순 JSON 라인** (NDJSON 형태)을 내리고 있음.

### 결론
| | Frontend 기대 | Backend 실제 |
|---|---|---|
| 포맷 | SSE (`event:progress`, `data:...`) | JSON 한 줄씩 (NDJSON) |
| 결과 | `eventType="message"`, 파싱 실패 | 화면에 원문 노출 |

---

## ✅ 해결 방안 (둘 중 하나 선택)

### Option A: Backend SSE 표준 형식 준수 (권장 🌟)
- **내용**: Backend의 스트리밍 응답을 표준 SSE 포맷으로 변경
- **Backend 수정 예시**:
  ```python
  async def stream_response():
      yield "event: progress\n"
      yield f"data: {json.dumps({'percent': 10, 'message': '특허 DB 검색 중...'})}\n\n"
      
      yield "event: progress\n"
      yield f"data: {json.dumps({'percent': 80, 'message': 'AI 분석 중...'})}\n\n"
      
      yield "event: complete\n"
      yield f"data: {json.dumps({'result': result_data})}\n\n"
  ```
- **Frontend 변경**: 없음 (이미 SSE 파싱 로직이 준비되어 있음)
- **장점**: Frontend 파싱 로직을 건드리지 않아도 됨. 웹 표준 준수.

### Option B: Frontend가 NDJSON을 파싱하도록 변경
- **내용**: `useRagStream.ts`의 파싱 로직을 NDJSON(JSON 한 줄씩) 방식으로 변경
- **Frontend 수정 예시**:
  ```ts
  // event:/data: 파싱 대신, 라인 단위 JSON 파싱
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line);
      if (parsed.status === 'processing') {
          setPercent(parsed.percent ?? 0);
          setMessage(parsed.message ?? '');
      } else if (parsed.status === 'complete') {
          setResultData(parsed.result);
          ...
      }
  }
  ```
- **Backend 변경**: 없음 (현재 그대로)
- **단점**: 웹 표준 SSE와 거리가 멀어 유지보수 불리

---

## 📋 담당자별 Action Item

### 🔴 [즉시] Backend 에이전트에게 전달

> 현재 `/api/v1/analyze` 스트리밍 응답이 단순 JSON 라인(NDJSON)으로 내려오고 있어,
> **Frontend의 SSE 파서가 정상 처리하지 못하고 원문이 화면에 노출됩니다.**
> 
> **요청**: Backend 응답을 표준 SSE 형식으로 변경해 주세요.
> ```
> event: progress
> data: {"percent": 10, "message": "특허 DB 검색 중..."}
>
> event: progress
> data: {"percent": 80, "message": "AI 분석 중..."}
>
> event: complete
> data: {"result": {...}}
>
> ```
> - `event:` 필드 명칭: `progress` / `complete` / `empty` / `error`
> - `data:` 필드는 JSON
> - 이벤트 블록 구분: 빈 줄 (`\n\n`)

### 🟡 [Backend 수정 전 임시 대응] Frontend 에이전트
- `useRagStream.ts` 의 파싱 로직을 NDJSON(`\n` 단위 JSON)으로 임시 변경 (Option B)
- 이후 Backend가 SSE로 전환되면 다시 원복

---

## 💡 Tech Lead의 머지(Merge) 권고
- [x] **현재 상태로 머지 보류** — 사용자에게 JSON 원문이 노출되는 것은 치명적 UX 버그입니다.
- [ ] Backend가 SSE 표준 포맷으로 수정 완료 후 재검증.
