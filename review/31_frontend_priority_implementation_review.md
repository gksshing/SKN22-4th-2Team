# 🔍 Frontend 구현 우선순위 아키텍처 리뷰

> **리뷰어**: 수석 아키텍트 (Senior Reviewer / DevSecOps)
> **검토 대상**: PM 에이전트 권장 미구현 항목 3건
> **작성일**: 2026-03-01

---

### 🔍 총평 (Architecture Review)

PM이 추천한 3개 구현 항목은 모두 프론트엔드 레이어에 국한된 작업이며, 아키텍처 복잡도는 낮습니다. 다만 **항목 2(히스토리 원클릭 재분석)는 UX 설계 오류를 내포**하고 있고, **항목 3(recharts 도입)은 번들 사이즈 증가 리스크**가 있어 구현 전 설계 결정이 필요합니다. 항목 1(IPC 필터 UI)은 Current `useRagStream.ts`의 `ipcFilters` 파라미터를 활성화하는 직접적인 완성 작업으로 즉시 진행 가능합니다.

---

### 🚨 코드 리뷰 피드백 (Frontend 에이전트 전달용)

*(아래 내용을 복사해서 Frontend 에이전트에게 전달하세요)*

---

**[🔴 Critical: 치명적 결함 - 즉시 수정 필요]**

- `App.tsx:32` — **히스토리 원클릭 재분석 구현 전 설계 결함 사전 차단 필요**
  - PM 추천 사항: `HistorySidebar` 클릭 시 `startAnalysis()` 자동 호출
  - **문제**: 현재 `handleSelectHistory`는 `setIdea(selectedIdea)`만 수행하고, `IdeaInput`은 내부 `useState`로 독립적인 `idea` 상태를 관리함
  - 즉, `App.tsx`의 `setIdea()`를 호출해도 `IdeaInput` 내부 textarea 값은 갱신되지 않아 **자동 재분석 시 빈 텍스트로 API 호출되는 버그** 발생
  - **조치 방안**:
    ```tsx
    // IdeaInput에 외부에서 값을 주입할 수 있는 prop 추가가 선행되어야 함
    // IdeaInput.tsx 수정
    interface IdeaInputProps {
        onSubmit: (idea: string) => void;
        disabled: boolean;
        initialValue?: string; // ← 추가: 히스토리에서 주입할 초기값
    }
    // App.tsx에서 자동 재분석 트리거
    const handleSelectHistory = (selectedIdea: string) => {
        setIdea(selectedIdea);
        startAnalysis(selectedIdea); // ← IdeaInput 내부 상태 우회하여 직접 호출
    };
    ```
  - `IdeaInput.tsx`가 `initialValue` prop을 받아 `useState`의 초기값 및 `useEffect`로 외부 변경을 반영하도록 수정 필수

---

**[🟡 Warning: 잠재적 위험 - 개선 권장]**

- `package.json` — **`recharts` 라이브러리 도입 시 번들 사이즈 리스크**
  - recharts는 D3 기반으로 **gzip 기준 약 150KB+** 추가 부담
  - 현재 프로젝트가 단일 차트(유사도 바 차트)만 필요하다면, `SimilarityBarChart`는 **CSS 기반 커스텀 바 차트**로 구현하는 것이 초기 런칭 단계에서 과도한 의존성 추가를 막는 합리적 선택
  - recharts 도입이 결정된다면 반드시 `Lazy import` + `code splitting` 적용:
    ```tsx
    const SimilarityBarChart = lazy(() => import('./SimilarityBarChart'));
    ```

- `IdeaInput.tsx:13-14` — **유효성 검사 실패 시 `alert()` 사용 — UX 품질 저하**
  - 현재: `alert("아이디어를 최소 10자 이상...")`
  - `alert()`는 브라우저 네이티브 모달로 스타일 불일치 및 사용자 경험 단절 유발
  - IPC 카테고리 선택 UI(`IpcFilterSelector`) 추가 시 유효성 검사 로직이 더 복잡해질 예정이므로, 이 시점에 **인라인 에러 메시지 방식**으로 교체 권장:
    ```tsx
    const [inputError, setInputError] = useState('');
    // 조건 불충족 시: setInputError('최소 10자 이상 입력해주세요.')
    // JSX: {inputError && <p className="text-red-500 text-xs mt-1">{inputError}</p>}
    ```

- `ResultView.tsx:33` — **KIPRIS 원문 링크가 범용 메인 검색 URL로 고정됨**
  - 현재: `http://kpat.kipris.or.kr/kpat/searchLogina.do?next=MainSearch#page1` (모든 특허 동일 URL)
  - Backend 응답에 `applno`(출원번호) 필드가 추가되면 즉시 아래로 교체 가능하도록 준비 필요:
    ```tsx
    const kiprisUrl = patent.applno
        ? `http://kpat.kipris.or.kr/kpat/biblioa.do?applno=${patent.applno}`
        : `http://kpat.kipris.or.kr/kpat/searchLogina.do?next=MainSearch`;
    ```
  - **Backend 에이전트에게 전달**: 특허 검색 결과 Item에 `applno` 필드 추가 요청

---

**[🟢 Info: 클린 코드 및 유지보수 제안]**

- `IpcFilterSelector.tsx` (신규 구현 시) — **선택된 IPC 코드를 Badge/Tag 형태로 표시 권장**
  - IPC 코드는 `H04R` (음향), `G06F` (전기 디지털 처리) 등 전문 기술 용어 기반
  - 드롭다운 단독보다는 **선택 후 태그로 추가/제거** (`X` 버튼 삭제) 패턴이 사용성 우수
  - `ipcFilters: string[]` 배열을 `useState`로 관리하고 `App.tsx`로 lift up 필요

- `HistorySidebar.tsx:44-46` — **`fetchHistory()` 호출 타이밍 개선 권장**
  - 현재 분석 완료 후 히스토리가 자동 갱신되지 않아 새 항목이 사이드바에 즉시 반영되지 않음
  - `useRagStream`의 `isComplete`가 `true`로 전환되는 시점에 `fetchHistory()`를 재호출하는 로직 추가 권장
  - `App.tsx`에서 `HistorySidebar`에 `refreshTrigger` prop을 주입하거나, `useEffect([isComplete])`로 처리 가능

---

### 💡 Tech Lead의 머지(Merge) 권고

- [ ] 이대로 Main 브랜치에 머지해도 좋습니다.
- [x] **Critical 항목이 수정되기 전까지 머지를 보류하세요.**

> **보류 사유**: 히스토리 원클릭 재분석 구현 전, `IdeaInput`의 상태 관리 구조 수정이 선행되어야 합니다. 이를 무시하고 구현 시 빈 텍스트 API 호출 버그가 발생합니다.
