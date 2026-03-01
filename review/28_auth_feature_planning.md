# 🔐 쇼특허(Short-Cut) 회원가입 및 로그인(Auth) 기능 구현 기획안

**작성자**: Chief Architect & DevSecOps 전문가
**목적**: 신규 회원가입 및 로그인(인증/인가) 기능 추가를 위한 파트별 작업 항목 및 보안 요구사항 정의 (PM/개발/인프라팀 공유용)

---

## 🏗️ 1. Backend (FastAPI & Python) 역할 및 필수 요건

**[핵심 목표: 안전한 사용자 인증 처리 및 세션 관리]**

1. **데이터베이스 설계 및 모델링**
   - User 모델 설계 (예: `id`, `email`, `hashed_password`, `created_at` 등)
   - Pydantic 모델을 통한 요청(Request)/응답(Response) 데이터 타입 검증 (이메일 양식, 비밀번호 복잡도 사전 검증 필수)
   - 코드 작성 시 **반드시 Type Hints** 적용 및 **PEP8 컨벤션** 준수.

2. **비밀번호 단방향 암호화 (보안 필수)**
   - 평문 비밀번호 저장 절대 금지. 반드시 `PassLib` 라이브러리와 `bcrypt` (또는 `argon2`) 알고리즘을 사용하여 해싱(Hashing) 후 DB 저장.

3. **JWT(JSON Web Token) 기반 인증 체계 구현**
   - Access Token(짧은 수명, 예: 30분) 및 Refresh Token(긴 수명, 예: 7일) 발급 로직 구현.
   - **[Zero Hardcoding]** JWT Secret Key는 절대 코드에 하드코딩하지 않고 `.env` 또는 AWS Secrets Manager에서 동적으로 환경 변수로 불러오도록 작성.

4. **예외 처리 및 보안 방어 로직 (DevSecOps 요구사항)**
   - 무차별 대입 공격(Brute-force) 방지를 위해 로그인 API에 `try-except`와 강력한 로깅(Logging)을 추가하고, Redis 기반 Rate Limiting 제한 적용 검토.
   - 동기(Sync) 로직(예: 비밀번호 해싱 등 무거운 연산)이 비동기(Async) 이벤트 루프를 블로킹하지 않도록 주의.

---

## 🐳 2. DevOps & Infra (AWS & Docker) 역할 및 필수 요건

**[핵심 목표: 안전한 비밀번호/키 관리 및 통신 암호화]**

1. **민감 정보(Secrets) 관리 (Zero Hardcoding 원칙)**
   - JWT 서명을 위한 `SECRET_KEY`, DB 접속을 위한 `DB_PASSWORD` 등은 Git에 절대 올라가지 않도록 격리.
   - AWS Secrets Manager를 통해 런타임에 안전하게 주입되도록 권한 구성. 컨테이너 환경 변수나 로그에 평문으로 노출되지 않도록 철저히 격리.

2. **도커 컨테이너 보안 및 최적화**
   - 사용자 인증 관련 컨테이너 이미지는 **멀티 스테이지 빌드(Multi-stage build)**를 적용해 최소한의 사이즈로 최적화.
   - 컨테이너는 루트 권한이 아닌 **최소 권한 사용자(non-root user)**로 실행되도록 Dockerfile 구성 필수.

3. **데이터 전송 및 접근 제어 보안**
   - 인증 정보(ID/PW) 네트워크 탈취 방지를 위해 ALB(Application Load Balancer) 단에 SSL/TLS 인증서(HTTPS) 강제.
   - AWS IAM 및 DB 권한은 '최소 권한 원칙(Least Privilege)'에 따라 백엔드 애플리케이션의 인증/조회 용도로만 한정.

---

## 🖥️ 3. Frontend (React/Vue/기타) 역할 및 필수 요건

**[핵심 목표: 취약점 없는 토큰 관리 및 Graceful한 사용자 경험 제공]**

1. **안전한 토큰 저장 체계 구축 (XSS 방어)**
   - Access Token은 XSS 공격에 탈취되기 쉬운 `localStorage` 대신 **HttpOnly / Secure Cookie** 형태로 발급 및 저장하도록 백엔드와 연동 체계 구축. (불가피한 경우 탈취 대비 짧은 만료 시간 정책 적용)

2. **입력 폼(Form) 검증 및 방어적 UI 기획**
   - 프론트엔드 단에서도 이메일 형식, 비밀번호 길이 및 조합 등을 사전에 검증하여 불필요한 백엔드 API 호출/부하 방지.
   - 로그인 실패 시 "비밀번호가 틀렸습니다" 등 구체적인 이유 대신, "아이디 또는 비밀번호를 확인해주세요"라는 통합 메시지를 노출하여 계정 열거(Account Enumeration) 공격 방어.

3. **인증 상태 관리 유지 및 라우팅 에러 처리**
   - 토큰 유효기간 만료 (401 에러 등) 징후 발생 시, API Error Interceptor를 통해 Refresh Token으로 조용하게(Silent) Access Token을 재발급하는 Flow 추가.
   - 예외 상황(네트워크 오류, 검색 결과가 없을 때 등)에 대해 Graceful한 에러 페이지와 로딩 뷰를 표출.

---

## 💡 Tech Lead의 머지(Merge)/관리 시스템 권고

> **"인증(Auth) 시스템은 개발 런칭에 있어 가장 기초적이면서 한번 뚫리면 치명적인 (Critical) 영역입니다."**
> 
> PM께서는 기획 및 티켓 넘기실 때, 다음 두 가지를 절대 원칙으로 삼아주십시오.
> 1) **Zero Hardcoding**: 개발자들이 급하다고 `.env.local` 내용이나 시크릿 키를 소스코드에 커밋하지 않도록 코드 리뷰(PR) 과정에서 강제화.
> 2) **사전 API 명세 확정**: FE/BE 작업 시작 전, Access / Refresh 토큰의 수명주기, HttpOnly 적용 여부, 통신 페이로드(Pydantic Schema) 포맷을 Swagger 등을 통해 먼저 락(Lock) 시켜야 불필요한 공용 리소스 낭비를 막을 수 있습니다.
