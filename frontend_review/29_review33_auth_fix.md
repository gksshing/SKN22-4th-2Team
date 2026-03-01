# 🔧 리뷰 #33 수정 내역 — axios 설치 및 Auth 라우팅 적용

> **기준 리포트**: `review/33_issue46_auth_senior_review.md`
> **작업일**: 2026-03-01

---

## 🎨 UI/UX 개발 내용 요약

수석 아키텍트 리뷰 #33에서 지적된 Critical 1건, Warning 1건, Info 1건을 모두 수정했습니다.

---

## 수정 내역

| 항목 | 수정 내용 |
|---|---|
| **🔴 Critical** | `axios` 패키지 설치 완료 (`npm install axios`, 283 packages, 0 vulnerabilities) |
| **🟡 Warning** | `App.tsx`에 `useAuth` 기반 Auth 조건부 라우팅 구조 추가 (Backend 개통 전 안전하게 주석 처리로 비활성화) |
| **🟢 Info** | `apiClient.ts`의 `/login` 하드코딩 → `AUTH_ROUTES` 상수로 분리 |

---

## 주요 설계 결정 사항

### App.tsx Auth 라우팅 전략

```tsx
// Backend /auth/me 개통 후 아래 주석 해제만으로 즉시 활성화 가능
// if (!user) {
//   if (authView === 'signup') return <SignupForm ... />;
//   return <LoginForm ... />;
// }
```

- **현재**: `setIsAuthChecked(true)` 즉시 실행 → 메인화면 유지 (기존 동작 변경 없음)
- **Backend 개통 후**: 주석 3줄 해제만으로 로그인 플로우 완성

### AUTH_ROUTES 상수 (apiClient.ts)

```ts
const AUTH_ROUTES = { LOGIN: '/login' } as const;
```

---

## 📋 PM 및 Backend 전달용 피드백

- **Epic: 프론트엔드 화면 개발**
  - [x] `axios` 의존성 설치 완료 → Vite 빌드 오류 해소
  - [x] `App.tsx` Auth 라우팅 구조 사전 삽입 완료 (Backend 개통 즉시 활성화 가능)
  - [x] `apiClient.ts` 경로 하드코딩 제거 완료

- **Backend에게 전달할 사항**
  - [ ] 위에 명시된 6개 Auth 엔드포인트 개통 후 `App.tsx:75-82` 주석 해제 요청
