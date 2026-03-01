# 🔍 Issue #24/#25 반영 갭(Gap) 분석 리뷰

> **리뷰어**: 수석 아키텍트 (Senior Reviewer / DevSecOps)
> **검토 근거**: PM 에이전트의 Issue #24, #25 반영 현황 분석 결과
> **검토 파일**:
> - `frontend/src/hooks/useRagStream.ts`
> - `frontend/src/components/History/HistorySidebar.tsx`
> - `frontend/src/components/common/ErrorFallback.tsx`
> **작성일**: 2026-03-01

---

### 🔍 총평 (Architecture Review)

Issue #24(UUID 세션 관리)는 **코드 레벨에서 완전히 부재**하며, 현재 `'test_user_webapp'` 하드코딩값이 모든 API 요청에 사용자 식별자로 사용되고 있어 Rate Limit 기능 자체가 사실상 무력화된 상태입니다. Issue #25(히스토리 사이드바)는 기본 뼈대는 완성됐으나 **429 분기 처리와 Detail View 이동이 핵심적으로 빠져 있어** 서비스 요구사항의 절반만 충족한 상태입니다. 두 이슈 모두 프로덕션 머지를 보류해야 합니다.

---

### 🚨 코드 리뷰 피드백 (Frontend 에이전트 전달용)

*(아래 내용을 복사해서 Frontend 에이전트에게 전달하세요)*

---

**[🔴 Critical: 치명적 결함 - 즉시 수정 필요]**

- `useRagStream.ts:57` / `HistorySidebar.tsx:24` — **`user_id` 하드코딩으로 Rate Limit 완전 무력화**
  - 현재 모든 사용자가 동일한 `'test_user_webapp'` ID로 API를 호출함
  - 백엔드 Rate Limit은 `user_id` 기준으로 카운트하므로, 실제 유저가 아무리 많아도 모두 같은 버킷에 쌓임 → **Rate Limit 기능 자체가 동작하지 않음**
  - **조치**: `src/utils/session.ts` 신규 생성 후 아래 로직 구현:
    ```ts
    export function getSessionId(): string {
        const KEY = 'x-shortcut-session-id';
        try {
            let id = localStorage.getItem(KEY);
            if (!id) {
                id = crypto.randomUUID();
                localStorage.setItem(KEY, id);
            }
            return id;
        } catch {
            // 시크릿 모드 등 localStorage 불가 환경 대응: sessionStorage fallback
            return sessionStorage.getItem(KEY) || crypto.randomUUID();
        }
    }
    ```

- `useRagStream.ts:63-71` — **모든 API 요청에 `X-Session-ID` 헤더 누락**
  - 백엔드 Rate Limit 미들웨어가 `X-Session-ID` 헤더를 기준으로 제한을 계산할 경우 헤더 없이 보내는 모든 요청이 식별 불가
  - **조치**: `fetch()` 헤더에 추가:
    ```ts
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-Session-ID': getSessionId(),  // ← 추가
    }
    ```
  - `HistorySidebar.tsx:32`의 히스토리 조회 요청에도 동일하게 적용 필요

- `useRagStream.ts:73-80` — **429 에러가 일반 `NETWORK_ERROR`로 묶여 처리됨**
  - 현재 분기: `413/422 → TOKEN_EXCEEDED`, `404 → NOT_FOUND`, 나머지 → `NETWORK_ERROR`
  - 429가 "네트워크 연결 오류"로 표시되면 사용자는 원인을 알 수 없고 재시도만 반복하게 됨 → **UX 단절 및 서버 추가 부하**
  - **조치**:
    ```ts
    // 기존 분기 앞에 추가
    if (response.status === 429) {
        throw new Error('RATE_LIMIT');
    }
    ```
  - `setErrorInfo` 에러 매핑부(`useRagStream.ts:160-175`)에도 아래 케이스 추가:
    ```ts
    } else if (error.message === 'RATE_LIMIT') {
        setErrorInfo({
            title: '오늘의 분석 한도를 소진했습니다 🚫',
            message: '일일 무료 분석 횟수(10회)를 모두 사용했습니다. 내일 다시 시도해 주세요.'
        });
    ```

---

**[🟡 Warning: 잠재적 위험 - 개선 권장]**

- `HistorySidebar.tsx:129-132` — **히스토리 클릭 시 Detail View(결과 화면) 이동 없음**
  - Issue #25 요구사항: "원클릭으로 과거 분석 결과로 이동"
  - 현재 구현은 아이디어 텍스트만 입력창에 채우는 것에 그침
  - 히스토리에 `result_id` 또는 `analysis_id` 필드가 있다면 결과 화면으로 직접 네비게이션 가능
  - **조치**: Backend에 히스토리 응답에 `result_id` 포함을 요청하고, `onSelectIdea` 콜백을 `onSelectHistory(item: HistoryItem)` 형태로 확장하여 `resultData`도 함께 전달하는 구조로 개선 필요

- `HistorySidebar.tsx:24-25` — **`useCallback` 의존성 배열에 변수가 직접 포함되어 불필요한 리렌더 유발**
  - `API_BASE_URL`, `USER_ID`가 컴포넌트 바디에서 매 렌더마다 새로 계산되고 `useCallback`의 의존성에 포함됨
  - **조치**: 두 값을 컴포넌트 외부 상수 또는 `useMemo`로 메모이제이션할 것

- `useRagStream.ts` — **`startAnalysis` 콜백 인수 변경에도 `App.tsx`에서 `ipcFilters`, `useHybrid`를 전달하지 않음**
  - `useRagStream.ts`는 `startAnalysis(userIdea, ipcFilters, useHybrid)` 3개 인수를 받도록 수정됐지만, `App.tsx:30`에서는 `startAnalysis(inputIdea)`만 호출
  - IPC 필터 선택 UI(`app.js`에는 존재)가 React 버전에 없어 해당 파라미터가 항상 `null`로 전달됨
  - **조치**: `IdeaInput.tsx` 또는 `App.tsx`에 IPC 카테고리 선택 UI 추가 필요

---

**[🟢 Info: 클린 코드 및 유지보수 제안]**

- `HistorySidebar.tsx:162-170` — **`window.ENV` 타입 선언이 컴포넌트 파일 내에 위치**
  - 전역 타입 선언(`declare global`)은 `src/types/global.d.ts` 등 별도 앰비언트 파일로 분리하는 것이 TypeScript 컨벤션
  - 현재 위치에 두면 다른 컴포넌트에서 재선언 시 충돌 가능성 있음

- `ErrorFallback.tsx:24,29` — **에러 타입 판별에 `title.includes(...)` 문자열 매칭 사용**
  - 한국어 문자열을 조건으로 사용하면 국제화/문구 변경 시 조건이 깨짐
  - **조치**: `errorType: 'TOKEN_EXCEEDED' | 'NOT_FOUND' | 'RATE_LIMIT' | ...` prop을 추가하거나, `ErrorFallback`에 `hint?: string` prop을 별도로 전달하는 방식으로 리팩토링 권장

---

### 💡 Tech Lead의 머지(Merge) 권고

- [ ] 이대로 Main 브랜치에 머지해도 좋습니다.
- [x] **Critical 항목이 수정되기 전까지 머지를 보류하세요.**

> **보류 사유 요약**:
> 1. `user_id` 하드코딩으로 Rate Limit 기능 완전 무력화 → 서비스 보안 요구사항 미충족
> 2. 모든 API 요청에 `X-Session-ID` 헤더 미포함 → Issue #24 핵심 요구사항 0% 달성
> 3. 429 에러 전용 UI 미구현 → Issue #25 요구사항 미충족 및 사용자 UX 단절
