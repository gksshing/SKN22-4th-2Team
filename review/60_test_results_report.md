# 🧪 쇼특허 (Short-Cut) 테스트 결과 보고서

**테스트 일시:** 2026-03-02 22:00 KST  
**GitHub Actions:** [skn-ai22-251029/SKN22-4th-2Team/actions](https://github.com/skn-ai22-251029/SKN22-4th-2Team/actions)  
**ALB URL:** `http://short-cut-alb-183482512.ap-northeast-2.elb.amazonaws.com`

---

## ✅ 1. 로직 테스트 (pytest)

**실행:** `python -m pytest tests/test_security.py tests/test_parser.py -v`

| 파일               | 케이스   | 결과                | 소요 시간 |
| ------------------ | -------- | ------------------- | --------- |
| `test_security.py` | 5개      | ✅ **5/5 PASSED**   | 0.35s     |
| `test_parser.py`   | 20개     | ✅ **20/20 PASSED** | 0.16s     |
| **합계**           | **25개** | ✅ **25/25 PASSED** | **0.51s** |

### 보안 테스트 (`test_security.py`)

| 테스트명                                                  | 결과 |
| --------------------------------------------------------- | ---- |
| `test_sanitize_user_input_normal`                         | ✅   |
| `test_sanitize_user_input_too_long` (2001자 초과 차단)    | ✅   |
| `test_detect_injection_patterns` (6가지 인젝션 패턴 탐지) | ✅   |
| `test_wrap_user_query`                                    | ✅   |
| `test_html_escaping` (`<script>` 태그 무력화)             | ✅   |

### 파서 테스트 (`test_parser.py`)

| 그룹               | 케이스 | 결과          |
| ------------------ | ------ | ------------- |
| Level1 정규식 파싱 | 6개    | ✅ ALL PASSED |
| Level2 구조 파싱   | 3개    | ✅ ALL PASSED |
| Level3 NLP 파싱    | 3개    | ✅ ALL PASSED |
| Level4 폴백 파싱   | 5개    | ✅ ALL PASSED |
| 데이터 무결성 검증 | 3개    | ✅ ALL PASSED |

> ⚠️ `pytest.mark.unit` 미등록 경고 5건 — 기능 이상 없음. `pytest.ini`에 `markers` 등록 권장.

---

## ✅ 2. 부하 테스트 (Locust)

**실행:** `locust -f tests/locustfile.py --headless -u 10 -r 2 --run-time 20s`  
**대상:** ALB URL  
**파라미터:** 가상 사용자 10명, 초당 2명씩 증가, 20초 실행

| Task          | 가중치        | 엔드포인트             |
| ------------- | ------------- | ---------------------- |
| 홈페이지 접속 | 60%           | `GET /`                |
| 헬스체크      | 40%           | `GET /health`          |
| 특허 분석 API | LLM 비용 고려 | `POST /api/v1/analyze` |

> 서버가 분석 요청에 응답하는지, 홈페이지 응답 시간은 얼마인지 측정 완료.  
> 정밀 분석이 필요하다면: **50명, 60초** 재실행 권장.

---

## ℹ️ 미실시 항목 (배포 완료 후 별도 진행)

| 도구                  | 사유                         | 실행 방법                                                                                                                 |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Playwright (UI)**   | 서버에 구버전 이미지 서빙 중 | [GitHub Actions 완료 후](https://github.com/skn-ai22-251029/SKN22-4th-2Team/actions) `python tests/test_ui_playwright.py` |
| **Lighthouse (성능)** | 수동 실행 필요               | Chrome F12 → Lighthouse → 분석 클릭                                                                                       |

---

## 📋 종합 요약

| 구분                 | 결과                          |
| -------------------- | ----------------------------- |
| pytest 로직 테스트   | ✅ **25/25 PASSED**           |
| Locust 부하 테스트   | ✅ **실행 완료** (10명, 20초) |
| Playwright UI 테스트 | ⏳ 배포 완료 후 진행 예정     |
| Lighthouse 성능 측정 | ⏳ 배포 완료 후 진행 예정     |

**GitHub Actions 배포 현황 확인:** [https://github.com/skn-ai22-251029/SKN22-4th-2Team/actions](https://github.com/skn-ai22-251029/SKN22-4th-2Team/actions)
