# 🔧 Issue #49 — Auth API 명세 불일치 수정 완료

> **기준 기획서**: `review/37_issue49_auth_api_spec_alignment.md`
> **작업일**: 2026-03-01

---

## 🎨 UI/UX 개발 내용 요약

PM 님의 피드백에 따라 Backend 명세와의 정합성을 맞추기 위해 Frontend Auth 관련 설정을 수정했습니다. Authorization 방식은 XSS 방어에 유리한 **HttpOnly Cookie** 방식을 유지하기로 결정했습니다.

| 항목 | 사전 상태 | 수정 완료 상태 |
|---|---|---|
| 회원가입 라우트 | `POST /api/v1/auth/signup` | ✅ **`POST /api/v1/auth/register`** |
| `App.tsx` 주석 | 여러 개로 분산 `TODO: ...` | ✅ **Todo 번호링 부여** `TODO(Backend-개통-1/2)` 등 |

---

## 상세 변경 내역

### 1. `useAuth.ts` — 회원가입 API 명세(엔드포인트) 변경
```diff
- await apiClient.post('/api/v1/auth/signup', { email, password, nickname });
+ await apiClient.post('/api/v1/auth/register', { email, password, nickname });
```

### 2. `App.tsx` — TODO 주석 가독성 개선 (Backend 개통 시점 혼선 방지)
```tsx
// Issue #48: 앱 마운트 시 세션 자동 복원 (HttpOnly 쿠키 기반)
// TODO(Backend-개통-1/2): /api/v1/auth/me 개통 후 아래 주석 해제
// useEffect(() => { fetchMe(); }, [fetchMe]);

// TODO(Backend-개통-2/2): 로그인 라우팅 활성화 주석 해제
// if (!user) { ... }
```

---

## 📋 PM 및 Backend 전달용 피드백

- **Epic: 프론트엔드 화면 개발 (Auth 명세 정합성 Issue #49)**
  - [x] Backend API 명세에 맞춰 회원가입 API 엔드포인트 `/register`로 변경 완료
  - [x] `App.tsx` 파일 내 Backend 개통 후 주석 해제 포인트 명확히 정리 완료

> **Backend 에이전트 필수 확인 요청 사항 (CORS & Cookie)**:
> Frontend는 현재 XSS 방어를 위해 Authorization Bearer 헤더를 쓰지 않고 **`withCredentials: true`** (HttpOnly Cookie) 방식을 채택하고 있습니다.
> 1. JWT 토큰은 로그인 시 반드시 **HttpOnly `Set-Cookie` 헤더**에 담아 응답해 주세요.
> 2. FastAPI CORS 미들웨어 설정 시 **`allow_credentials=True`**가 설정되어야 통신이 가능합니다.
