# 📋 Issue #50 기획서 — 로컬 환경 Cookie Secure 이슈 대응 방안

> **작성자**: 수석 아키텍트 (Senior Architect)
> **연계 이슈**: Issue #49 (Auth 명세 정합성)

---

## 🔍 총평 (Architecture Review)

현재 Auth 아키텍처는 HttpOnly Cookie를 사용하므로, 프로덕션(HTTPS)을 위한 `Secure=True` 설정이 필수입니다.
하지만 백엔드에서 무조건 `Secure=True`를 강제하면, 인증서가 없는 프론트엔드 로컬 개발 환경(`http://localhost:5173`)에서는 브라우저 정책상 쿠키가 저장되지 않는 문제가 발생합니다.
이 문제를 해결하기 위해 **1) 프론트엔드 로컬 HTTPS 적용** 옵션과 **2) 백엔드 환경 분기** 옵션을 제안합니다. 프로젝트 초기 런칭 단계임을 고려할 때, **개발 편의성을 위한 옵션 2번이 우선 권장**됩니다.

---

## 🚨 해결 방안 제안 (팀 합의 후 하나 선택)

### Option 1: 프론트엔드 로컬 개발 서버에 HTTPS 적용 (Vite + mkcert)
- **개요**: 로컬 개발 시에도 `https://localhost:5173`을 사용하여 브라우저의 Secure 쿠키 제약을 회피합니다.
- **장점**: 프로덕션(HTTPS) 환경과 가장 유사한 로컬 환경 구축.
- **단점**: 개발자 로컬 PC마다 로컬 CA 인증서 설치 과정이 필요하여 초기 세팅이 번거로울 수 있습니다.
- **Frontend 실행 방안**:
  ```bash
  # 플러그인 설치
  npm install -D vite-plugin-mkcert
  ```
  ```ts
  // vite.config.ts
  import mkcert from 'vite-plugin-mkcert';
  export default defineConfig({
    plugins: [react(), mkcert()],
    server: { https: true }
  })
  ```

### Option 2: 백엔드 환경 변수에 따른 Secure 동적 설정 (권장 🌟)
- **개요**: FastAPI 백엔드에서 현재 환경(ENV)이 `local` 또는 `development`일 때는 `Secure=False`로 발급하고, `production`일 때만 `Secure=True`로 발급합니다.
- **장점**: 프론트엔드 설정 변경이나 복잡한 인증서 세팅 없이, 기존처럼 `http://localhost:5173`을 바로 사용할 수 있습니다. 개발 생산성이 가장 높습니다.
- **단점**: 로컬 환경이 프로덕션과 100% 동일하지 않음.
- **Backend 실행 방안**:
  ```python
  # FastAPI 쿠키 굽는 예시
  is_prod = os.getenv("ENVIRONMENT") == "production"
  
  response.set_cookie(
      key="access_token",
      value=new_token,
      httponly=True,
      secure=is_prod,     # 🔴 핵심: 로컬에서는 False, 상용에서는 True
      samesite="lax"      # 로컬 통신 시 lax 또는 none (none일 땐 무조건 secure=True여야 함 주의)
  )
  ```

---

## 📋 최종 권고사항 및 Action Item

이 프로젝트는 "초기 런칭(MVP) 단계"이므로 로컬 인증서 세팅이라는 오버엔지니어링(Option 1)보다는,
**백엔드 환경변수 분기를 통한 유연한 쿠키 설정(Option 2)**을 강력히 권고합니다. Option 2를 채택할 경우 프론트엔드는 현재 상태에서 아무것도 변경할 필요가 없습니다.

### 개발 에이전트 전달 사항
**[Backend 담당]**
- [ ] JWT 쿠키(`Set-Cookie`) 발급 시, `.env`의 환경변수(예: `APP_ENV`)를 참조하여 **운영(`production`)일 때만 `secure=True`**가 되도록 로직을 분기처리해 주세요. 로컬(`local`/`dev`)에서는 `secure=False`여야 프론트엔드 `http://localhost` 통신이 원활하게 동작합니다.

**[Frontend 담당]**
- Option 2 채택 시 현재로써 추가 조치 불필요
- (만약 Option 1을 채택한다면) `vite-plugin-mkcert` 추가 세팅
