# 🔍 Frontend "Complete" 선언 교차 검토 리포트

> **리뷰어**: 수석 아키텍트 (Senior Reviewer)
> **검토 대상**: PM 분석 리포트 + 실제 `frontend/` 코드베이스 교차 검증
> **검토 기준 파일**:
> - `frontend/src/App.tsx`
> - `frontend/src/hooks/useRagStream.ts`
> - `frontend/src/components/**`
> - `frontend/app.js`
> **작성일**: 2026-03-01

---

### 🔍 총평 (Architecture Review)

Frontend 에이전트의 "역할 종료 선언"은 **성급한 완료 선언**입니다. 핵심 UI 컴포넌트인 `History` 컴포넌트가 폴더만 존재하고 실제 파일이 없으며, `App.tsx`의 스트리밍 영역에 하드코딩된 플레이스홀더가 남아 있어 프로덕션 서빙이 불가능한 상태입니다. 또한 바닐라 JS 버전(`app.js`)과 React 버전(`src/`)이 공존하는 이중 아키텍처 문제가 해결되지 않아 배포 시 혼란을 야기할 수 있습니다.

---

### 🚨 코드 리뷰 피드백 (Frontend 에이전트 전달용)

*(아래 내용을 복사해서 Frontend 에이전트에게 전달하세요)*

---

**[🔴 Critical: 치명적 결함 - 즉시 수정 필요]**

- `frontend/src/components/History/` - **디렉토리가 존재하나 파일이 0개**
  - PM 리포트 #10에서 "역할 종료 선언" 시 `History` 컴포넌트가 완성 항목으로 처리됐지만, 실제로 `History/` 폴더 안에 어떠한 `.tsx` 파일도 없습니다.
  - `App.tsx`에도 히스토리 관련 렌더링 코드가 전혀 없습니다.
  - 사용자가 이전 분석 기록을 조회하는 핵심 UX 기능이 **React 버전에서 완전히 누락**된 상태.
  - **조치**: `HistorySidebar.tsx`(또는 `HistoryList.tsx`) 컴포넌트를 구현하고 `App.tsx` 렌더 트리에 마운트할 것.

- `frontend/src/App.tsx:86` - **스트리밍 결과 영역이 하드코딩 플레이스홀더**
  ```tsx
  // ❌ 현재 코드 (프로덕션 불가)
  <p className="text-gray-700 leading-relaxed font-mono">가상 LLM 스트리밍 텍스트 렌더링 시작됨... ▌</p>
  ```
  - `useRagStream` 훅이 실제 SSE 스트림을 수신하여 상태를 관리함에도, `App.tsx`는 해당 상태(`message`, `resultData`)를 이 영역에 바인딩하지 않고 고정 문자열을 노출 중.
  - **조치**: 스켈레톤이 숨겨진 이후 노출되는 영역에 `message` 상태 또는 실시간 LLM 청크를 바인딩할 것.

---

**[🟡 Warning: 잠재적 위험 - 개선 권장]**

- `frontend/app.js` + `frontend/index.html` (바닐라 JS 버전) vs `frontend/src/` (React 버전) - **이중 아키텍처 공존**
  - 현재 두 서빙 진입점이 동시에 존재. Dockerfile 및 Nginx 설정에 따라 둘 중 하나가 잘못 서빙될 경우 전혀 다른 UI가 배포될 수 있음.
  - **조치**: PM이 최종 서빙 버전을 결정하고, 레거시 버전은 `legacy/` 폴더로 이동하거나 삭제. DevOps 에이전트에게 `vite build` 산출물(`dist/`)을 Nginx가 서빙하도록 명시 요청할 것.

- `frontend/src/hooks/useRagStream.ts:50` - **API 엔드포인트 경로 불일치 가능성**
  ```ts
  const response = await fetch(`${apiUrl}/api/analyze`, { ... });
  ```
  - `app.js`의 경로는 `/api/v1/analyze`이지만, `useRagStream.ts`는 `/api/analyze`로 `/v1` 버전 prefix가 없음.
  - 백엔드 FastAPI의 실제 라우터 prefix와 반드시 맞춰야 함.
  - **조치**: Backend 에이전트에게 실제 라우터 prefix(`/api/v1` vs `/api`)를 확인 후 통일할 것.

- `frontend/src/hooks/useRagStream.ts:56` - **요청 Body 필드 불일치**
  ```ts
  body: JSON.stringify({ idea }),   // React 버전: "idea" 필드
  ```
  ```js
  // app.js의 요청: "user_idea", "user_id", "use_hybrid", "ipc_filters" 필드
  body: JSON.stringify({ user_idea, user_id, use_hybrid, ipc_filters })
  ```
  - 두 버전에서 백엔드로 보내는 필드명 자체가 다름. 백엔드 Pydantic 모델이 `user_idea`를 기대한다면 React 버전은 **즉시 422 Validation Error를 발생**시킴.
  - **조치**: Backend의 `AnalyzeRequest` Pydantic 스키마를 확인 후 React 버전의 요청 Body를 일치시킬 것. `user_id`, `use_hybrid`, `ipc_filters` 필드도 포함 필요.

---

**[🟢 Info: 클린 코드 및 유지보수 제안]**

- `frontend/FILE_STRUCTURE.md:12` - **문서가 구버전(Streamlit) 기준으로 작성됨**
  - `app.py`를 "Streamlit 메인 앱"으로 기술하고 있으나, 현재 프로젝트는 React + FastAPI 구조로 전환된 상태.
  - 문서의 신뢰도를 위해 `FILE_STRUCTURE.md`를 현행 아키텍처 기준으로 갱신 권장.

- `frontend/src/App.tsx:6` - **`USER_ID`가 완전히 관리되지 않음**
  - `app.js`에는 `USER_ID = 'test_user_webapp'` 하드코딩에 주석(`TODO: JWT로 교체`)이 있으나, React 버전(`App.tsx`)에는 `user_id` 전송 자체가 없음.
  - 향후 인증 연동 시 양쪽을 모두 수정해야 하는 기술 부채 발생.
  - **조치**: React 버전에서도 `user_id`를 환경변수 또는 Context로 관리하는 구조를 사전 설계할 것.

---

### 💡 Tech Lead의 머지(Merge) 권고

- [ ] 이대로 Main 브랜치에 머지해도 좋습니다.
- [x] **Critical 항목이 수정되기 전까지 머지를 보류하세요.**

> **보류 사유**:
> 1. `History` 컴포넌트 미구현으로 핵심 UX 기능 누락
> 2. `App.tsx` 스트리밍 영역 하드코딩으로 실제 LLM 결과 미출력
> 3. React vs 바닐라 JS 이중 아키텍처로 인한 배포 혼란 위험
> 4. React 버전의 API 요청 필드(`idea`) ≠ 백엔드 기대 필드(`user_idea`) 불일치로 인한 즉각적 422 에러 예상
