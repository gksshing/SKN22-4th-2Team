# ECS 배포 실패 현황 및 대응 방안

## 현재 상황

서버가 **완전히 다운**된 상태입니다.

### 타임라인
1. 이전: 구버전 이미지로 서버 가동 → `bm25_params_path` AttributeError 발생
2. 새 코드 push → GitHub Actions 성공 → ECS 새 태스크 시작 시도
3. 새 태스크가 헬스체크 반복 실패 → 롤백 반복 → 결국 완전 다운

## 근본 원인 (추정)

ECS 새 태스크 시작 시 헬스체크(`/health`) 실패 반복. 원인 후보:

| 순위 | 원인 | 증거 |
|-----|------|------|
| 1위 | AWS Secrets Manager 접근 실패 | `src/api/main.py` lifespan에서 `bootstrap_secrets()` 호출, 실패 시 `OPENAI_API_KEY` 없어서 PatentAgent 초기화 실패 |
| 2위 | ML 모델 초기화 타임아웃 | spacy, sentence-transformers 로딩에 30초 이상 소요 가능 |
| 3위 | OOM | 1024MB로는 부족 (2048MB로 증가 적용됨) |

## 즉시 확인 필요 (CloudWatch)

**AWS Console → CloudWatch → Log groups → `/ecs/short-cut-api`**  
가장 최근 실패한 태스크의 로그에서 다음 키워드 검색:

```
Missing critical environment variable
FATAL: Dependency initialization failed
bootstrap_secrets
OOMKilled
```

## 이미 적용된 수정 (push 완료)

- `src/vector_db.py`: PineconeClient 방어적 초기화
- ECS Task 메모리: 1024MB → 2048MB
- ECS 헬스체크 startPeriod: 20s → 60s
- GHA Docker 레이어 캐시 제거
