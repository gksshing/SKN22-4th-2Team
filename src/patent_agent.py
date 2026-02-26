"""
Short-Cut - Self-RAG Patent Agent with Hybrid Search & Streaming
==========================================================================
Advanced RAG pipeline with HyDE, Hybrid Search (RRF), Streaming, and CoT Analysis.

Features:
1. HyDE (Hypothetical Document Embedding) - Generate virtual claims for better retrieval
2. Hybrid Search - Dense (FAISS) + Sparse (BM25) with RRF fusion
3. LLM Streaming Response - Real-time analysis output
4. Critical CoT Analysis - Detailed similarity/infringement/avoidance analysis

Author: Team 뀨💕
License: MIT
"""

from __future__ import annotations

import asyncio
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator

from dotenv import load_dotenv
from pydantic import BaseModel, Field
import httpx
import openai
from openai import AsyncOpenAI
import numpy as np
from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from src.utils import get_structured_logger, log_api_call, OpenAICallMetrics

load_dotenv()

# Import orjson if available, otherwise fall back to json
try:
    import orjson
    def json_loads(s): return orjson.loads(s)
    def json_dumps(o): return orjson.dumps(o).decode()
except ImportError:
    import json
    json_loads = json.loads
    json_dumps = json.dumps

# =============================================================================
# Logging Setup — 구조화 로거 사용
# =============================================================================

logger = get_structured_logger(__name__)

# Retry 대상 예외 (일시적 장애 → 재시도 가치 있음)
_RETRYABLE_EXCEPTIONS = (
    openai.RateLimitError,
    openai.APITimeoutError,
    openai.APIConnectionError,
)


# =============================================================================
# Configuration (Environment Variables)
# =============================================================================

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY가 설정되지 않았습니다. API 호출 시점에 오류가 발생합니다.")

# Models - configurable via environment variables
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
GRADING_MODEL = os.environ.get("GRADING_MODEL", "gpt-4o-mini")  # Cost-effective
ANALYSIS_MODEL = os.environ.get("ANALYSIS_MODEL", "gpt-4o")  # High quality
HYDE_MODEL = os.environ.get("HYDE_MODEL", "gpt-4o-mini")
FALLBACK_MODEL = os.environ.get("FALLBACK_MODEL", "gpt-3.5-turbo")  # Fallback for errors
PARSING_MODEL = os.environ.get("PARSING_MODEL", "gpt-4o-mini")  # 스트리밍 마크다운 → JSON 구조화 파싱용 경량 모델 (비용 절감 목적)

# Thresholds - configurable via environment variables
GRADING_THRESHOLD = float(os.environ.get("GRADING_THRESHOLD", "0.6"))
MAX_REWRITE_ATTEMPTS = int(os.environ.get("MAX_REWRITE_ATTEMPTS", "1"))
TOP_K_RESULTS = int(os.environ.get("TOP_K_RESULTS", "5"))

# Hybrid search weights
DENSE_WEIGHT = float(os.environ.get("DENSE_WEIGHT", "0.5"))
SPARSE_WEIGHT = float(os.environ.get("SPARSE_WEIGHT", "0.5"))

# Data paths - relative to this file
from pathlib import Path
DATA_DIR = Path(__file__).resolve().parent / "data"
PROCESSED_DIR = DATA_DIR / "processed"
OUTPUT_DIR = DATA_DIR / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# =============================================================================
# Pydantic Models for Structured Outputs
# =============================================================================

class GradingResult(BaseModel):
    """Structured grading result from GPT."""
    patent_id: str = Field(description="Patent publication number")
    score: float = Field(description="Relevance score from 0.0 to 1.0")
    reason: str = Field(description="Brief explanation for the score")


class GradingResponse(BaseModel):
    """Response containing all grading results."""
    results: List[GradingResult] = Field(description="List of grading results")
    average_score: float = Field(description="Average score across all results")


class QueryRewriteResponse(BaseModel):
    """Optimized search query from GPT."""
    optimized_query: str = Field(description="Improved search query")
    keywords: List[str] = Field(description="Key technical terms to search")
    reasoning: str = Field(description="Why this query should work better")


class SimilarityAnalysis(BaseModel):
    """유사도 평가 section."""
    score: int = Field(description="Technical similarity score 0-100")
    common_elements: List[str] = Field(description="Shared technical elements")
    summary: str = Field(description="Overall similarity assessment")
    evidence_patents: List[str] = Field(description="Patent IDs supporting this analysis")


class InfringementAnalysis(BaseModel):
    """침해 리스크 section."""
    risk_level: str = Field(description="high, medium, or low")
    risk_factors: List[str] = Field(description="Specific infringement concerns")
    summary: str = Field(description="Overall risk assessment")
    evidence_patents: List[str] = Field(description="Patent IDs supporting this analysis")


class AvoidanceStrategy(BaseModel):
    """회피 전략 section."""
    strategies: List[str] = Field(description="Design-around approaches")
    alternative_technologies: List[str] = Field(description="Alternative implementations")
    summary: str = Field(description="Recommended avoidance approach")
    evidence_patents: List[str] = Field(description="Patent IDs informing these strategies")


class ComponentComparison(BaseModel):
    """구성요소 대비표 - Element-by-element comparison."""
    idea_components: List[str] = Field(description="User idea's key technical components")
    matched_components: List[str] = Field(description="Components found in prior patents")
    unmatched_components: List[str] = Field(description="Novel components not in prior art")
    risk_components: List[str] = Field(description="Components causing infringement risk")


class CriticalAnalysisResponse(BaseModel):
    """Complete critical analysis response."""
    similarity: SimilarityAnalysis
    infringement: InfringementAnalysis
    avoidance: AvoidanceStrategy
    component_comparison: ComponentComparison = Field(description="Element comparison table")
    conclusion: str = Field(description="Final recommendation")


# =============================================================================
# Patent Search Result
# =============================================================================

@dataclass
class PatentSearchResult:
    """A single patent search result."""
    publication_number: str
    title: str
    abstract: str
    claims: str
    ipc_codes: List[str]
    similarity_score: float = 0.0  # Vector similarity
    grading_score: float = 0.0  # LLM grading score
    grading_reason: str = ""
    
    # Hybrid search scores
    dense_score: float = 0.0
    sparse_score: float = 0.0
    rrf_score: float = 0.0
    is_prioritized: bool = False  # Flag for patents explicitly mentioned in query


# =============================================================================
# Patent Agent - Main Class
# =============================================================================

class PatentAgent:
    """
    Self-RAG Patent Analysis Agent (v3.0).
    
    Features:
    - Pinecone Serverless Hybrid Search (Dense + Sparse)
    - OpenAI API for embeddings and LLM
    - Streaming response for real-time analysis
    
    Implements:
    1. HyDE - Hypothetical Document Embedding
    2. Hybrid Search - Dense + Sparse with RRF
    3. Grading & Rewrite Loop
    4. Critical CoT Analysis with Streaming
    """
    
    def __init__(self, db_client=None):
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set. Check .env file.")
        
        # 전역 타임아웃 설정: 전체 요청 60초, TCP 연결 10초
        # OpenAI 서버 지연 시 이벤트 루프 무한 점유 방지
        self.client = AsyncOpenAI(
            api_key=OPENAI_API_KEY,
            timeout=httpx.Timeout(60.0, connect=10.0),
        )
        
        # Initialize Vector DB client with hybrid search
        if db_client is not None:
            self.db_client = db_client
        else:
            # Use PineconeClient for v3.0 Migration
            from src.vector_db import PineconeClient
            self.db_client = PineconeClient()
            self._try_load_local_cache()
    
    def _try_load_local_cache(self) -> bool:
        """Try to load local metadata cache and BM25 index."""
        loaded = self.db_client.load_local()
        if loaded:
            stats = self.db_client.get_stats()
            logger.info(f"Loaded local cache: {stats.get('bm25_docs', 0)} docs in BM25")
            return True
        else:
            logger.warning("No local cache found. Run pipeline to build BM25 index.")
            return False
    
    def index_loaded(self) -> bool:
        """Check if DB is ready."""
        # For Pinecone, we assume it's always ready if initialized
        return True
    
    # =========================================================================
    # 공통 OpenAI API 래퍼 (Retry + 예외 처리 + 구조화 로깅)
    # =========================================================================
    
    @retry(
        wait=wait_random_exponential(min=1, max=30),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type(_RETRYABLE_EXCEPTIONS),
        before_sleep=before_sleep_log(logger, log_level=30),  # WARNING
        reraise=True,
    )
    async def _call_openai(
        self,
        *,
        method_name: str,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: Optional[int] = None,
        response_format: Optional[Dict[str, str]] = None,
    ) -> Any:
        """
        모든 OpenAI chat completion 호출을 래핑하는 내부 메서드.

        - 예외별 처리: RateLimitError/APITimeoutError → retry, BadRequestError → 즉시 실패
        - 토큰 사용량 · 응답 시간 구조화 로깅
        """
        start = time.perf_counter()
        metrics = OpenAICallMetrics(method=method_name, model=model)
        try:
            kwargs: Dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
            }
            if max_tokens is not None:
                kwargs["max_tokens"] = max_tokens
            if response_format is not None:
                kwargs["response_format"] = response_format

            response = await self.client.chat.completions.create(**kwargs)

            # 메트릭 수집
            elapsed = (time.perf_counter() - start) * 1000
            metrics.elapsed_ms = elapsed
            if response.usage:
                metrics.prompt_tokens = response.usage.prompt_tokens
                metrics.completion_tokens = response.usage.completion_tokens
                metrics.total_tokens = response.usage.total_tokens
            log_api_call(logger, metrics)
            return response

        except openai.BadRequestError as e:
            # 토큰 초과 등 — 재시도 무의미, 즉시 실패
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            metrics.success = False
            metrics.error = str(e)
            metrics.error_type = "BadRequestError"
            log_api_call(logger, metrics)
            raise

        except _RETRYABLE_EXCEPTIONS as e:
            # tenacity가 retry하기 전에 로그 기록
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            metrics.success = False
            metrics.error = str(e)
            metrics.error_type = type(e).__name__
            log_api_call(logger, metrics)
            raise

        except Exception as e:
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            metrics.success = False
            metrics.error = str(e)
            metrics.error_type = type(e).__name__
            log_api_call(logger, metrics)
            raise

    @retry(
        wait=wait_random_exponential(min=1, max=30),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type(_RETRYABLE_EXCEPTIONS),
        before_sleep=before_sleep_log(logger, log_level=30),
        reraise=True,
    )
    async def _call_openai_stream(
        self,
        *,
        method_name: str,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        """
        스트리밍 OpenAI 호출 래퍼.

        chunk를 yield하며, 스트림 종료 후 총 토큰 수(chunk 카운트 근사)를 로깅합니다.
        """
        start = time.perf_counter()
        metrics = OpenAICallMetrics(method=method_name, model=model)
        chunk_count = 0
        try:
            kwargs: Dict[str, Any] = {
                "model": model,
                "messages": messages,
                "stream": True,
                "temperature": temperature,
            }
            if max_tokens is not None:
                kwargs["max_tokens"] = max_tokens

            response = await self.client.chat.completions.create(**kwargs)

            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    chunk_count += 1
                    yield chunk.choices[0].delta.content

            # 스트림 완료 후 메트릭 기록
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            metrics.completion_tokens = chunk_count  # 근사값
            log_api_call(logger, metrics)

        except openai.BadRequestError as e:
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            metrics.success = False
            metrics.error = str(e)
            metrics.error_type = "BadRequestError"
            log_api_call(logger, metrics)
            yield f"\n\n⚠️ API 오류: {e}\n"

        except _RETRYABLE_EXCEPTIONS as e:
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            metrics.success = False
            metrics.error = str(e)
            metrics.error_type = type(e).__name__
            log_api_call(logger, metrics)
            raise  # tenacity가 재시도

        except Exception as e:
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            metrics.success = False
            metrics.error = str(e)
            metrics.error_type = type(e).__name__
            log_api_call(logger, metrics)
            yield f"\n\n⚠️ 분석 중 오류 발생: {e}\n"

    @retry(
        wait=wait_random_exponential(min=1, max=20),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type(_RETRYABLE_EXCEPTIONS),
        before_sleep=before_sleep_log(logger, log_level=30),
        reraise=True,
    )
    async def _call_embed(self, *, text: str) -> np.ndarray:
        """
        임베딩 API 래퍼 — retry + 타임아웃 + 구조화 로깅.
        """
        start = time.perf_counter()
        metrics = OpenAICallMetrics(method="embed_text", model=EMBEDDING_MODEL)
        try:
            response = await self.client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text,
            )
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            if response.usage:
                metrics.prompt_tokens = response.usage.prompt_tokens
                metrics.total_tokens = response.usage.total_tokens
            log_api_call(logger, metrics)
            return np.array(response.data[0].embedding, dtype=np.float32)

        except openai.BadRequestError as e:
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            metrics.success = False
            metrics.error = str(e)
            metrics.error_type = "BadRequestError"
            log_api_call(logger, metrics)
            raise

        except _RETRYABLE_EXCEPTIONS as e:
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            metrics.success = False
            metrics.error = str(e)
            metrics.error_type = type(e).__name__
            log_api_call(logger, metrics)
            raise

        except Exception as e:
            metrics.elapsed_ms = (time.perf_counter() - start) * 1000
            metrics.success = False
            metrics.error = str(e)
            metrics.error_type = type(e).__name__
            log_api_call(logger, metrics)
            raise
    
    # =========================================================================
    # Keyword Extraction for Hybrid Search
    # =========================================================================
    
    async def extract_keywords(self, text: str) -> List[str]:
        """
        Extract keywords from text for BM25 search.
        Uses both rule-based extraction and optional LLM enhancement.
        """
        from src.vector_db import KeywordExtractor
        
        # Rule-based extraction
        keywords = KeywordExtractor.extract(text, max_keywords=15)
        
        return keywords

    def extract_patent_ids(self, text: str) -> List[str]:
        """
        Extract patent IDs (e.g., CN-119821168-A, KR-102842452-B1) from text.
        """
        # Precise pattern for CC-NUMBER-SUFFIX or CC-NUMBER
        pattern = r'\b([A-Z]{2}[-]?\d{4,}(?:[-][A-Z0-9]+)?)\b'
        
        matches = re.findall(pattern, text, re.ASCII)
        # Filter and clean
        cleaned = []
        for m in matches:
            if re.search(r'\d{4,}', m): # Ensure it has enough digits to be a patent ID
                cleaned.append(m.upper())
        
        return list(set(cleaned))
    
    @retry(
        wait=wait_random_exponential(min=1, max=10),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type(Exception),
    )
    async def _fetch_by_ids_safe(self, ids: List[str]) -> List[Any]:
        """Wrapper for ID fetch with retry AND validation."""
        results = await self.db_client.async_fetch_by_ids(ids)
        
        # Validation: If we requested N IDs, we expect N results (or reasonably close)
        # Note: Pinecone might return fewer if not found, but in our Golden Dataset,
        # we assume all IDs exist. If not found, it's likely a consistency/timeout issue.
        if len(results) < len(ids):
            missing_count = len(ids) - len(results)
            # Create a custom error to trigger retry
            raise ValueError(f"Partial retrieval detected. Requested {len(ids)}, got {len(results)}. Missing {missing_count} items.")
            
        return results

    
    # =========================================================================
    # 1. HyDE - Hypothetical Document Embedding
    # =========================================================================
    
    async def generate_hypothetical_claim(self, user_idea: str) -> str:
        """
        Generate a hypothetical patent claim from user's idea.
        """
        system_prompt = """당신은 20년 경력의 특허 분쟁 대응 전문 변리사입니다. 
당신의 목표는 사용자의 추상적인 아이디어를 바탕으로, 법적/기술적으로 가장 명확하고 구체적인 '독립 청구항(Independent Claim)'의 형태로 가상의 특허를 작성하는 것입니다.

이 가상 청구항은 실제 특허 데이터셋에서 유사한 기술을 찾아내기 위한 검색 쿼리로 사용됩니다."""

        user_prompt = f"아이디어: {user_idea}\n\n위 아이디어를 바탕으로 한 전문적인 가상 제1항(독립항)을 작성하십시오."

        try:
            response = await self._call_openai(
                method_name="generate_hypothetical_claim",
                model=HYDE_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500,
            )
            hypothetical_claim = response.choices[0].message.content.strip()
            logger.info(f"Generated hypothetical claim: {hypothetical_claim[:100]}...")
            return hypothetical_claim

        except openai.BadRequestError:
            # 토큰 초과 시 프롬프트 축소 후 재시도
            logger.warning("HyDE 프롬프트 토큰 초과 — 입력을 축소하여 재시도합니다.")
            short_idea = user_idea[:500]
            response = await self._call_openai(
                method_name="generate_hypothetical_claim_fallback",
                model=HYDE_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"아이디어: {short_idea}\n\n가상 제1항을 작성하십시오."}
                ],
                temperature=0.3,
                max_tokens=300,
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"HyDE 가상 청구항 생성 실패: {e}")
            # 최소한의 fallback — 원본 아이디어를 반환하여 파이프라인 중단 방지
            return user_idea
    
    async def embed_text(self, text: str) -> np.ndarray:
        """Generate embedding using OpenAI text-embedding-3-small."""
        return await self._call_embed(text=text)
    
    async def generate_multi_queries(self, user_idea: str) -> List[str]:
        """
        Generate multiple search queries for better coverage.
        Returns 3 queries: 
        1. Technical reformulation (synonyms)
        2. Claim-style phrasing
        3. Problem-solution keywords
        """
        system_prompt = """당신은 특허 검색 전문가입니다. 사용자의 아이디어를 바탕으로 검색 범위를 넓히기 위해 3가지 다른 관점의 검색 쿼리를 생성하십시오.
JSON 형식으로 응답하십시오:
{
  "queries": [
    "쿼리 1: 전문 용어 및 유의어 중심 (Technical Formulation)",
    "쿼리 2: 청구항 스타일 구문 (Claim-style Phrasing)",
    "쿼리 3: 해결하려는 과제와 솔루션 키워드 (Problem-Solution)"
  ]
}"""
        
        try:
            response = await self._call_openai(
                method_name="generate_multi_queries",
                model=HYDE_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_idea}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            
            data = json_loads(response.choices[0].message.content)
            queries = data.get("queries", [])
            logger.info(f"Generated {len(queries)} multi-queries")
            return queries[:3]  # Ensure max 3
            
        except Exception as e:
            logger.error(f"Multi-query generation failed: {e}")
            return [user_idea]  # Fallback to original

    async def hyde_search(
        self,
        user_idea: str,
        top_k: int = TOP_K_RESULTS,
        use_hybrid: bool = True,
    ) -> Tuple[str, List[PatentSearchResult]]:
        """
        HyDE-enhanced patent search (Single Query Version).
        """
        # Generate hypothetical claim
        hypothetical_claim = await self.generate_hypothetical_claim(user_idea)
        
        # Check if index is available
        if not self.index_loaded():
            logger.warning("Index not loaded. Returning empty results.")
            return hypothetical_claim, []
            
        results = await self._execute_search(hypothetical_claim, user_idea, top_k, use_hybrid)
        return hypothetical_claim, results

    @retry(
        wait=wait_random_exponential(min=1, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((Exception,)), # Retry on generic exceptions usually network/pinecone related
    )
    async def _execute_search(
        self,
        query_text: str,
        context_text: str,
        top_k: int,
        use_hybrid: bool,
        ipc_filters: List[str] = None
    ) -> List[PatentSearchResult]:
        """Internal helper to execute actual search."""
        # Embed query
        query_embedding = await self.embed_text(query_text)
        
        # Extract keywords
        keywords = await self.extract_keywords(context_text + " " + query_text)
        keyword_query = " ".join(keywords)
        
        # Search
        if use_hybrid:
            search_results = await self.db_client.async_hybrid_search(
                query_embedding,
                keyword_query,
                top_k=top_k,
                dense_weight=DENSE_WEIGHT,
                sparse_weight=SPARSE_WEIGHT,
                ipc_filters=ipc_filters,
            )
        else:
            search_results = await self.db_client.async_search(
                query_embedding, 
                top_k=top_k,
                ipc_filters=ipc_filters,
            )
            
        # Convert objects
        results = []
        for r in search_results:
            results.append(PatentSearchResult(
                publication_number=r.patent_id,
                title=r.metadata.get("title", ""),
                abstract=r.metadata.get("abstract", r.content[:500]),
                claims=r.metadata.get("claims", ""),
                ipc_codes=[r.metadata.get("ipc_code", "")] if r.metadata.get("ipc_code") else [],
                similarity_score=r.score,
                dense_score=getattr(r, 'dense_score', 0.0),
                sparse_score=getattr(r, 'sparse_score', 0.0),
                rrf_score=getattr(r, 'rrf_score', 0.0),
            ))
        return results

    async def search_multi_query(
        self,
        user_idea: str,
        top_k: int = TOP_K_RESULTS,
        use_hybrid: bool = True,
        ipc_filters: List[str] = None,
    ) -> Tuple[List[str], List[PatentSearchResult]]:
        # 1. Detect specific patent IDs in user idea
        target_ids = self.extract_patent_ids(user_idea)
        target_results = []
        if target_ids:
            logger.info(f"Detected target patents in query: {target_ids}")
            raw_target_results = await self._fetch_by_ids_safe(target_ids)

            
            # Convert to PatentSearchResult
            for r in raw_target_results:
                target_results.append(PatentSearchResult(
                    publication_number=r.patent_id,
                    title=r.metadata.get("title", ""),
                    abstract=r.metadata.get("abstract", r.content[:500]),
                    claims=r.metadata.get("claims", ""),
                    ipc_codes=[r.metadata.get("ipc_code", "")] if r.metadata.get("ipc_code") else [],
                    similarity_score=r.score,
                    dense_score=getattr(r, 'dense_score', 0.0),
                    sparse_score=getattr(r, 'sparse_score', 0.0),
                    rrf_score=getattr(r, 'rrf_score', 0.0),
                    is_prioritized=True,  # Mark as prioritized
                ))
            logger.info(f"Found {len(target_results)} requested patents in DB")

        # 2. Generate queries for broader search
        queries = await self.generate_multi_queries(user_idea)
        if not queries:
            queries = [user_idea]
            
        logger.info(f"Executing Multi-Query Search with: {queries}")
        
        # 3. Parallel Execution using asyncio.gather
        tasks = [
            self._execute_search(query, user_idea, top_k, use_hybrid, ipc_filters=ipc_filters)
            for query in queries
        ]
        
        results_list = await asyncio.gather(*tasks)
        
        # 4. Deduplication & Fusion
        seen_ids = set()
        merged_results = []
        
        # Pre-populate with target results so they are definitely included
        for r in target_results:
            if r.publication_number not in seen_ids:
                seen_ids.add(r.publication_number)
                r.is_prioritized = True
                merged_results.append(r)

        # Simple Fusion: Round-Robin or Score-based?
        # Using Score-based here (Flatten and sort by RRF/Sim score)
        all_results = [item for sublist in results_list for item in sublist]
        
        # Sort by score descending before dedup to keep highest scoring instance
        all_results.sort(key=lambda x: x.rrf_score if use_hybrid else x.similarity_score, reverse=True)
        
        for r in all_results:
            if r.publication_number not in seen_ids:
                seen_ids.add(r.publication_number)
                merged_results.append(r)
            else:
                # If it's a target patent seen again, ensure the is_prioritized flag is preserved
                # if it was already marked as such in merged_results
                pass
        
        logger.info(f"Multi-Query: {len(all_results)} total -> {len(merged_results)} unique results")
        return queries, merged_results[:top_k*2]  # Return more candidates for grading
    
    # =========================================================================
    # 2. Grading & Rewrite Loop
    # =========================================================================
    
    async def grade_results(
        self,
        user_idea: str,
        results: List[PatentSearchResult],
    ) -> GradingResponse:
        """Grade each search result for relevance to user's idea."""
        if not results:
            return GradingResponse(results=[], average_score=0.0)
        
        results_text = "\n\n".join([
            f"[특허 {i+1}: {r.publication_number}]\n"
            f"제목: {r.title}\n"
            f"초록: {r.abstract[:300]}...\n"
            f"청구항: {r.claims[:300]}..."
            for i, r in enumerate(results)
        ])
        
        system_prompt = """당신은 20년 경력의 특허 분쟁 대응 전문 변리사입니다. 당신의 목표는 검색된 특허가 사용자의 아이디어와 기술적으로 실질적인 관련이 있는지를 '매우 비판적이고 보수적인' 관점에서 평가하는 것입니다.

평가 지침:
1. **기술적 실현 가능성 및 논리**: 아이디어가 논리적으로 성립하지 않거나(예: 전혀 다른 성질의 기술이 물리적/생물학적으로 결합 불가한 경우), 단순한 키워드 짜집기인 경우 낮은 점수를 부여하십시오.
2. **기술 분야 및 목적**: 아이디어의 '진정한 기술적 과제'와 특허의 '해결하려는 과제'가 일치하는지 우선순위를 두십시오.
3. **평가 기준 (0.0 ~ 1.0 점)**:
   - 0.8~1.0: 기술적 수단과 목적이 거의 동일함 (직접적 침해 리스크)
   - 0.5~0.7: 기술 분야는 같으나 세부 구현 방식이 다름 (개량 또는 회피 가능성)
   - 0.1~0.4: 키워드만 겹치거나 기술적 맥락이 상이함 (단순 참고 수준)
   - 0.0: 기술적으로 무관함

평가 시 '오이맛 소고기'와 같이 키워드(육종, 소고기, 오이)는 존재하나 기술적 실체가 불분명하거나 논리적 비약이 있는 경우, 유사도가 높게 측정되지 않도록 엄격하게 심사하십시오.
반드시 JSON 형식으로 응답하십시오."""

        user_prompt = f"""[사용자 아이디어]
{user_idea}

[검색된 특허 목록]
{results_text}

각 특허에 대해 다음 JSON 형식으로 평가하십시오:
{{
  "results": [
    {{"patent_id": "특허번호", "score": 0.0-1.0, "reason": "평가 이유"}}
  ],
  "average_score": 전체평균점수
}}"""

        response = await self._call_openai(
            method_name="grade_results",
            model=GRADING_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        
        try:
            grading_data = json_loads(response.choices[0].message.content)
            grading_response = GradingResponse(**grading_data)
            
            for grade in grading_response.results:
                for result in results:
                    if result.publication_number == grade.patent_id:
                        # Priority Boost: If explicitly requested, force score to 1.0
                        if result.is_prioritized:
                            result.grading_score = 1.0
                            result.grading_reason = f"[PRIORITIZED] {grade.reason}"
                        else:
                            result.grading_score = grade.score
                            result.grading_reason = grade.reason
            
            # Failsafe: Ensure prioritized results are ALWAYS boosted, even if LLM omitted them
            for result in results:
                if result.is_prioritized:
                    result.grading_score = 1.0
                    if not result.grading_reason:
                        result.grading_reason = "[PRIORITIZED] Explicitly requested by user"
                    elif "[PRIORITIZED]" not in result.grading_reason:
                         result.grading_reason = f"[PRIORITIZED] {result.grading_reason}"
            
            return grading_response
            
        except Exception as e:
            logger.error(f"Failed to parse grading response: {e}")
            # Even on error, return prioritized results
            for result in results:
                if result.is_prioritized:
                    result.grading_score = 1.0
                    result.grading_reason = "[PRIORITIZED] Grading failed but ID matched"
            return GradingResponse(results=[], average_score=0.0)
    
    async def rewrite_query(
        self,
        user_idea: str,
        previous_results: List[PatentSearchResult],
    ) -> QueryRewriteResponse:
        """Optimize search query based on poor results."""
        results_summary = "\n".join([
            f"- {r.publication_number}: score={r.grading_score:.2f}, {r.grading_reason}"
            for r in previous_results
        ])
        
        prompt = f"""검색 결과가 관련성이 낮습니다. 검색 쿼리를 최적화해주세요.

[원래 아이디어]
{user_idea}

[이전 검색 결과 (낮은 점수)]
{results_summary}

JSON 형식으로 응답:
{{
  "optimized_query": "개선된 검색 쿼리",
  "keywords": ["핵심", "기술", "키워드"],
  "reasoning": "개선 이유"
}}"""

        response = await self._call_openai(
            method_name="rewrite_query",
            model=GRADING_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        
        try:
            data = json_loads(response.choices[0].message.content)
            return QueryRewriteResponse(**data)
        except Exception as e:
            logger.error(f"Failed to parse rewrite response: {e}")
            return QueryRewriteResponse(
                optimized_query=user_idea,
                keywords=[],
                reasoning="Failed to optimize"
            )
    
    async def search_with_grading(
        self,
        user_idea: str,
        use_hybrid: bool = True,
    ) -> List[PatentSearchResult]:
        """Complete search pipeline with grading and optional rewrite."""
        # Initial Search (Multi-Query handles ID prioritization)
        queries, results = await self.search_multi_query(user_idea, use_hybrid=use_hybrid)
        
        if not results:
            logger.warning("No search results found")
            return []
        
        # Grade results
        grading = await self.grade_results(user_idea, results)
        logger.info(f"Initial grading - Average score: {grading.average_score:.2f}")
        
        # Check if rewrite is needed
        if grading.average_score < GRADING_THRESHOLD:
            logger.info(f"Score below threshold ({GRADING_THRESHOLD}), attempting query rewrite...")
            
            rewrite = await self.rewrite_query(user_idea, results)
            logger.info(f"Rewritten query: {rewrite.optimized_query}")
            
            _, new_results = await self.search_multi_query(rewrite.optimized_query, use_hybrid=use_hybrid)
            
            new_grading = await self.grade_results(user_idea, new_results)
            logger.info(f"After rewrite - Average score: {new_grading.average_score:.2f}")
            
            if new_grading.average_score > grading.average_score:
                results = new_results
                grading = new_grading
        
        results.sort(key=lambda x: x.grading_score, reverse=True)
        
        return results
    
    # =========================================================================
    # 3. Critical CoT Analysis - Standard (Non-Streaming)
    # =========================================================================
    
    async def critical_analysis(
        self,
        user_idea: str,
        results: List[PatentSearchResult],
    ) -> CriticalAnalysisResponse:
        """
        Perform critical Chain-of-Thought analysis (non-streaming).
        """
        if not results:
            return self._empty_analysis()
        
        # Filter out low-quality results to prevent hallucinations
        # We only analyze patents that have a minimum baseline relevance.
        relevant_results = [r for r in results if r.grading_score >= 0.3][:5]
        
        if not relevant_results:
            # If no results are good enough, we still want to inform the user
            # rather than failing silently or hallucinating.
            patents_text = "제공된 검색 결과 중 분석할 가치가 있는(점수 0.3 이상) 관련 특허가 없습니다."
        else:
            patents_text = "\n\n".join([
                f"=== 특허 {r.publication_number} ===\n"
                f"제목: {r.title}\n"
                f"IPC: {', '.join(r.ipc_codes[:3])}\n"
                f"초록: {r.abstract}\n"
                f"청구항: {r.claims}\n"
                f"관련성 점수: {r.grading_score:.2f} ({r.grading_reason})"
                for r in relevant_results
            ])

        
        system_prompt, user_prompt = self._build_analysis_prompts(user_idea, patents_text)
        
        try:
            response = await self._call_openai(
                method_name="critical_analysis",
                model=ANALYSIS_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=2500,
            )
            
            data = json_loads(response.choices[0].message.content)
            return CriticalAnalysisResponse(**data)
            
        except Exception as e:
            logger.error(f"Analysis failed with {ANALYSIS_MODEL}: {e}")
            logger.warning(f"Falling back to {FALLBACK_MODEL}...")
            
            try:
                # Fallback 모델로 재시도
                response = await self._call_openai(
                    method_name="critical_analysis_fallback",
                    model=FALLBACK_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=2500,
                )
                
                data = json_loads(response.choices[0].message.content)
                return CriticalAnalysisResponse(**data)
            except Exception as fallback_error:
                logger.error(f"Fallback analysis failed: {fallback_error}")
                return self._empty_analysis()
    
    # =========================================================================
    # 4. Critical CoT Analysis - Streaming
    # =========================================================================
    
    async def critical_analysis_stream(
        self,
        user_idea: str,
        results: List[PatentSearchResult],
    ) -> AsyncGenerator[str, None]:
        """
        Perform critical Chain-of-Thought analysis with streaming.
        
        Yields:
            Tokens as they are generated by the LLM
        """
        if not results:
            yield "분석할 특허가 없습니다."
            return
        
        # Filter out low-quality results to prevent hallucinations
        relevant_results = [r for r in results if r.grading_score >= 0.3][:5]
        
        if not relevant_results:
            patents_text = "제공된 검색 결과 중 분석할 가치가 있는(점수 0.3 이상) 관련 특허가 없습니다."
        else:
            patents_text = "\n\n".join([
                f"=== 특허 {r.publication_number} ===\n"
                f"제목: {r.title}\n"
                f"IPC: {', '.join(r.ipc_codes[:3])}\n"
                f"초록: {r.abstract[:500]}\n"
                f"청구항: {r.claims[:500]}\n"
                f"관련성 점수: {r.grading_score:.2f}"
                for r in relevant_results
            ])

        
        system_prompt = """당신은 20년 경력의 특허 분쟁 대응 전문 변리사입니다. 당신의 목표는 제공된 선행 특허(Context)와 사용자의 아이디어를 '매우 비판적이고 보수적인' 관점에서 대비하여 침해 리스크와 기술적 유사도를 정밀하게 분석하는 것입니다.

분석 원칙 (CRITICAL):
1. **사실에만 기반 (Strict Faithfulness)**: 
   - 오직 아래 [Context]에 제공된 텍스트만 사용하십시오.
   - **절대 Context에 없는 정보를 만들어내지 마십시오 (NEVER FABRICATE).**
   - [특허번호]를 보고 당신의 학습 데이터에서 정보를 가져오는 것은 금지입니다.
   - Context에 명시되지 않은 기술적 세부사항을 추측하지 마십시오.

2. **명시적 인용 의무 (Explicit Citation)**:
   - 모든 분석 주장에는 반드시 [특허번호]를 병기하십시오.
   - 인용할 특허가 없으면 해당 주장을 하지 마십시오.

3. **불확실성 인정 (Acknowledge Uncertainty)**:
   - Context에 정보가 부족하면 "정보 부족" 또는 "N/A"로 표기하십시오.

4. **엄격한 구성요소 대비 (All Elements Rule)**: 
   - 청구항의 각 구성요소를 1:1로 대비하여, 문언적 일치 여부를 엄격하게 판단하십시오.




**중요**: 마크다운 형식으로 실시간 출력하십시오.

분석 절차:
1. **청구항 특정**: 각 특허에서 가장 침해 위험이 높은 '대표 청구항'을 하나씩 특정하십시오.
2. **구성요소 대비 (All Elements Rule)**: 
   - 사용자의 아이디어가 선행 특허 청구항의 모든 구성요소를 포함하는지 검토하십시오.
   - 하나라도 포함하지 않으면 비침해(회피 가능)로 판단하십시오.
3. **침해 리스크 판정**: 
   - High: 아이디어에 청구항의 모든 구성요소가 포함됨 (문언 침해 위험)
   - Medium: 일부 구성요소가 균등물로 치환 가능함 (균등 침해 위험)
   - Low: 청구항의 핵심 구성요소가 아이디어에 없음 (자유 실시 가능)

출력 형식 (마크다운):
## 1. 유사도 평가
- **핵심 기술**: (아이디어 정의)
- **종합 점수**: (0-100점)
- (특허별 간단 코멘트)

## 2. 청구항 기반 침해 리스크
※ 각 특허별로 가장 위험한 청구항을 분석합니다.

### [특허번호] 제목
- **위험 청구항**: (예: 제1항)
- **구성요소 대비**:
  - [아이디어 구성] vs [청구항 구성] → **일치/불일치**
  - (불일치 시 이유 설명)
- **리스크**: 🔴 High / 🟡 Medium / 🟢 Low

(다른 특허들도 동일하게 반복...)

## 3. 회피 전략
(회피 설계 제안)

## 4. 결론
(최종 권고)"""

        user_prompt = f"""[분석 대상: 사용자 아이디어]
{user_idea}

[참조 특허 목록 (선행 기술)]
{patents_text}

위 선행 특허들의 **청구항(Claims)**을 중심으로 아이디어와 정밀 대비 분석을 수행하십시오."""

        async for token in self._call_openai_stream(
            method_name="critical_analysis_stream",
            model=ANALYSIS_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=2500,
        ):
            yield token
    
    def _build_analysis_prompts(self, user_idea: str, patents_text: str) -> Tuple[str, str]:
        """Build system and user prompts for analysis."""
        system_prompt = """당신은 20년 경력의 특허 분쟁 대응 전문 변리사입니다. 
당신의 목표는 제공된 선행 특허(Context)와 사용자의 아이디어를 대비하여, 신규성이나 진보성이 부정될 수 있는지 혹은 침해 리스크가 있는지를 '매우 비판적이고 보수적인' 관점에서 정밀 분석하는 것입니다.

분석 원칙 (CRITICAL):
1. **사실에만 기반 (Strict Faithfulness)**: 
   - 오직 아래 [Context]에 제공된 텍스트만 사용하십시오.
   - **절대 Context에 없는 정보를 만들어내지 마십시오 (NEVER FABRICATE).**
   - 특허 번호를 보고 당신의 학습 데이터에서 정보를 가져오는 것은 금지입니다.
   - Context에 명시되지 않은 기술적 세부사항을 추측하지 마십시오.

2. **명시적 인용 의무 (Explicit Citation)**:
   - 모든 분석 주장에는 반드시 [특허번호]를 병기하십시오.
   - 예: "벡터 검색 기술이 유사합니다 [CN-12345]"
   - 인용할 특허가 없으면 해당 주장을 하지 마십시오.

3. **불확실성 인정 (Acknowledge Uncertainty)**:
   - Context에 정보가 부족하면 "Context에 명시되지 않음" 또는 "정보 부족"으로 표기하십시오.
   - 추측하기보다 N/A로 표기하는 것이 더 정확한 분석입니다.

4. **엄격한 구성요소 대비 (All Elements Rule)**: 
   - 청구항의 각 구성요소를 1:1로 대비하여, 문언적 일치 여부를 엄격하게 판단하십시오.
"""


        user_prompt = f"""[분석 대상: 사용자 아이디어]
{user_idea}

[참조 특허 목록 (선행 기술)]
{patents_text}

위 선행 특허들과 사용자 아이디어를 대비 분석하여 아래 JSON 형식으로 응답하십시오:
{{
  "similarity": {{
    "score": 0-100,
    "common_elements": ["공통 구성요소"],
    "summary": "분석 결과",
    "evidence_patents": ["특허번호"]
  }},
  "infringement": {{
    "risk_level": "high/medium/low",
    "risk_factors": ["위험 요소"],
    "summary": "리스크 평가",
    "evidence_patents": ["특허번호"]
  }},
  "avoidance": {{
    "strategies": ["회피 전략"],
    "alternative_technologies": ["대안 기술"],
    "summary": "회피 권고",
    "evidence_patents": ["특허번호"]
  }},
  "component_comparison": {{
    "idea_components": ["아이디어 구성요소"],
    "matched_components": ["일치 구성요소"],
    "unmatched_components": ["신규 구성요소"],
    "risk_components": ["위험 구성요소"]
  }},
  "conclusion": "최종 권고"
}}"""
        
        return system_prompt, user_prompt
    
    def _empty_analysis(self) -> CriticalAnalysisResponse:
        """Return empty analysis when no results."""
        return CriticalAnalysisResponse(
            similarity=SimilarityAnalysis(
                score=0,
                common_elements=[],
                summary="분석할 특허가 없습니다.",
                evidence_patents=[]
            ),
            infringement=InfringementAnalysis(
                risk_level="unknown",
                risk_factors=[],
                summary="분석할 특허가 없습니다.",
                evidence_patents=[]
            ),
            avoidance=AvoidanceStrategy(
                strategies=[],
                alternative_technologies=[],
                summary="분석할 특허가 없습니다.",
                evidence_patents=[]
            ),
            component_comparison=ComponentComparison(
                idea_components=[],
                matched_components=[],
                unmatched_components=[],
                risk_components=[]
            ),
            conclusion="검색 결과가 없어 분석을 수행할 수 없습니다."
        )

    async def parse_streaming_to_structured(
        self,
        user_idea: str,
        streamed_text: str,
        results: List[PatentSearchResult],
    ) -> CriticalAnalysisResponse:
        """
        스트리밍 분석 결과(마크다운)를 경량 모델(GPT-4o-mini)로 JSON 구조화 파싱.

        기존 critical_analysis()의 GPT-4o 호출을 대체하여 비용을 절감합니다.
        스트리밍 텍스트가 비어있거나 파싱 실패 시 _empty_analysis()로 폴백합니다.

        Args:
            user_idea: 사용자의 원본 아이디어 텍스트
            streamed_text: critical_analysis_stream()에서 생성된 마크다운 분석 텍스트
            results: 검색된 특허 결과 리스트 (컨텍스트 보강용)

        Returns:
            CriticalAnalysisResponse: 구조화된 분석 결과
        """
        if not streamed_text or not streamed_text.strip():
            logger.warning("스트리밍 텍스트가 비어있어 빈 분석 결과를 반환합니다.")
            return self._empty_analysis()

        # 참조 특허 번호 목록 (파싱 모델에게 컨텍스트 제공)
        patent_ids = [r.publication_number for r in results if r.grading_score >= 0.3][:5]

        system_prompt = """당신은 특허 분석 보고서를 JSON으로 변환하는 데이터 파서입니다.
아래에 제공되는 마크다운 형식의 특허 분석 보고서를 읽고, 정확히 지정된 JSON 스키마로 변환하십시오.

규칙:
1. 보고서에 명시된 정보만 추출하십시오. 새로운 정보를 추가하지 마십시오.
2. 보고서에 해당 필드의 정보가 없으면 빈 문자열 또는 빈 배열로 채우십시오.
3. evidence_patents 필드에는 보고서에 언급된 특허번호만 포함하십시오.
4. score는 0-100 범위의 정수, risk_level은 'high', 'medium', 'low' 중 하나입니다."""

        user_prompt = f"""[사용자 아이디어]
{user_idea}

[참조 특허 번호]
{', '.join(patent_ids) if patent_ids else 'N/A'}

[마크다운 분석 보고서]
{streamed_text}

위 보고서를 아래 JSON 스키마로 변환하십시오:
{{
  "similarity": {{
    "score": 0-100,
    "common_elements": ["공통 구성요소"],
    "summary": "유사도 평가 요약",
    "evidence_patents": ["특허번호"]
  }},
  "infringement": {{
    "risk_level": "high/medium/low",
    "risk_factors": ["위험 요소"],
    "summary": "침해 리스크 요약",
    "evidence_patents": ["특허번호"]
  }},
  "avoidance": {{
    "strategies": ["회피 전략"],
    "alternative_technologies": ["대안 기술"],
    "summary": "회피 전략 요약",
    "evidence_patents": ["특허번호"]
  }},
  "component_comparison": {{
    "idea_components": ["아이디어 구성요소"],
    "matched_components": ["일치 구성요소"],
    "unmatched_components": ["신규 구성요소"],
    "risk_components": ["위험 구성요소"]
  }},
  "conclusion": "최종 권고"
}}"""

        try:
            response = await self.client.chat.completions.create(
                model=PARSING_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=2000,
                timeout=30.0,
            )

            data = json_loads(response.choices[0].message.content)
            logger.info(f"스트리밍 결과 JSON 파싱 성공 (모델: {PARSING_MODEL})")
            return CriticalAnalysisResponse(**data)

        except Exception as e:
            logger.error(f"스트리밍 결과 파싱 실패 ({PARSING_MODEL}): {e}")
            logger.warning("폴백: 빈 분석 결과를 반환합니다.")
            return self._empty_analysis()
    
    # =========================================================================
    # Main Pipeline
    # =========================================================================
    
    async def analyze(
        self,
        user_idea: str,
        use_hybrid: bool = True,
        stream: bool = False,
    ) -> Dict[str, Any]:
        """
        Complete Self-RAG pipeline.
        
        Args:
            user_idea: User's patent idea
            use_hybrid: Use hybrid search (dense + sparse)
            stream: Stream analysis output (not applicable for dict output)
        """
        print("\n" + "=" * 70)
        print("⚡ 쇼특허 (Short-Cut) v3.0 - Self-RAG Analysis (Hybrid + Streaming)")
        print("=" * 70)
        
        print(f"\n📝 User Idea: {user_idea[:100]}...")
        
        print("\n🔍 Step 1-2: HyDE + Hybrid Search & Grading...")
        results = await self.search_with_grading(user_idea, use_hybrid=use_hybrid)
        
        if not results:
            return {"error": "No relevant patents found"}
        
        print(f"   Found {len(results)} relevant patents")
        for r in results[:3]:
            print(f"   - {r.publication_number}: {r.grading_score:.2f} (RRF: {r.rrf_score:.4f})")
        
        print("\n🧠 Step 3: Critical CoT Analysis...")
        analysis = await self.critical_analysis(user_idea, results)
        
        output = {
            "user_idea": user_idea,
            "search_results": [
                {
                    "patent_id": r.publication_number,
                    "title": r.title,
                    "abstract": r.abstract,  # Added for DeepEval Faithfulness
                    "claims": r.claims,      # Added for DeepEval Faithfulness
                    "grading_score": r.grading_score,
                    "grading_reason": r.grading_reason,
                    "dense_score": r.dense_score,
                    "sparse_score": r.sparse_score,
                    "rrf_score": r.rrf_score,
                }
                for r in results
            ],
            "analysis": {
                "similarity": {
                    "score": analysis.similarity.score,
                    "common_elements": analysis.similarity.common_elements,
                    "summary": analysis.similarity.summary,
                    "evidence": analysis.similarity.evidence_patents,
                },
                "infringement": {
                    "risk_level": analysis.infringement.risk_level,
                    "risk_factors": analysis.infringement.risk_factors,
                    "summary": analysis.infringement.summary,
                    "evidence": analysis.infringement.evidence_patents,
                },
                "avoidance": {
                    "strategies": analysis.avoidance.strategies,
                    "alternatives": analysis.avoidance.alternative_technologies,
                    "summary": analysis.avoidance.summary,
                    "evidence": analysis.avoidance.evidence_patents,
                },
                "conclusion": analysis.conclusion,
            },
            "timestamp": datetime.now().isoformat(),
            "search_type": "hybrid" if use_hybrid else "dense",
        }
        
        print("\n" + "=" * 70)
        print("📊 Analysis Complete!")
        print("=" * 70)
        print(f"\n[유사도 평가] Score: {analysis.similarity.score}/100")
        print(f"\n[침해 리스크] Level: {analysis.infringement.risk_level.upper()}")
        print(f"\n📌 Conclusion: {analysis.conclusion[:150]}...")
        
        return output


# =============================================================================
# CLI Entry Point
# =============================================================================

async def main():
    """Interactive CLI for patent analysis."""
    print("\n" + "=" * 70)
    print("⚡ 쇼특허 (Short-Cut) v3.0 - Self-RAG Patent Agent")
    print("    Hybrid Search + Streaming Edition")
    print("=" * 70)
    print("\n특허 분석을 위한 아이디어를 입력하세요.")
    print("종료하려면 'exit' 또는 'quit'을 입력하세요.\n")
    
    agent = PatentAgent()
    
    if not agent.index_loaded():
        print("⚠️  Index not found. Please run the pipeline first:")
        print("   python pipeline.py --stage 5\n")
    
    while True:
        try:
            user_input = input("\n💡 Your idea: ").strip()
            
            if user_input.lower() in ['exit', 'quit', 'q']:
                print("👋 Goodbye!")
                break
            
            if not user_input:
                print("❌ Please enter an idea.")
                continue
            
            result = await agent.analyze(user_input, use_hybrid=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = OUTPUT_DIR / f"analysis_{timestamp}.json"
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(json_dumps(result))
            
            print(f"\n💾 Result saved to: {output_path}")
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
