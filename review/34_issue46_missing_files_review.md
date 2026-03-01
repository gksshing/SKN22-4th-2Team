# 🔍 Issue #46 Frontend — 파일 누락 확인 및 재작업 지침 리포트

> **작성자**: 수석 아키텍트 (Chief Architect)
> **작성일**: 2026-03-01
> **목적**: PM 리뷰 반영 — 실제 파일시스템 검증 후 누락 항목 지침 작성

---

### 🔍 총평 (Architecture Review)

파일시스템 직접 검증 결과, 이번 대화에서 `write_to_file`로 작성을 시도한 Issue #46 관련 5개 파일 모두 실제 디스크에 존재하지 않는 것이 확인됐습니다. `components/Auth` 폴더만 생성된 채 내부 파일이 0개입니다. `package.json`의 `axios` 등록과 `.gitignore` 수정만 실제로 반영됐습니다. Frontend 에이전트는 아래 지침에 따라 누락된 5개 파일을 신규 생성해야 합니다.

---

### 🚨 코드 리뷰 피드백 (Frontend 에이전트 전달용)

**[🔴 Critical: 치명적 결함 - 즉시 생성 필요]**

- `src/utils/validators.ts` — **파일 미존재**: 이메일·비밀번호·닉네임 유효성 검사 함수 모음. 아래 스펙으로 신규 생성 필요
  ```ts
  export function validateEmail(value: string): string | true
  export function validatePassword(value: string): string | true
  export function validateConfirmPassword(value: string, original: string): string | true
  export function validateNickname(value: string): string | true
  ```

- `src/utils/apiClient.ts` — **파일 미존재**: Axios Singleton + `withCredentials: true` + Silent Refresh Interceptor. 핵심 조건:
  - `isRefreshing` + `failedQueue` 패턴으로 중복 refresh 방지
  - `/auth/refresh` 요청 자체가 401이면 `_redirectToLogin()` 호출 (무한루프 차단)
  - `AUTH_ROUTES = { LOGIN: '/login' } as const` 상수로 하드코딩 제거

- `src/hooks/useAuth.ts` — **파일 미존재**: `login / logout / signup / fetchMe` 구현 훅. 핵심 조건:
  - `window.addEventListener('auth:session-expired', ...)` 이벤트 구독
  - 로그인 실패 에러는 `"아이디 또는 비밀번호를 확인해주세요."` 단일 메시지로 래핑 (계정 열거 공격 방어)

- `src/components/Auth/LoginForm.tsx` — **파일 미존재**: 로그인 폼. 핵심 조건:
  - `onBlur` 시 인라인 에러 표시 (`alert()` 절대 금지)
  - 제출 실패 시 `errors.submit` 형태로 단일 통합 에러 메시지 표시
  - `noValidate` 속성으로 브라우저 기본 유효성 검사 비활성화, `role="alert"` 적용

- `src/components/Auth/SignupForm.tsx` — **파일 미존재**: 회원가입 폼 (이메일·닉네임·비밀번호·비밀번호 확인 4필드). 핵심 조건:
  - `onBlur` 시 개별 필드 검증, `onSubmit` 시 전체 일괄 검증
  - 비밀번호 변경 시 비밀번호 확인 필드 자동 재검증

**[🟡 Warning: 잠재적 위험 - 개선 권장]**

- `src/App.tsx` — **Issue #46 Auth 라우팅 import 누락 확인 필요**: 현재 파일 크기 7,580 bytes (수정 전과 동일). 아래 import가 반영됐는지 확인 후, 없으면 추가:
  ```tsx
  import { useAuth } from './hooks/useAuth';
  import { LoginForm } from './components/Auth/LoginForm';
  import { SignupForm } from './components/Auth/SignupForm';
  ```
  그리고 `useAuth()` 훅 호출 + 조건부 렌더링 주석 블록이 포함되어야 함.

**[🟢 Info: 유지보수 제안]**

- 5개 파일 생성 완료 후 **기획서(`review/32_issue46_auth_frontend_plan.md`) 내 예상 파일 구조와 대조 검증** 권장

---

### 📋 Frontend 에이전트 재작업 체크리스트

```
[ ] src/utils/validators.ts 신규 생성
[ ] src/utils/apiClient.ts 신규 생성
[ ] src/hooks/useAuth.ts 신규 생성
[ ] src/components/Auth/LoginForm.tsx 신규 생성
[ ] src/components/Auth/SignupForm.tsx 신규 생성
[ ] src/App.tsx — useAuth import + 조건부 라우팅 주석 블록 확인/추가
```

---

### 💡 Tech Lead의 머지(Merge) 권고

- [ ] ~~이대로 Main 브랜치에 머지해도 좋습니다.~~
- [x] **Critical 항목 6개 파일 생성/수정 전까지 머지를 보류하세요.**
