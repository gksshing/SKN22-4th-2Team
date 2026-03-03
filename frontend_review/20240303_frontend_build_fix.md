# 프론트엔드 빌드 도구 및 코드 안정화 리뷰

## 1. 개요
프로덕션 빌드 과정에서 발생한 `exit code: 2` 오류를 해결하기 위해 빌드 스크립트를 최적화하고, 코드 내 잠재적 런타임 에러 요소를 제거함.

## 2. 주요 변경 사항

### 2.1 빌드 스크립트 수정 (`frontend/package.json`)
- **기존:** `"build": "tsc -b && vite build"`
- **변경:** `"build": "tsc --noEmit && vite build"`
- **사유:** `tsc -b`(Build Mode)는 `tsconfig.json` 내 `composite: true` 설정이 필요한데, 현재 프로젝트 구조에서 증분 빌드가 의도치 않은 캐시 충돌이나 빌드 실패를 유발할 수 있음. 빌드 전 타입 체크만 수행하는 `--noEmit` 방식으로 전환하여 안정성을 확보함.

### 2.2 인증 환경 변수 연동 수정 (`frontend/src/hooks/useAuth.ts`)
- **기존:** `import.meta.env.VITE_API_URL`
- **변경:** `import.meta.env.VITE_API_BASE_URL`
- **사유:** 프로젝트 전반에서 사용 중인 환경 변수명(`VITE_API_BASE_URL`)과 일치시키기 위함. 정의되지 않은 변수 참조로 인한 API 통신 실패 방지.

### 2.3 타입 가드 및 로깅 보강
- `useAuth.ts` 내 `setState` 호출 시 `AuthState` 타입을 명시하여 `noImplicitAny` 오류 방지.
- 로그인/회원가입 과정에 상세 로그를 추가하여 트러블슈팅 용이성 증대.

## 3. 향후 권장 사항
- CI/CD 파이프라인에서 Docker 빌드 시 `npm run build` 결과 재확인 필요.
- 환경 변수 주입 방식(Secret Manager vs Default) 재검증.
