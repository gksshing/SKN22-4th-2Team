# 📋 Issue #48 기획서 — Frontend 안정화 및 Auth 통합 완성

> **작성자**: 수석 아키텍트 (Senior Architect)
> **원본 출처**: PM 프론트엔드 폴더 리뷰 (2026-03-01)
> **연계 이슈**: Issue #46 (Auth 구현), Issue #47 (Auth UX)

---

## 1. 개요

PM 리뷰에서 Frontend 폴더 전체를 점검한 결과, **즉시 수정이 필요한 Critical 항목**과 **Backend 개통 후 연동이 필요한 항목**이 식별되었습니다. 본 기획서는 이를 우선순위별로 정리하고, Frontend 에이전트가 수행할 구체적인 작업 목록을 제시합니다.

---

## 2. 🔴 Critical — 즉시 수정 필요

### 2-1. `axios` dependency 누락

**문제**: `apiClient.ts`에서 `axios`를 import하여 사용하고 있으나, `package.json`의 `dependencies`에 `axios`가 존재하지 않습니다. Docker 환경에서 `npm ci` 실행 시 **빌드 실패**가 발생합니다.

**해결 방법**:
```json
// package.json → dependencies에 추가
"axios": "^1.7.9"
```

**담당**: Frontend 에이전트 (즉시 처리)

---

### 2-2. `.env` 환경변수 파일 가이드 필요

**문제**: `apiClient.ts`가 `import.meta.env.VITE_API_BASE_URL`을 참조하지만, 프로젝트에 `.env` 파일 및 `.env.example` 샘플이 존재하지 않습니다. 신규 개발자나 Docker 배포 시 환경변수 누락으로 API 연결 실패 위험이 있습니다.

**해결 방법**: `.env.example` 파일 생성
```
VITE_API_BASE_URL=http://localhost:8000
```

**담당**: Frontend 에이전트

---

## 3. 🟡 Warning — Backend 개통 후 연동 필요

### 3-1. Auth 라우팅 활성화

**현황**: `App.tsx` 내 로그인/회원가입 조건부 라우팅이 주석 처리된 상태입니다.

```tsx
// TODO: Backend /api/v1/auth/me 개통 후 아래 주석 해제
// if (!user) {
//     if (authView === 'signup') return <SignupForm ... />;
//     return <LoginForm ... />;
// }
```

**활성화 조건**: Backend 아래 5개 엔드포인트 개통 완료 후 주석 3줄 해제

| 엔드포인트 | HTTP | 역할 |
|---|---|---|
| `/api/v1/auth/login` | POST | 로그인, `HTTP 401 + INVALID_CREDENTIALS` |
| `/api/v1/auth/signup` | POST | 회원가입, `HTTP 409 + EMAIL_ALREADY_EXISTS` |
| `/api/v1/auth/me` | GET | 세션 유저 조회 |
| `/api/v1/auth/refresh` | POST | Silent Refresh |
| `/api/v1/auth/logout` | POST | 쿠키 삭제 |

---

### 3-2. 앱 초기화 시 `fetchMe()` 호출 누락

**문제**: 현재 `App.tsx`에 앱 마운트 시 세션 복원 로직이 없습니다. 페이지 새로고침 시 로그인 상태가 초기화됩니다.

**해결 방법**: `App.tsx`에 아래 `useEffect` 추가 (Auth 라우팅 활성화 시 함께 처리)

```tsx
useEffect(() => {
    fetchMe(); // HttpOnly 쿠키 기반 세션 자동 복원
}, [fetchMe]);
```

---

### 3-3. 헤더에 사용자 정보 표시 UI 부재

**문제**: 로그인 후에도 `App.tsx` 헤더에 사용자 정보(닉네임, 로그아웃 버튼)가 없습니다.

**해결 방법**: 헤더 우측에 조건부 렌더링 추가

```tsx
// App.tsx header 내부
{user && (
    <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 font-medium">👤 {user.nickname}</span>
        <button onClick={logout} className="text-xs text-red-500 hover:underline">로그아웃</button>
    </div>
)}
```

---

## 4. 🟢 Info — 코드 정리 권장

### 4-1. 중복/불필요 파일 정리

| 파일 | 문제 | 조치 |
|---|---|---|
| `frontend/app.js` | Vite + React 프로젝트에 불필요한 레거시 JS 파일 | 검토 후 삭제 또는 이동 |
| `vite.config.js` + `vite.config.d.ts` | `vite.config.ts`와 중복 | `.ts` 단일 파일만 유지 |
| `typescript-errors.txt` | 과거 타입 에러 기록 파일 — 소스에 포함 부적절 | `.gitignore` 추가 또는 삭제 |

---

## 5. Frontend 에이전트 최종 체크리스트

```
[🔴 즉시 처리]
[ ] package.json에 "axios": "^1.7.9" 추가
[ ] .env.example 파일 생성 (VITE_API_BASE_URL 포함)

[🟡 Backend 개통 후 처리]
[ ] App.tsx 주석 3줄 해제 → Auth 라우팅 활성화
[ ] App.tsx에 fetchMe() 초기 호출 useEffect 추가
[ ] 헤더 사용자 정보(닉네임 + 로그아웃 버튼) UI 추가

[🟢 선택 정리]
[ ] app.js, vite.config.js, vite.config.d.ts 중복 파일 검토
[ ] typescript-errors.txt .gitignore 처리
[ ] SignupForm 약관 링크 → 실제 모달/페이지 연결
```

---

## 6. Backend 에이전트 전달 요청

> 아래 항목은 Frontend가 단독으로 처리할 수 없으며, Backend 에이전트의 협조가 필요합니다.

- `POST /api/v1/auth/login` → 실패 시 `HTTP 401 + { "detail": "INVALID_CREDENTIALS" }`
- `POST /api/v1/auth/signup` → 이메일 중복 시 `HTTP 409 + { "detail": "EMAIL_ALREADY_EXISTS" }`
- `GET /api/v1/auth/me` → HttpOnly 쿠키 기반 세션 검증
- `POST /api/v1/auth/refresh` → Access Token 자동 갱신
- `POST /api/v1/auth/logout` → HttpOnly 쿠키 삭제
- CORS 설정: `http://localhost:5173` (개발) 및 프로덕션 도메인 허용
