# ☁️ Frontend Serving Configuration Audit Report

**날짜**: 2026-03-01
**담당**: 수석 DevOps 엔지니어

## 📋 프론트엔드 서빙 설정 확인 결과

### 1. 현재 서빙 경로 및 방식
- **서빙 대상**: **Vanilla JS 버전 (`frontend/` 디렉토리)**
- **상세 설정 (`src/api/main.py`)**:
    - `app.get("/")`: `frontend/index.html`을 반환합니다.
    - `app.mount("/")`: `StaticFiles(directory="frontend")`를 통해 `frontend/` 폴더 전체를 정적으로 서빙합니다.
- **Dockerfile 설정**: `COPY frontend/ ./frontend/`를 통해 프론트엔드 소스 전체를 컨테이너 내부로 복사하고 있습니다.

### 2. React (Vite/dist) 버전과의 공존 이슈
- **현재 상태**: React 버전(`frontend/src/`)의 빌드 산출물(`dist/`)을 서빙하는 로직이 **부재**합니다.
- **문제점**: 사용자가 `index.html` 접속 시 바닐라 JS 버전이 실행되며, `npm run build`를 통한 React 빌드 결과물은 서빙되지 않습니다.

### 3. 향후 개선 및 배포 방향 제안
- **React 버전 사용 시**:
    1. `Dockerfile`에 빌드 스테이지를 추가하여 `npm install && npm run build`를 수행해야 합니다.
    2. `src/api/main.py`의 서빙 경로를 `frontend/`에서 `frontend/dist/`로 변경해야 합니다.
- **결론**: 현재 배포 시에는 **바닐라 JS 버전이 우선적으로 서빙**됩니다. React 버전으로 전환하려면 Dockerfile 및 FastAPI 마운트 경로 수정이 필요합니다.
