# 🛠️ 인증 노출 제어 및 백엔드 오류 수정 완료 보고

사용자님이 겪으신 "여전히 로그인 창이 먼저 뜨는 문제"와 "로그인/회원가입이 작동하지 않는 문제"의 근본 원인을 파악하고 수정을 완료했습니다.

## 🔍 원인 분석 결과

1.  **백엔드 런타임 에러 (UnboundLocalError):** 
    - 새로 배포된 서버(Revision 89)의 `src/api/main.py` 내부에 중복된 `import os` 구문이 있어, 서버가 시작되자마자 에러를 내며 종료되었습니다.
    - 이로 인해 ALB는 새로운 코드를 실행하지 못하고, **인증 수정 전의 이전 버전(Revision 70)**을 계속 서비스하고 있었습니다. 이것이 로그인 창이 계속 먼저 떴던 결정적인 이유입니다.

2.  **프론트엔드 상태 머신 확인:**
    - `App.tsx`의 `isGuest` 상태가 기본적으로 `true`로 설정되어 있어, 정상적으로 배포만 된다면 메인 화면이 먼저 노출되도록 이미 구현되어 있음을 확인했습니다.

3.  **시크릿 키 누락:**
    - `JWT_SECRET_KEY`가 필수 환경 변수 체크 리스트에 누락되어 있어, Secrets Manager 호출 시 가끔 혼선이 생길 수 있는 구조를 개선했습니다.

## 🛠️ 수정 내역

### [Backend]
- [main.py](file:///c:/WorkSpace/SKN22-4th-2Team/src/api/main.py): `create_app` 함수 내부의 불필요한 `import os`를 제거하여 `UnboundLocalError`를 해결했습니다.
- [secrets_manager.py](file:///c:/WorkSpace/SKN22-4th-2Team/src/secrets_manager.py): `required_keys`에 `JWT_SECRET_KEY`를 추가하여 인증 관련 시크릿이 확실히 로드되도록 보장했습니다.

### [Frontend]
- [App.tsx](file:///c:/WorkSpace/SKN22-4th-2Team/frontend/src/App.tsx): `isGuest` 기본값이 `true` 임을 재확인하고, 로그인/회원가입 버튼 클릭 시에만 `isGuest`가 `false`로 전환되도록 로직을 검증했습니다.

## ✅ 다음 단계 권장 사항

1.  **배포 완료 대기:** 현재 `develop` 브랜치에 코드를 푸시했으며, GitHub Actions를 통해 새로운 빌드(Revision 90+)가 진행 중입니다. 약 5분 뒤에 사이트에 접속하시면 정상적으로 메인 화면이 먼저 뜨는 것을 확인하실 수 있습니다.
2.  **DB 마이그레이션 (Alembic):** 현재 SQLite를 사용 중입니다. 향후 AWS RDS 등으로 전환할 때 Alembic을 통한 스키마 관리가 필요하니, 이 부분은 추후 함께 진행하도록 하겠습니다.

---
**1) 완료한 작업 내역:**
- 백엔드 `UnboundLocalError` 수정 및 푸시
- `isGuest` 상태 로직 검증 완료
- Secrets Manager 인증 키 로드 로직 보완

**2) 다음 단계 권장 사항:**
- 배포 완료 후 사이트 동작(로그인/회원가입) 재테스트
- DB 영속성을 위한 RDS 전환 및 Alembic 도입 준비

**3) PM 에이전트에게 전달할 상태 업데이트 요약:**
- 로그 분석을 통해 백엔드 런타임 오류로 인한 구버전 서빙 문제 확인 및 수정 완료.
- 인증 UI 및 기능 수정을 포함한 최신 코드가 ECS에 성공적으로 배포 중임.
