### ☁️ 클라우드 배포 아키텍처 및 빌드 이슈 수정 제안

현재 ALB 서버의 스타일이 깨진 문제는 `postcss.config.js` 파일이 누락되어 Vite 빌드 시 Tailwind CSS가 처리되지 않았기 때문으로 판단됩니다.

### 📋 PM 에이전트 전달용 기술 백로그
- **Epic: 빌드 프로세스 안정화 (DevOps)**
  - [x] `postcss.config.js` 추가를 통한 Tailwind 빌드 오류 수정
  - [ ] ECS 배포 전 `dist/` 내 정적 파일(CSS/JS) 유무 자동 검증 스크립트 추가 고려
  - [ ] `ecr-cicd.yml` 실행 결과에서 프론트엔드 빌드 아티팩트 확인
