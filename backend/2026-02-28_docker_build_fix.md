### 🛠️ 작업 내역 요약 (2026-02-28)

1. **Docker 빌드 캐시 에러(`main.py` 낫파운드) 해결**
   - 아키텍처 리뷰 반영 과정에서 삭제된 `main.py` 파일이 `Dockerfile` 내 `COPY main.py .` 명령어에 여전히 남아있어 발생한 `failed to calculate checksum of ref` 에러를 디버깅했습니다.
   - `Dockerfile` 내부의 `main.py` COPY 구문을 삭제하여 정상적으로 빌드될 수 있도록 조치 완수했습니다. 런타임 진입점인 `entrypoint.sh`는 이미 내부 `src.api.main:app`을 바로 참조하도록 정상 작동합니다.
