### 🛠️ 작업 내역 요약 (2026-02-28)

1. **`src/vector_db.py`의 `HOME` 환경 변수 사이드 이펙트 방지 (안전성 확보)**
   - 기존 `HOME` 디렉토리를 통째로 `/tmp`로 임시 변경하던 로직을 제거했습니다.
   - HuggingFace 관련 임시/캐시 파일 권한 문제(Permission denied) 방지를 위해 타 라이브러리에 영향이 없는 `HF_HOME` 만을 `/tmp/huggingface` 로 분리 지정하여 멀티 스레드/비동기 환경에서의 동시성 부작용을 원천 차단했습니다.

2. **메타데이터 길이 하드코딩 제거 (Zero Hardcoding 적용)**
   - `src/vector_db.py` 내에서 30,000바이트 / 10,000글자 단위로 텍스트를 고정하여 자르던 부분의 하드코딩을 제거했습니다.
   - `src/config.py` 의 `PineconeConfig` 인스턴스에 `max_metadata_length` (기본값 10,000) 속성을 추가하여, 설정에서 유연하게 중앙 제어할 수 있도록 개선했습니다.

3. **사용되지 않는 루트 파일 삭제**
   - 현재 진입점(`entrypoint.sh`)이 `src.api.main:app`으로 정상 교체되어 있으므로, 구조적 혼동을 일으킬 수 있는 루트 경로의 `main.py`를 완벽히 삭제 조치했습니다.
