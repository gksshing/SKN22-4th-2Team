# 🔧 PM 리뷰 대응 — SessionExpiredToast 실제 마운트 완료

> **기준 리뷰**: PM 리뷰 (Issue #47 frontend 점검)
> **작업일**: 2026-03-01

---

## 수정 내용

### 🚨 문제 (PM 리뷰 지적)
`SessionExpiredToast`가 `App.tsx`에 `import`만 추가됐고, return문 JSX에 실제로 렌더링되지 않아 토스트가 화면에 절대 표시되지 않는 버그.

### ✅ 수정 (`App.tsx`)

```diff
{/* 통신 지연 안내 토스트 (30초 초과 시 표출) */}
<TimeoutToast isAnalyzing={isAnalyzing} timeoutMs={30000} />

+ {/* Issue #47: 세션 만료 토스트 — 전역 마운트 */}
+ <SessionExpiredToast />
```

**삽입 위치**: `TimeoutToast` 바로 아래, 메인 레이아웃 바깥 → 어느 페이지에서든 오버레이 표시

---

## 최종 App.tsx Auth 관련 구성

| 항목 | 상태 |
|---|---|
| `useAuth` import | ✅ |
| `SessionExpiredToast` import | ✅ |
| `SessionExpiredToast` JSX 마운트 | ✅ **(이번 수정)** |
| 조건부 Auth 라우팅 | 주석 처리 중 (Backend /auth/me 개통 후 해제) |

---

## 📋 PM 및 Backend 전달용 피드백

- **Epic: 프론트엔드 화면 개발**
  - [x] `SessionExpiredToast` 전역 마운트 완전 완료 (import + JSX 모두)
  - [x] Issue #47 기획서 내 모든 항목 구현 완료
- **Backend에게 전달할 사항**
  - [ ] `/api/v1/auth/me`, `/api/v1/auth/login` 등 6개 Auth 엔드포인트 개통 요청
  - [ ] `HTTP 409 + { "detail": "EMAIL_ALREADY_EXISTS" }` 응답 포맷 통일 요청
