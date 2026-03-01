# 🔍 Epic 4 (Auth) Code Review Report

**리뷰어**: 수석 아키텍트 / 보안 전문가
**날짜**: 2026-03-01

## 🔍 총평 (Architecture Review)
전반적으로 FastAPI의 베스트 프랙티스를 잘 따르고 있으며, JWT와 bcrypt를 활용한 보안 기초가 견고하게 설계되었습니다. 하지만 실제 구동 시 발생할 수 있는 **임포트 누락(Critical)** 건이 발견되어, 이를 수정한 후 머지할 것을 권고합니다.

## 🚨 코드 리뷰 피드백

### [🔴 Critical: 치명적 결함 - 즉시 수정 필요]
- `src/database/models.py`: `datetime.utcnow`를 사용하고 있으나 `datetime` 임포트가 누락되었습니다. (런타임 에러 발생)
- `src/api/v1/auth_router.py`: `login` 함수에서 `Request` 타입을 사용하고 있으나 `fastapi`에서 `Request` 임포트가 누락되었습니다. (런타임 에러 발생)

### [🟡 Warning: 잠재적 위험 - 개선 권장]
- `src/api/v1/auth_router.py`: 예외 발생 시 `detail=f"... {str(e)}"`와 같이 내부 에러 메시지를 그대로 노출하는 것은 보안상 좋지 않을 수 있습니다. 로깅으로만 남기고 사용자에게는 일반적인 메시지를 주거나, 특정 상황(DB 중복 등)만 명시적으로 처리하는 것이 좋습니다.

### [🟢 Info: 클린 코드 및 유지보수 제안]
- `src/database/models.py`: `datetime.utcnow()`는 Python 3.12+에서 deprecated 예정입니다. 향후 `datetime.now(timezone.utc)` 방식으로 전환을 고려해 보세요.
- `src/api/services/security.py`: `decode_token`에서 예외가 발생했을 때 로깅을 추가하면 디버깅이 더 쉬워집니다.

## 💡 Tech Lead의 머지(Merge) 권고
- [ ] 이대로 Main 브랜치에 머지해도 좋습니다.
- [x] Critical 항목이 수정되기 전까지 머지를 보류하세요.
