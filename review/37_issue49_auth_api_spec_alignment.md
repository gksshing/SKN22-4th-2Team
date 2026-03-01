# 📋 Issue #49 기획서 — Auth API 명세 정합성 수정

> **작성자**: 수석 아키텍트 (Senior Architect / DevSecOps)
> **원본 출처**: PM 요구사항 체크 결과 (2026-03-01)
> **연계 이슈**: Issue #46 (Auth 구현), Issue #48 (Frontend 안정화)

---

## 🔍 총평 (Architecture Review)

현재 Frontend Auth 구현은 HttpOnly Cookie + Silent Refresh 패턴으로 잘 설계되어 있습니다.
그러나 **Backend API 명세와의 엔드포인트 불일치**와 **CORS `credentials` 정책 미확인**이 실제 통합 단계에서 런타임 에러를 유발할 수 있습니다.
두 항목 모두 한두 줄 수정으로 해결 가능하나, Backend/Frontend 간 명세 합의가 선행되어야 합니다.

---

## 🚨 발견된 문제 항목

### 🔴 Critical 1 — 엔드포인트 불일치

**문제**: PM 요구사항은 `POST /api/v1/auth/register`이지만, 현재 Frontend 코드는 `POST /api/v1/auth/signup`을 호출합니다.

| 파일 | 현재 코드 | 요구사항 |
|---|---|---|
| `useAuth.ts:84` | `apiClient.post('/api/v1/auth/signup', ...)` | `POST /api/v1/auth/register` |

**해결 방법** (둘 중 하나 선택 후 팀 합의):

**Option A: Backend를 `/signup`으로 통일** (권장 — 이미 Frontend 코드 완성)
```python
# FastAPI router
@router.post("/signup")   # /register → /signup 으로 변경
async def signup(...): ...
```

**Option B: Frontend를 `/register`로 변경**
```ts
// useAuth.ts:84
await apiClient.post('/api/v1/auth/register', { email, password, nickname });
```

> **권장**: Option A — `signup`이 더 일반적인 RESTful 컨벤션이며, Frontend 코드 변경 없이 Backend만 수정하면 됩니다.

---

### 🟡 Warning 1 — Authorization Bearer 헤더 vs HttpOnly Cookie 방식 협의 필요

**문제**: PM 요구사항은 "Authorization 헤더에 Bearer 토큰을 자동으로 담아 보내는 인터셉터"를 명시했으나, 현재 구현은 **HttpOnly Cookie** 방식을 채택했습니다.

| 방식 | 보안 | 구현 | 현재 상태 |
|---|---|---|---|
| HttpOnly Cookie | ✅ XSS 방어 | `withCredentials: true` | ✅ 현재 구현 |
| Authorization Bearer | ⚠️ JS 접근 가능 | Request Interceptor 필요 | ❌ 미구현 |

**HttpOnly Cookie 방식을 유지할 경우 Backend 필수 설정**:
```python
# FastAPI CORS 설정 — allow_credentials 반드시 True
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 개발환경
    allow_credentials=True,                   # 🔴 이 설정 없으면 Cookie 전달 안 됨
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Bearer 방식으로 변경할 경우 Frontend 추가 코드**:
```ts
// apiClient.ts Request Interceptor에 추가
apiClient.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('access_token'); // ⚠️ XSS 취약
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
});
```

> **권장**: 보안적으로 **HttpOnly Cookie 방식 유지**. Bearer 방식은 XSS 공격에 취약합니다. PM의 요구사항을 HttpOnly Cookie로 충족시키는 것이 더 올바른 아키텍처입니다.

---

### 🟢 Info 1 — App.tsx 라우팅 주석 단순화 권장

현재 `App.tsx`에 Auth 라우팅 주석이 두 블록으로 분산되어 있어 Backend 개통 후 실수로 일부만 해제될 위험이 있습니다.

```tsx
// 현재: 주석 분산 (실수 위험)
// useEffect(() => { fetchMe(); }, [fetchMe]);
// ... (다른 코드) ...
// if (!user) { ... }

// 권장: TODO 주석에 명확한 번호 태그 추가
// TODO(Backend-개통-1/2): fetchMe() 주석 해제
// TODO(Backend-개통-2/2): if (!user) 블록 주석 해제
```

---

## 📋 담당자별 액션 아이템

### Backend 에이전트 처리 필요
```
[ ] 엔드포인트 명세 확정 — /signup vs /register 팀 합의 후 결정
[ ] CORS allow_credentials=True 설정 확인
[ ] /api/v1/auth/login 응답에 Set-Cookie: access_token 헤더 포함 확인
[ ] /api/v1/auth/refresh HttpOnly Cookie 기반 재발급 구현 확인
```

### Frontend 에이전트 처리 필요 (Backend 명세 확정 후)
```
[ ] useAuth.ts:84 — Backend 명세 확정 후 엔드포인트 1줄 수정
[ ] App.tsx TODO 주석 명확한 번호 태그로 정리
```

---

### 💡 Tech Lead의 머지(Merge) 권고

- [ ] ~~이대로 Main 브랜치에 머지해도 좋습니다.~~  
- [x] **Critical 항목(엔드포인트 불일치)이 해결되기 전까지 Auth 기능 테스트 보류**

> Backend/Frontend 양 팀이 엔드포인트 명세를 먼저 합의(5분이면 충분)하면, Frontend는 최대 1줄 수정으로 완료됩니다. CORS `allow_credentials=True` 설정도 필수 병행 확인.
