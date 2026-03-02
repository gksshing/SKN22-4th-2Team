# 🎨 Issue #52 — 로그인 페이지 UI 리뉴얼 완료

> **기준 기획서**: `review/41_issue52_login_ui_redesign_plan.md`
> **작업일**: 2026-03-02

---

## 🎨 UI/UX 개발 내용 요약

네이버 로그인 스타일을 레퍼런스로 `LoginForm.tsx`를 전면 리뉴얼했습니다. `SignupForm.tsx`는 이미 라이트 테마로 구현되어 있어 수정이 불필요했습니다.

### 변경 내역 (`LoginForm.tsx`)

| 항목 | 이전 | 이후 |
|---|---|---|
| 배경 | `bg-gradient-to-br from-slate-900 to-blue-950` | `bg-[#F8FAFC]` (라이트 연회색) |
| 브랜드 헤더 위치 | 카드 내부 | **카드 외부 상단** (네이버 스타일) |
| 카드 스타일 | `shadow-2xl` + 어두운 배경 | `shadow-md border border-gray-200` |
| 비밀번호 필드 | 일반 input | **`PasswordToggleInput`** (show/hide 토글) |
| CTA 버튼 | 파란색 `bg-blue-600` | **그린 `bg-[#00C73C]`** (브랜드 컬러) |
| 소셜 로그인 | X (없음) | ✅ Google / Naver / Kakao 버튼 추가 |
| 하단 링크 | 단순 버튼 | `"계정이 없으신가요? 회원가입"` 텍스트 링크 |
| 푸터 카피라이트 | X | `© 2026 Short-Cut AI` 추가 |

### 보안 & 접근성 유지 항목
- ✅ 계정 열거 공격 방어 단일 에러 문구 ("아이디 또는 비밀번호를 확인해주세요")
- ✅ `role="alert"`, `label htmlFor`, `autoComplete` 속성 전부 유지
- ✅ `disabled` 상태 UI 유지
- ✅ 로딩 스피너 (submit 시 `animate-spin`) 유지

---

## 📋 PM 및 Backend 전달용 피드백

- **Epic: 프론트엔드 화면 개발 (Issue #52)**
  - [x] `LoginForm.tsx` — 라이트 테마 리뉴얼 완료
  - [x] 비밀번호 show/hide 토글 추가
  - [x] 그린 브랜드 컬러 CTA 버튼 적용
  - [x] 소셜 로그인 버튼 UI 추가 (Google / Naver / Kakao)

> **참고**: 소셜 로그인 버튼은 `${API_BASE_URL}/api/v1/auth/login/{provider}` 엔드포인트를 호출합니다. Backend에서 해당 소셜 OAuth 엔드포인트가 미구현 시 동작하지 않습니다.
