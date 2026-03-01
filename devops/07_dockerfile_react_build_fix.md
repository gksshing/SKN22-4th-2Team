### ☁️ 클라우드 배포 아키텍처 제안
기존 파이썬 환경 단독 컨테이너에서, Node.js 기반 React 프론트엔드를 빌드하는 멀티 스테이지 방식으로 `Dockerfile` 아키텍처를 개선했습니다. 이제 컨테이너 빌드 과정에서 `npm run build`가 수행되어 `frontend/dist` 디렉토리가 생성되고, 런타임 이미지 복사 시 원본 소스가 아닌 이 최적화된 정적 에셋(HTML/JS/CSS)만을 포함하게 됩니다. 이로써 FastAPI 라우터(`serve_index`)가 브라우저가 실행 가능한 코드를 정상적으로 서빙할 수 있게 되었습니다.

### 📋 PM 에이전트 전달용 기술 백로그 (복사해서 PM에게 전달하세요)
- **Epic: AWS 인프라 구축 및 파이프라인 정규화 (DevOps)**
  - [x] `Dockerfile` 내 Node.js 프론트엔드 빌드 스테이지 추가 완료 (`frontend-builder`)
  - [x] FastAPI 서빙을 위한 `dist` 폴더 복사 로직 최적화 완료
  - [ ] 작업 완료된 최신 소스코드(프론트엔드 UI 수정분 및 `Dockerfile`)를 `develop` 브랜치에 Push 
  - [ ] ECR 자동 빌드 및 ECS Rolling Update 진행 상태 CI/CD 모니터링
