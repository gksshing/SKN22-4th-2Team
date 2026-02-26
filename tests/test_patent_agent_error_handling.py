"""
쇼특허 (Short-Cut) — OpenAI API 예외 처리 단위 테스트
=====================================================
patent_agent.py의 _call_openai, _call_openai_stream, _call_embed
래퍼 메서드에 대한 예외 처리/재시도/로깅 동작을 검증합니다.

Team: 뀨💕
"""

import pytest
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch

import openai

# 테스트 대상 모듈 — OPENAI_API_KEY 환경변수 필요
import os
os.environ.setdefault("OPENAI_API_KEY", "test-key-for-unit-tests")

from src.patent_agent import PatentAgent


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_db_client():
    """가짜 DB 클라이언트 — PatentAgent 생성 시 실제 Pinecone 연결 방지."""
    client = MagicMock()
    client.load_local.return_value = False
    client.get_stats.return_value = {"bm25_docs": 0}
    return client


@pytest.fixture
def agent(mock_db_client):
    """PatentAgent 인스턴스 — OpenAI 클라이언트는 실제 연결하되 mock으로 교체 예정."""
    return PatentAgent(db_client=mock_db_client)


def _make_chat_response(content: str = "test response", usage=None):
    """OpenAI ChatCompletion 응답 Mock 생성."""
    message = MagicMock()
    message.content = content

    choice = MagicMock()
    choice.message = message

    response = MagicMock()
    response.choices = [choice]

    if usage is None:
        usage_mock = MagicMock()
        usage_mock.prompt_tokens = 100
        usage_mock.completion_tokens = 50
        usage_mock.total_tokens = 150
        response.usage = usage_mock
    else:
        response.usage = usage

    return response


def _make_embedding_response(dim: int = 1536):
    """OpenAI Embedding 응답 Mock 생성."""
    embedding_data = MagicMock()
    embedding_data.embedding = list(np.random.randn(dim).astype(float))

    response = MagicMock()
    response.data = [embedding_data]

    usage_mock = MagicMock()
    usage_mock.prompt_tokens = 10
    usage_mock.total_tokens = 10
    response.usage = usage_mock

    return response


# =============================================================================
# 1. RateLimitError 재시도 테스트
# =============================================================================

@pytest.mark.asyncio
async def test_call_openai_retries_on_rate_limit(agent):
    """RateLimitError 2회 → 성공 시 정상 반환을 확인합니다."""
    # RateLimitError 생성 시 필수 파라미터 충족
    rate_limit_error = openai.RateLimitError(
        message="Rate limit exceeded",
        response=MagicMock(status_code=429, headers={}),
        body=None,
    )

    success_response = _make_chat_response("재시도 후 성공")

    # 2회 실패 후 3회째 성공
    agent.client.chat.completions.create = AsyncMock(
        side_effect=[rate_limit_error, rate_limit_error, success_response]
    )

    result = await agent._call_openai(
        method_name="test_rate_limit",
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "테스트"}],
    )

    assert result.choices[0].message.content == "재시도 후 성공"
    assert agent.client.chat.completions.create.call_count == 3


# =============================================================================
# 2. BadRequestError 즉시 실패 테스트
# =============================================================================

@pytest.mark.asyncio
async def test_call_openai_no_retry_on_bad_request(agent):
    """BadRequestError는 retry 없이 즉시 예외를 전파합니다."""
    bad_request_error = openai.BadRequestError(
        message="Token limit exceeded",
        response=MagicMock(status_code=400, headers={}),
        body=None,
    )

    agent.client.chat.completions.create = AsyncMock(
        side_effect=bad_request_error
    )

    with pytest.raises(openai.BadRequestError):
        await agent._call_openai(
            method_name="test_bad_request",
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "매우 긴 프롬프트..."}],
        )

    # retry 없이 1회만 호출되어야 함
    assert agent.client.chat.completions.create.call_count == 1


# =============================================================================
# 3. APITimeoutError 3회 실패 시 최종 예외 테스트
# =============================================================================

@pytest.mark.asyncio
async def test_call_openai_exhausts_retries_on_timeout(agent):
    """APITimeoutError가 3회 연속 발생하면 최종 예외가 전파됩니다."""
    timeout_error = openai.APITimeoutError(request=MagicMock())

    agent.client.chat.completions.create = AsyncMock(
        side_effect=[timeout_error, timeout_error, timeout_error]
    )

    with pytest.raises(openai.APITimeoutError):
        await agent._call_openai(
            method_name="test_timeout",
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "테스트"}],
        )

    assert agent.client.chat.completions.create.call_count == 3


# =============================================================================
# 4. 토큰 사용량 로깅 테스트
# =============================================================================

@pytest.mark.asyncio
async def test_call_openai_logs_token_usage(agent):
    """성공 호출 시 logger에 토큰 사용량이 기록되는지 확인합니다."""
    success_response = _make_chat_response("로깅 테스트")

    agent.client.chat.completions.create = AsyncMock(
        return_value=success_response
    )

    with patch("src.patent_agent.log_api_call") as mock_log:
        result = await agent._call_openai(
            method_name="test_logging",
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "테스트"}],
        )

        # log_api_call이 정확히 1회 호출
        mock_log.assert_called_once()

        # 전달된 metrics 검증
        call_args = mock_log.call_args
        metrics = call_args[0][1]  # 두 번째 위치 인수 (OpenAICallMetrics)
        assert metrics.method == "test_logging"
        assert metrics.model == "gpt-4o-mini"
        assert metrics.success is True
        assert metrics.total_tokens == 150
        assert metrics.prompt_tokens == 100
        assert metrics.completion_tokens == 50
        assert metrics.elapsed_ms > 0


# =============================================================================
# 5. _call_embed RateLimitError 재시도 테스트
# =============================================================================

@pytest.mark.asyncio
async def test_call_embed_retries_on_rate_limit(agent):
    """임베딩 API도 RateLimitError 시 재시도합니다."""
    rate_limit_error = openai.RateLimitError(
        message="Rate limit exceeded",
        response=MagicMock(status_code=429, headers={}),
        body=None,
    )

    success_response = _make_embedding_response(dim=1536)

    agent.client.embeddings.create = AsyncMock(
        side_effect=[rate_limit_error, success_response]
    )

    result = await agent._call_embed(text="테스트 임베딩")

    assert isinstance(result, np.ndarray)
    assert result.shape == (1536,)
    assert agent.client.embeddings.create.call_count == 2


# =============================================================================
# 6. generate_hypothetical_claim BadRequestError fallback 테스트
# =============================================================================

@pytest.mark.asyncio
async def test_hyde_falls_back_on_bad_request(agent):
    """generate_hypothetical_claim이 BadRequestError 시 축소된 프롬프트로 재시도합니다."""
    bad_request_error = openai.BadRequestError(
        message="Maximum context length exceeded",
        response=MagicMock(status_code=400, headers={}),
        body=None,
    )
    fallback_response = _make_chat_response("축소된 가상 청구항")

    # 첫 호출은 BadRequestError, 두 번째는 성공
    agent._call_openai = AsyncMock(
        side_effect=[bad_request_error, fallback_response]
    )

    result = await agent.generate_hypothetical_claim("매우 긴 아이디어 " * 1000)

    assert result == "축소된 가상 청구항"
    assert agent._call_openai.call_count == 2

    # 두 번째 호출의 method_name이 fallback인지 확인
    second_call_kwargs = agent._call_openai.call_args_list[1]
    assert second_call_kwargs.kwargs.get("method_name") == "generate_hypothetical_claim_fallback"


# =============================================================================
# 7. critical_analysis_stream 에러 시 에러 메시지 yield 테스트
# =============================================================================

@pytest.mark.asyncio
async def test_critical_analysis_stream_yields_error_on_failure(agent):
    """스트림 중 에러 발생 시 에러 메시지가 yield되는지 확인합니다."""
    from src.patent_agent import PatentSearchResult

    # 테스트용 검색 결과
    test_results = [
        PatentSearchResult(
            publication_number="KR-123456-A",
            title="테스트 특허",
            abstract="테스트 초록",
            claims="테스트 청구항",
            ipc_codes=["G06F"],
            grading_score=0.8,
            grading_reason="관련성 높음",
        )
    ]

    # _call_openai_stream이 에러 메시지를 yield하도록 설정
    async def mock_stream(**kwargs):
        yield "\n\n⚠️ 분석 중 오류 발생: Connection error\n"

    agent._call_openai_stream = mock_stream

    tokens = []
    async for token in agent.critical_analysis_stream("테스트 아이디어", test_results):
        tokens.append(token)

    full_text = "".join(tokens)
    assert "오류" in full_text or "⚠️" in full_text
