# 🔍 Issue #46 Frontend Auth — PM 피드백 기반 수석 아키텍트 검토 리포트

> **검토 기준**: PM 리뷰 결과 (Frontend 작업 항목)
> **검토일**: 2026-03-01
> **검토 대상**: `package.json`, `apiClient.ts`, `App.tsx`

---

### 🔍 총평 (Architecture Review)

PM이 지적한 2가지 항목을 실제 코드로 직접 확인한 결과, **`axios` 미설치는 Critical 수준의 빌드 실패 원인**으로 즉각 처리가 필요합니다. `App.tsx` 라우팅 미연결은 Backend 엔드포인트가 준비될 때까지 구조 설계만 해두는 것이 현실적이며 오버엔지니어링을 방지합니다. 기존 Auth 컴포넌트(`LoginForm`, `SignupForm`) 코드 자체는 보안 관점에서 잘 설계되어 있습니다.

---

### 🚨 코드 리뷰 피드백 (Frontend 에이전트 전달용)

**[🔴 Critical: 치명적 결함 - 즉시 수정 필요]**

- `package.json:12-17` — **`axios`가 `dependencies`에 없음**. `apiClient.ts`가 `import axios from 'axios'`를 사용하지만 패키지가 미설치 상태. 현재 `npm run build` 또는 `npm run dev` 실행 시 **즉시 ModuleNotFoundError로 빌드 실패**함.
  ```bash
  # Frontend 에이전트가 즉시 실행 필요
  cd frontend
  npm install axios
  ```
  설치 후 `package.json`의 `dependencies`에 `"axios": "^1.x.x"` 항목이 추가됐는지 확인.

**[🟡 Warning: 잠재적 위험 - 개선 권장]**

- `App.tsx:1-11` — **Auth 라우팅 연결 없음**. `LoginForm`과 `SignupForm` 컴포넌트가 생성됐으나 `App.tsx`에서 import되거나 렌더링되지 않음. 현재는 항상 메인 특허 분석 화면만 표시됨.
  - 권장 구현: `react-router-dom` 도입 없이 `useAuth().fetchMe()` 결과로 `isLoggedIn` 상태를 관리하고, 조건부 렌더링으로 분기하는 방식이 의존성 최소화 측면에서 적절함.
  ```tsx
  // App.tsx 조건부 렌더링 구조 (예시)
  const { user, fetchMe } = useAuth();
  useEffect(() => { fetchMe(); }, [fetchMe]);
  if (!user) return <LoginForm ... />;
  return <메인화면 />;
  ```
  단, **Backend Auth 엔드포인트가 미개통 상태이므로 연동 이후 적용 권장**.

- `apiClient.ts:97-99` — `window.location.href = '/login'` 하드코딩. 추후 경로 변경 시 일괄 수정이 어려울 수 있음. 상수로 분리하거나 CustomEvent 기반으로 라우팅 위임 고려.

**[🟢 Info: 클린 코드 및 유지보수 제안]**

- `apiClient.ts:35-39` — 모듈 레벨에 `let isRefreshing`, `let failedQueue` 선언은 HMR(Hot Module Replacement) 환경에서 초기화 없이 잔류할 수 있음. 개발 환경에서는 영향 없으나, `vite` HMR 시나리오 인지 필요.
- `LoginForm.tsx`, `SignupForm.tsx` — `noValidate`가 `<form>`에 올바르게 적용되어 브라우저 기본 유효성 검사와 충돌 없음. 접근성(a11y) 측면에서 `role="alert"` 인라인 에러도 적절히 적용됨. ✅

---

### 💡 Tech Lead의 머지(Merge) 권고

- [ ] ~~이대로 Main 브랜치에 머지해도 좋습니다.~~
- [x] **Critical 항목(`axios` 미설치)이 수정되기 전까지 머지를 보류하세요.**
  - `npm install axios` 실행 후 `package.json` 업데이트 확인 필수
  - `App.tsx` 라우팅 연결은 Backend Auth API 개통 후 2단계로 진행 가능
