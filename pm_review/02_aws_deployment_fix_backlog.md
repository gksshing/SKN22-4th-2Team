# 📊 쇼특허(Short-Cut) PM 브리핑: AWS 배포 환경 인증 UI 장애 진단 및 대응 백로그

## 🚨 AWS 환경에서 로그인 창이 보이지 않는 원인 진단 (Root Cause)
AWS 배포 환경의 인프라 코드와 파이프라인을 점검한 결과, 로컬 환경과 클라우드 배포 환경 간의 치명적인 빌드 프로세스 누락이 발견되었습니다.

1. **프론트엔드 빌드 누락 (React 미컴파일)**
   - 현재 `Dockerfile`은 앱을 빌드할 때 `frontend` 폴더를 원본 그대로 복사하고 있습니다. 
   - React 코드(`.tsx`)는 브라우저가 바로 읽을 수 없으며, 반드시 `npm run build`를 거쳐 `dist` 폴더(정적 HTML/JS/CSS)로 변환되어야 합니다. 
   - 이 빌드 과정이 없으므로 AWS의 FastAPI 서버는 컴파일되지 않은 코드를 내뱉고 있으며, 브라우저가 화면을 렌더링하지 못하고 예전 버전(캐시)이나 깨진 화면을 보여주는 것입니다.
2. **최신 수정본 미적용 (CI/CD 미발동)**
   - 아까 런타임 마커(`<<<<<<<`)를 제거했던 해결 코드는 현재 선생님의 로컬(로컬 PC)에만 존재합니다. 이 변경사항을 GitHub에 Push해야 AWS 파이프라인(`ecr-cicd.yml`)이 동작하여 새로운 버전이 배포됩니다.

---

## 📋 핵심 우선순위 백로그 (DevOps & Backend 전달용)

PM 관점에서 AWS 배포 환경 정상화를 위해 가장 시급한 태스크를 도출했습니다. 다음 내용을 복사하여 DevOps 및 Backend 에이전트에게 지시해 주세요.

### 🥇 Priority 1: Dockerfile 멀티 스테이지 빌드 고도화 (DevOps/Backend)
- **[Task] React 빌드 스테이지 추가**
  - 기존 `Dockerfile`에 Node.js 기반의 프론트엔드 빌드 스테이지를 추가하세요.
  - `frontend` 폴더 내에서 `npm install` 및 `npm run build`를 수행하여 최적화된 `dist` 에셋을 생성하세요.
- **[Task] FastAPI 서빙 경로 최적화**
  - Python 런타임 스테이지에서 위에서 생성된 `frontend/dist` 폴더만 복사해오세요.
  - `main.py`의 `StaticFiles` 서빙 로직이 정상적으로 `dist/index.html`을 반환하도록 연동하세요.

### 🥈 Priority 2: 로컬 고정사항 Push 및 배포 파이프라인 트리거 (DevOps/User)
- **[Task] 코드 Commit 및 GitHub Push**
  - 로컬에서 충돌 마커를 제거하고 정리한 `index.html`, `App.tsx`, `apiClient.ts`를 `develop` 브랜치에 Commit하고 Push 하세요.
- **[Task] ECS 배포 모니터링**
  - GitHub Actions 파이프라인이 ECR 이미지를 재빌드하고 ECS 서비스를 Rolling Update하는지 확인하세요.

---

**👨‍💻 Scrum Master의 제안:**
가장 시급한 것은 **Dockerfile을 수정하여 React 프론트엔드가 AWS 환경에서도 정상 작동하도록 빌드 파이프라인을 구축하는 것**입니다. DevOps 또는 Backend 에이전트를 호출하여 "Dockerfile에 프론트엔드(React) 빌드 단계를 추가해줘"라고 지시하시면 문제가 근본적으로 해결됩니다!
