### 🔍 총평 (Architecture Review)
이번 변경 사항은 전역 로딩 상태와 에러 핸들링을 중앙 집중화하여 UX를 개선한 훌륭한 시도입니다. 특히 FastAPI의 복잡한 에러 구조(Pydantic validation error array)를 프론트엔드에서 안전하게 추출하도록 `extractErrorMessage` 유틸리티를 도입한 점이 아키텍처적으로 견고합니다.

### 🚨 코드 리뷰 피드백 (개발 에이전트 전달용)
*(아래 내용을 복사해서 Frontend 에이전트에게 전달하세요)*

**[🔴 Critical: 치명적 결함 - 해당 없음]**
- 현재 로직상 런타임 에러를 유발할 만한 치명적 결함은 발견되지 않았습니다.

**[🟡 Warning: 잠재적 위험 - 개선 권장]**
- `useRagStream.ts:81` - `response.json()` 호출 시 응답 본문이 JSON이 아닐 경우(예: Nginx 502 Bad Gateway HTML) `catch` 블록에서 정확한 에러 원인을 파악하기 어려울 수 있습니다. `response.headers.get('content-type')?.includes('application/json')` 체크를 추가하면 더 안전합니다.
- `LoginForm.tsx:61` - `error.message`를 직접 UI에 노출하고 있습니다. 프로덕션 환경에서는 '계정 열거 공격(Account Enumeration)' 방지를 위해 상세 메시지 노출 여부를 환경 변수로 제어하는 것이 보안상 좋으나, 현재 요구사항인 '한글 에러 메시지 노출'에는 부합합니다.

**[🟢 Info: 클린 코드 및 유지보수 제안]**
- `useAuth.ts:16` - `extractErrorMessage`와 같은 유틸리티 함수는 추후 다른 서비스에서도 재사용될 가능성이 높으므로 `src/utils/errorUtils.ts`와 같은 공통 디렉토리로 분리하는 것을 권장합니다.
- `LoginForm.tsx` 내의 `any` 타입 매개변수(`p`, `error`)들에 대해 구체적인 인터페이스(예: `FormErrors`, `Error`)를 정의하여 타입 안정성을 높이세요.

### 💡 Tech Lead의 머지(Merge) 권고
- [x] 이대로 Main 브랜치에 머지해도 좋습니다.
- 현재 코드베이스는 충돌(Conflict) 없이 안정적으로 적용되었으며, 사용자 요구사항인 전역 로딩 및 한글 토스트 알림 기능을 충실히 수행하고 있습니다.

.
