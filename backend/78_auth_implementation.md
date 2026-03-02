# [78] Auth UX 개선 및 로그인/회원가입 구현

**작업일**: 2026-03-03  
**담당**: Backend + Frontend Agent

---

## 완료한 작업

### Backend (4개 파일)

**1. `src/database/models.py` — User 모델 추가**
- `id`, `email`, `hashed_password`, `name`, `is_active`, `created_at` 컬럼
- 기존 `UserSession`, `SearchHistory` 유지

**2. `src/api/schemas/auth_schema.py` — [NEW] Auth Pydantic 스키마**
- `SignupRequest`, `LoginRequest`, `TokenResponse`, `UserResponse`

**3. `src/api/v1/auth_router.py` — signup / login / me 엔드포인트 구현**
- `POST /api/v1/auth/signup` → 이메일 중복 확인 후 회원 저장
- `POST /api/v1/auth/login` → 비밀번호 검증 후 JWT 발급
- `GET /api/v1/auth/me` → Bearer 토큰 검증 후 사용자 정보 반환

**4. `src/api/dependencies.py` — get_current_user / get_optional_current_user 추가**
- 인증 필수 엔드포인트: `Depends(get_current_user)`
- 비로그인 허용 엔드포인트: `Depends(get_optional_current_user)`

---

### Frontend (5개 파일)

**5. `src/hooks/useAuth.ts` — 완전 구현**
- `localStorage` JWT 저장/복원 (새로고침 후 로그인 유지)
- `login()`, `signup()`, `logout()`, `isLoading`, `error` 상태 관리
- 회원가입 성공 시 자동 로그인

**6. `src/components/Auth/LoginForm.tsx` — 실 구현**
- 이메일/비밀번호 폼
- 인라인 에러 메시지, 로딩 상태, 회원가입 전환 링크

**7. `src/components/Auth/SignupForm.tsx` — 실 구현**
- 이름/이메일/비밀번호/확인 폼
- 비밀번호 일치 실시간 검증

**8. `src/components/Auth/AuthGuard.tsx` — 업데이트**
- `setAuthView` prop 추가 → LoginForm ↔ SignupForm 전환
- 배경 클릭 시 모달 닫기 (게스트 접근)

**9. `src/App.tsx` — 업데이트**
- `alert()` 제거 → 상단 orange 토스트 배너로 교체 (3초 후 자동 사라짐)
- `AuthGuard`에 `setAuthView` prop 전달
- `authLoading` 중 로딩 스피너 표시 (화면 깜박임 방지)

---

## 다음 단계 권장사항

- **배포**: 변경사항 push 후 ECS 재배포 필요
- **JWT_SECRET_KEY**: AWS Secrets Manager에 `JWT_SECRET_KEY` 키 추가 필요
  - `config.auth.secret_key`를 통해 읽음

---

## PM 에이전트 상태 업데이트 요약

- ✅ 로그인/회원가입 엔드포인트 구현 완료
- ✅ 비로그인 사용자 → 메인화면 접근 가능, 분석 시도 시 안내 후 로그인 모달
- ✅ JWT 기반 인증 (localStorage 저장, 새로고침 복원)
- 🔲 AWS Secrets Manager에 `JWT_SECRET_KEY` 추가 필요 (DevOps 요청)
