# 🎨 Issue #24/#25 구현 내역 (시니어 리뷰 반영)

> **작업 기준**: `review/30_issue24_25_gap_analysis_review.md` Critical/Warning/Info 전체 반영
> **작업일**: 2026-03-01

---

## 🎨 UI/UX 개발 내용 요약

시니어 아키텍트 리뷰 리포트(#30)의 **Critical 3건, Warning 1건, Info 2건**을 모두 구현했습니다.

### 신규 파일

| 파일 | 내용 |
|---|---|
| `src/utils/session.ts` | UUID v4 발급 + localStorage/sessionStorage 이중 저장 유틸 (Issue #24 핵심) |
| `src/types/global.d.ts` | `window.ENV` 전역 타입 전용 앰비언트 파일 (Info 반영, 컴포넌트 중복 선언 제거) |

### 수정 파일

| 파일 | 수정 내용 |
|---|---|
| `useRagStream.ts` | ① `getSessionId()`로 user_id 교체  ② 모든 fetch에 `X-Session-ID` 헤더 추가  ③ `429 → RATE_LIMIT` 에러 분기 신설  ④ `errorType` 필드 포함 |
| `HistorySidebar.tsx` | ① `getSessionId()`로 user_id 교체  ② 히스토리 fetch에 `X-Session-ID` 헤더 추가  ③ `API_BASE_URL`을 외부 상수로 이동해 useCallback deps 문제 해소  ④ `window.ENV` 중복 선언 제거 |
| `ErrorFallback.tsx` | ① `errorType` 리터럴 유니온 prop 추가  ② 한국어 문자열 매칭 제거 → 타입 기반 hint 렌더링  ③ `RATE_LIMIT` 시 재시도 버튼 숨김 + "내일 이용 가능" 안내 표시 |

---

## 📋 PM 및 Backend 전달용 피드백

- **Epic: 프론트엔드 화면 개발**
  - [x] Issue #24 — UUID 세션 발급 및 `X-Session-ID` 헤더 통합 완료
  - [x] Issue #25 — Rate Limit 429 전용 UI 구현 완료
  - [x] Issue #25 — 히스토리 사이드바 세션 ID 기반 조회 완료
  - [x] Issue #25 — 빈 히스토리 Placeholder UI 완료

- **Epic: Backend에게 전달할 사항**
  - [ ] `X-Session-ID` 헤더를 Rate Limit 미들웨어에서 실제로 식별자로 사용하는지 확인 요청
  - [ ] `GET /api/v1/history` 응답에 `risk_level` 필드 포함 여부 확인 요청
  - [ ] Issue #25 Detail View: 히스토리 응답에 `result_id` 또는 전체 `result_data` 포함이 가능한지 Backend 검토 요청

- **미구현 (Backend 협의 필요)**
  - `HistorySidebar` 원클릭 Detail View → 백엔드가 히스토리에 결과 데이터 포함 필요
