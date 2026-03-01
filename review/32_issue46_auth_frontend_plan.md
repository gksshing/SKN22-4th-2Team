# 🔐 [Frontend] Issue #46 — 안전한 토큰 관리 및 Auth 사용자 플로우 구현 기획서

> **작성자**: 수석 아키텍트 (Senior Reviewer / DevSecOps)
> **작성일**: 2026-03-01
> **관련 이슈**: Epic 4 (Auth) #46

---

## 🔍 총평 (Architecture Review)

JWT 토큰 보관 전략과 Silent Refresh는 클라이언트 보안의 핵심입니다. `localStorage` 저장 방식은 XSS에 즉각 노출되므로 이 단계를 건너뛰는 것은 용납할 수 없습니다. 초기 런칭 단계임을 감안해 과도한 구조 없이, **HttpOnly Cookie + Axios Interceptor** 패턴을 기준으로 구현합니다. 계정 열거 공격(Account Enumeration) 방어는 프론트엔드 레이어가 아닌 Backend 응답 포맷에 먼저 의존하므로 Backend와 사전 합의가 필수입니다.

---

## 📐 설계 항목별 기획

### 1. 토큰 저장 전략: HttpOnly Cookie 기반

#### 배경 및 위협 모델

| 저장 방식 | XSS 취약성 | CSRF 취약성 | 권장 |
|---|---|---|---|
| `localStorage` | ❌ 즉시 노출 | ✅ 없음 | ❌ 금지 |
| `sessionStorage` | ❌ 즉시 노출 | ✅ 없음 | ❌ 금지 |
| **HttpOnly Cookie** | ✅ JS 접근 불가 | ⚠️ CSRF 필요 | ✅ **채택** |

#### 구현 방향

- **Access Token**: HttpOnly + Secure + SameSite=Strict 쿠키로 서버가 Set-Cookie
- **Refresh Token**: 별도 HttpOnly Cookie, `/api/v1/auth/refresh` 경로에만 유효
- **프론트엔드 역할**: 쿠키를 직접 읽거나 쓰지 않음 — `credentials: 'include'` 설정만 추가
- **CSRF 방어**: `SameSite=Strict` 설정으로 기본 방어 + 민감 변경 작업에 `X-CSRF-Token` 헤더 추가 (Backend와 합의 필요)

```ts
// frontend/src/utils/apiClient.ts
// axios 글로벌 설정 — 쿠키 자동 포함
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true, // HttpOnly Cookie 자동 전송
});
```

> [!IMPORTANT]
> Backend 에이전트에게 전달: Access Token은 `Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict` 포맷으로 응답해야 합니다. 프론트엔드에서 토큰 값을 Response Body로 받아 저장하는 방식은 채택하지 않습니다.

---

### 2. Silent Refresh (401 자동 갱신)

#### 플로우 설계

```
[API 요청] 
  → 서버 응답 401 (Access Token 만료)
  → Axios Response Interceptor 감지
  → POST /api/v1/auth/refresh (Refresh Token 쿠키 자동 포함)
    → 성공: 새 Access Token Set-Cookie → 원래 요청 1회 재시도
    → 실패: /login 페이지로 강제 이동 + 에러 토스트 표시
```

#### 구현 파일 및 핵심 로직

```ts
// frontend/src/utils/apiClient.ts

let isRefreshing = false; // 동시 다중 요청 시 중복 refresh 방지
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

// 대기 중인 요청들을 처리하는 헬퍼
const processQueue = (error: unknown) => {
    failedQueue.forEach(({ resolve, reject }) =>
        error ? reject(error) : resolve(undefined)
    );
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // 이미 refresh 중 → 완료 후 재시도 대기열 등록
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => apiClient(originalRequest));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await apiClient.post('/api/v1/auth/refresh');
                processQueue(null);
                return apiClient(originalRequest); // 원래 요청 재시도
            } catch (refreshError) {
                processQueue(refreshError);
                window.location.href = '/login'; // 갱신 실패: 로그인 페이지 이동
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);
```

> [!WARNING]
> `_retry` 플래그 없이 구현 시 401 → refresh → 401 → refresh... 무한 루프 발생 가능. 반드시 `originalRequest._retry = true` 체크가 선행되어야 합니다.

---

### 3. 로그인/회원가입 폼 유효성 검증 UI

#### 검증 규칙 정의

| 필드 | 규칙 | 에러 메시지 |
|---|---|---|
| 이메일 | RFC 5322 형식 (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) | "올바른 이메일 형식을 입력해주세요." |
| 비밀번호 | 최소 8자, 영문+숫자+특수문자 1개 이상 | "비밀번호는 8자 이상, 영문·숫자·특수문자를 포함해야 합니다." |
| 비밀번호 확인 | password와 일치 여부 | "비밀번호가 일치하지 않습니다." |
| 이름/닉네임 | 2~20자, 특수문자 제외 | "2자 이상 20자 이하로 입력해주세요." |

#### 구현 방식

- **실시간 검증**: `onBlur` 이벤트 시 인라인 에러 표시 (입력 중 과도한 에러 방지)
- **제출 시 검증**: `onSubmit`에서 전체 필드 일괄 검증
- **UX 원칙**: 에러 메시지는 `alert()` 절대 금지 → 필드 하단 인라인 텍스트

```ts
// frontend/src/utils/validators.ts

export const validators = {
    email: (v: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || '올바른 이메일 형식을 입력해주세요.',

    password: (v: string) =>
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/.test(v) ||
        '비밀번호는 8자 이상, 영문·숫자·특수문자를 포함해야 합니다.',

    confirmPassword: (v: string, original: string) =>
        v === original || '비밀번호가 일치하지 않습니다.',
};
```

---

### 4. 계정 열거 공격(Account Enumeration) 방어

#### 위협 시나리오

공격자가 존재하지 않는 이메일 입력 시 `"등록되지 않은 이메일"` vs 잘못된 비밀번호 시 `"비밀번호가 틀렸습니다"`처럼 다른 메시지를 표시하면 **계정 존재 여부가 노출**됩니다.

#### 방어 설계

**Frontend**: 모든 로그인 실패 응답(400/401)에 대해 단일 통합 에러 메시지 표시
```
"아이디 또는 비밀번호를 확인해주세요."
```

**Backend 요구사항**: 이메일 미존재 / 비밀번호 불일치 모두 동일한 HTTP 401 + 동일 에러 코드 반환 필요
```json
// 이메일 미존재든, 비밀번호 틀림이든 동일 포맷
{ "detail": "INVALID_CREDENTIALS" }
```

> [!IMPORTANT]
> Backend 에이전트에게 전달: 로그인 실패 시 이메일 존재 여부를 구분하는 다른 응답 코드/메시지 절대 금지. 프론트엔드는 HTTP 상태코드만 참조하여 동일 메시지 표기합니다.

---

## 🚨 구현 전 주의사항 (Frontend 에이전트 전달용)

**[🔴 Critical: 즉시 수정 필요]**

- **localStorage/sessionStorage에 토큰 절대 저장 금지**: 현재 `session.ts`의 UUID 저장 패턴(localStorage)은 세션 ID 용도로만 허용. JWT Access/Refresh Token은 동일 패턴 복사 금지
- **Refresh Token 직접 노출 금지**: Refresh Token 값을 Response Body에서 읽어 변수에 저장하는 코드 작성 금지 — 반드시 쿠키로만 관리

**[🟡 Warning: 개선 권장]**

- **Axios Interceptor 중복 등록 주의**: `apiClient.ts`가 여러 번 import될 경우 인터셉터가 중복 등록될 수 있음. 모듈은 반드시 Singleton으로 관리
- **Silent Refresh 실패 시 UX**: 강제 로그인 이동 전 `"세션이 만료되었습니다. 다시 로그인해 주세요."` 토스트 0.5초 표시 후 이동 권장

**[🟢 Info: 유지보수 제안]**

- 유효성 검사 로직은 `src/utils/validators.ts` 단일 파일로 분리 — 추후 회원가입/비밀번호 변경 폼에서 재사용
- 폼 상태관리는 별도 라이브러리(react-hook-form) 미도입 — `useState` + `onBlur` 패턴으로 충분 (의존성 최소화)

---

## 💡 Tech Lead의 개발 착수 권고

- [x] **Backend와 선행 합의 완료 후 착수**: HttpOnly Cookie Set 방식, `/api/v1/auth/refresh` 엔드포인트 명세, 로그인 실패 응답 포맷 통일
- [x] **`apiClient.ts` 신규 파일 생성**: 기존 `fetch` 기반 코드와 분리하여 axios 기반 인증 클라이언트 별도 구성
- [ ] **기존 `useRagStream.ts`의 fetch → apiClient 마이그레이션**: Auth 연동 완료 후 단계적 교체 권장

---

## 📁 예상 파일 구조

```
frontend/src/
├── utils/
│   ├── apiClient.ts       ← 신규: Axios + withCredentials + Interceptor
│   ├── validators.ts      ← 신규: 이메일/비밀번호 유효성 검사 함수 모음
│   └── session.ts         ← 기존: UUID 세션 ID 관리 (토큰과 무관)
├── hooks/
│   └── useAuth.ts         ← 신규: 로그인/로그아웃/갱신 상태 관리 훅
└── components/
    └── Auth/
        ├── LoginForm.tsx  ← 신규: 이메일+비밀번호 폼 + 인라인 에러
        └── SignupForm.tsx ← 신규: 회원가입 폼 + 확인 비밀번호 + 유효성
```
