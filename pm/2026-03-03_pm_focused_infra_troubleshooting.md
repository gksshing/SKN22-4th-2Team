# 📂 쇼특허(Short-Cut) PM 백로그 브리핑 (Infra Bottleneck Tracking)

**Date:** 2026-03-03
**Status Overview:** 애플리케이션(Frontend/Backend) 계층의 에러 파싱 및 CORS 헤더 강제 주입 로직은 모두 완료 및 검증되었습니다. 현재 관찰되는 '네트워크 연결 오류'는 인프라 병목에 기인하므로, 이에 대한 원인 규명에 총력을 기울입니다.

---

## 🎯 PM 칸반 보드 업데이트: 인프라 원인 색출

현재 가장 높은 우선순위를 지닌 DevOps 인프라 모니터링 태스크입니다. 문제 해결에 직결되지 않는 기타 항목(WAF 장기 계획 등)은 백로그 깊은 곳으로 연기(Defer) 처리했습니다.

### 📝 Epic: AWS 인프라 모니터링 및 병목 해결 (Troubleshooting)

#### 1. Todo (우선순위: 최고 🔴)

- **[DevOps] ALB 타임아웃(502/504) 트래픽 모니터링 및 로그 추출**
  - 에러 발생 시간대 기준 CloudWatch ALB `HTTPCode_ELB_5XX_Count` 지표 확인
  - 로드밸런서가 백엔드 응답을 기다리다 타임아웃을 낸 것인지 즉각적인 이력(Log) 도출 및 리포트
- **[DevOps] ECS Fargate 리소스 한계(OOM/CPU) 점검**
  - 동일 시간대의 ECS Fargate Task CPU/Memory 사용량 추이 분석
  - RAG 추론 부하로 인해 컨테이너가 비정상 종료(Exit Code 파악 / Stop Code 이력)되었는지 확인 및 리포트

---

✅ **마무리 보고 및 State Tracking (Scrum Master)**
개발 팀 여러분, 방해 요소를 모두 제거하고 **'오직 인프라 병목 색출'**에만 집중할 수 있도록 칸반 보드를 재구성했습니다.

👉 **Next Step:**
DevOps 담당자는 즉시 위 두 가지 **Todo** 항목에 대한 CloudWatch 지표 및 ECS 로그 분석을 수행하고, 문제가 **ALB 타임아웃**인지 **컨테이너 자원 고갈**인지 결론을 내어 이 스레드에 리포트해 주시기 바랍니다.
