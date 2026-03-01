# 🛠️ Frontend Critical 오류 수정 내역 (리뷰 반영)

> **작업 기준**: `review/29_frontend_complete_declaration_review.md` Critical/Warning 항목 전체 반영
> **작업일**: 2026-03-01

---

## 🎨 UI/UX 개발 내용 요약

시니어 리뷰어(수석 아키텍트)가 발견한 **Critical 2건, Warning 2건**을 모두 수정했습니다.

### 수정 항목별 상세

#### [Critical 1] `History/HistorySidebar.tsx` 신규 구현
- 파일이 전무했던 `frontend/src/components/History/` 폴더에 `HistorySidebar.tsx` 생성
- 백엔드 `/api/v1/history?user_id=...` Query Parameter 방식으로 기록 조회
- 로딩 스켈레톤, 에러 상태, 빈 히스토리 상태를 각각 별도 UI로 구현
- 위험도(`risk_level`) 뱃지 색상 구분 (High=빨강, Medium=노랑, Low=초록)
- `isAnalyzing=true` 중에는 항목 클릭 비활성화 처리

#### [Critical 2] `App.tsx` 스트리밍 영역 하드코딩 제거
- 기존: `"가상 LLM 스트리밍 텍스트 렌더링 시작됨... ▌"` 고정 문자열
- 수정: `useRagStream` 훅의 `message` 상태를 직접 바인딩
  ```tsx
  // 수정 후
  <p>{message || '특허 데이터베이스를 검색하고 있습니다...'}<span>▌</span></p>
  ```

#### [Warning 1] `useRagStream.ts` API 요청 Body 필드 통일
- 기존: `{ idea }` → 백엔드 422 Validation Error 발생
- 수정: 백엔드 `AnalyzeRequest` Pydantic 스키마에 맞게 전체 필드 포함
  ```ts
  const reqBody = {
      user_idea: userIdea,
      user_id: window.ENV?.USER_ID || 'test_user_webapp',
      use_hybrid: useHybrid,
      ipc_filters: ipcFilters,
      stream: true,
  };
  ```

#### [Warning 2] API 엔드포인트 prefix 통일
- 기존: `/api/analyze` → 수정: `/api/v1/analyze` (app.js 기준으로 통일)

#### [부가] `App.tsx` 2단 레이아웃 재구성
- 기존: 단일 컬럼 중앙 정렬
- 수정: 좌측 `HistorySidebar` + 우측 메인 콘텐츠의 반응형 2단 레이아웃
- 헤더를 `<header>` 시맨틱 태그로 분리

---

## 📋 PM 및 Backend 전달용 피드백

- **Epic: 프론트엔드 화면 개발**
  - [x] `HistorySidebar.tsx` 신규 구현 및 `App.tsx`에 마운트 완료
  - [x] 스트리밍 결과 영역 실제 상태 바인딩 완료
  - [x] `useRagStream.ts` 요청 Body 백엔드 스키마 정합성 완료
  - [x] API 엔드포인트 `/api/v1/analyze`로 통일 완료

- **Epic: Backend에게 확인 요청할 사항**
  - [ ] `GET /api/v1/history` 응답에 `risk_level` 필드 포함 여부 확인 요청
    - `HistorySidebar`에서 위험도 뱃지를 렌더링하기 위해 `risk_level` 필드가 필요합니다.
  - [ ] `POST /api/v1/analyze` 엔드포인트에서 `use_hybrid` 파라미터가 실제로 활성화되어 있는지 확인

- **Epic: DevOps에게 확인 요청할 사항**
  - [ ] Nginx/Docker 설정에서 `frontend/src/` (React Vite 빌드 산출물 `dist/`)를 서빙하는지 확인 필요
    - `frontend/index.html` (바닐라 JS 버전)과 `frontend/src/main.tsx` (React 버전)이 여전히 공존 중
    - 배포 시 어느 버전이 서빙될지 명확히 지정 필요
