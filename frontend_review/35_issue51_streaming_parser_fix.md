# 🔧 Issue #51 — 스트리밍 파서 임시 대응 (JSON 원문 노출 → 로딩 UI 정상화)

> **기준 기획서**: `review/40_issue51_senior_review_final.md`
> **작업일**: 2026-03-02

---

## 🎨 UI/UX 개발 내용 요약

Backend가 표준 SSE 포맷 대신 단순 JSON 라인(NDJSON)을 응답으로 내려 JSON 원문이 "분석 진행 현황"에 그대로 노출되던 P0 UX 버그를 Frontend 임시 대응(Option B)으로 해결했습니다.

### 변경 파일 1: `useRagStream.ts`

| 항목 | 이전 | 이후 |
|---|---|---|
| 스트림 분리 단위 | `\n\n` (SSE 표준) | `\n` (NDJSON 임시) |
| 상태 판단 기준 | `event:` 필드 | `parsed.status` 필드 |
| percent 처리 | Backend에서 수신 | 단계별 추정 (`+15`, `+25`) |
| SSE 호환성 | SSE 전용 | **SSE + NDJSON 모두 처리** |

**핵심 로직 (이중 파서)**:
```
1. parsed.percent !== undefined → SSE progress 방식 처리 (Backend 전환 후 자동 동작)
2. parsed.result !== undefined → SSE complete 방식 처리
3. parsed.status !== undefined → NDJSON 임시 방식 처리 (현재 Backend)
```

### 변경 파일 2: `types/rag.ts`

시니어 리뷰 Info 항목 반영 — 스트리밍 이벤트 계약 타입 추가:
- `StreamEventType`: SSE 이벤트 타입 열거 (`progress` / `complete` / `empty` / `error`)
- `StreamProgressEvent`: SSE progress data 스키마
- `StreamCompleteEvent`: SSE complete data 스키마
- `NdjsonStreamLine`: 현재 Backend가 내려보내는 NDJSON 임시 타입 (SSE 전환 후 삭제)

---

## 📋 PM 및 Backend 전달용 피드백

- **Epic: 프론트엔드 화면 개발 (Issue #51)**
  - [x] `useRagStream.ts` — NDJSON 임시 대응 파서로 변경 완료 → JSON 원문 노출 해결
  - [x] `types/rag.ts` — 스트리밍 이벤트 계약 타입 명시 완료

- **Backend에게 전달할 사항 (**가장 중요**)**
  - [ ] `/api/v1/analyze` 스트리밍 응답을 **표준 SSE 형식**으로 변경해 주세요
  - [ ] 필요한 `event:` 타입: `progress` (percent + message), `complete` (result), `empty`, `error`
  - [ ] Backend SSE 전환 완료 시 Frontend는 `useRagStream.ts`의 `TODO(Backend-SSE-전환 후)` 주석을 찾아 원복만 하면 됩니다
