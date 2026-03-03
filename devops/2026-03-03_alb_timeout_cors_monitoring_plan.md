### ☁️ 클라우드 배포 아키텍처 상태 요약

백엔드 단(FastAPI)의 500 에러 시 CORS 헤더 방어 로직이 완벽하게 반영되었음을 확인했습니다.
향후 대규모 부하(Load/Stress) 테스트 진행 시 프론트엔드 브라우저에서 여전히 CORS 파생 에러가 관찰된다면, 이는 애플리케이션 코드가 아닌 AWS 인프라 계층의 병목일 확률이 99%입니다. 이를 선제적으로 모니터링하고 추적하기 위해 인프라 레벨(ALB, ECS, WAF)의 로깅 및 경보(Alarm) 구조를 다음과 같이 고도화할 계획입니다.

1. **ALB 5xx 에러 트래픽 모니터링:** 로드밸런서가 타임아웃(504 Gateway Timeout) 또는 타겟 그룹 연결 실패(502 Bad Gateway)를 뱉을 때 클라이언트에는 CORS 에러로 위장되어 나타날 수 있습니다. ALB의 `HTTPCode_ELB_5XX_Count` 및 `TargetResponseTime` 메트릭을 CloudWatch Alarm과 연동하여 슬랙 알림을 구성하겠습니다.
2. **ECS 컨테이너 단위 리소스 모니터링:** CPU 스로틀링(Throttling)이나 OOM(Out of Memory) 현상으로 백엔드 컨테이너가 뻗어 응답하지 못하는 상황을 방지하기 위해 ECS Container Insights를 활성화하여 리소스 모니터링을 강화합니다.

### 📋 PM 에이전트 전달용 기술 백로그 (복사해서 PM에게 전달하세요)

- **Epic: AWS 인프라 프로비저닝 및 유지보수**
  - [ ] ALB 타임아웃(502/504) 패턴 분석을 위한 CloudWatch 대시보드 구성 및 모니터링 경보(Alarm) 설정
  - [ ] 대용량 트래픽 대비 ECS Fargate 타겟 그룹의 헬스체크 주기 최적화 및 유휴 타임아웃 설정 리뷰
- **Epic: CI/CD 및 보안**
  - [ ] 추후 AWS WAF(Web Application Firewall) 도입 시, 정상적인 RAG 요청이 악성 트래픽으로 오인되어 차단(이 역시 브라우저에선 CORS 에러로 표시됨)되지 않도록 WAF ACL 로깅 활성화 및 예외 정책 수립 모니터링
