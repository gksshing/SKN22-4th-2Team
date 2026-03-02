"""
쇼특허(Short-Cut) - Configuration Module (Antigravity Edition)
================================================================
Lightweight configuration for OpenAI API + Pinecone Serverless architecture.

Author: Team 뀨💕
License: MIT
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List, Optional
from pathlib import Path

# 실행 환경(APP_ENV)에 따라 .env 또는 AWS Secrets Manager에서 시크릿 주입
# 우선순위: Secrets Manager > .env > 이미 설정된 환경 변수
from src.secrets_manager import bootstrap_secrets
bootstrap_secrets()


# =============================================================================
# Project Paths
# =============================================================================

PROJECT_ROOT = Path(__file__).parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
TRIPLETS_DIR = DATA_DIR / "triplets"
EMBEDDINGS_DIR = DATA_DIR / "embeddings"
INDEX_DIR = DATA_DIR / "index"

# Create directories if they don't exist
for dir_path in [DATA_DIR, RAW_DATA_DIR, PROCESSED_DATA_DIR, TRIPLETS_DIR, EMBEDDINGS_DIR, INDEX_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)


# =============================================================================
# BigQuery Configuration
# =============================================================================

@dataclass
class BigQueryConfig:
    """BigQuery connection and query configuration."""
    
    # GCP Project ID (set via environment variable or override here)
    project_id: str = os.environ.get("GCP_PROJECT_ID", "your-gcp-project-id")
    
    # Dataset and table
    dataset: str = "patents-public-data.patents"
    publications_table: str = "publications"  # Full table (~1.4TB scan cost)
    
    # Date range for filtering (cost optimization)
    min_filing_date: str = "2018-01-01"  # Focus on recent patents
    max_filing_date: str = "2024-12-31"
    
    # Batch processing
    batch_size: int = 1000
    max_results: Optional[int] = None  # None = no limit
    
    # Cost optimization
    dry_run: bool = True  # Set to True to check query cost first
    use_query_cache: bool = True
    
    @property
    def full_table_name(self) -> str:
        return f"`{self.dataset}.{self.publications_table}`"


# =============================================================================
# Domain Keywords Configuration
# =============================================================================

@dataclass
class DomainConfig:
    """Technical domain keywords and IPC/CPC codes for filtering."""
    
    # Primary domain name
    domain_name: str = "AI_NLP_Search"
    
    # Search keywords (OR logic) - Broader for more results
    keywords: List[str] = field(default_factory=lambda: [
        # Information retrieval (broad)
        "information retrieval",
        "document retrieval",
        "semantic search",
        "text search",
        
        # NLP/AI core
        "natural language processing",
        "machine learning",
        "neural network",
        "deep learning",
        
        # Embedding/Vector
        "word embedding",
        "text embedding",
        "vector representation",
        
        # Question answering
        "question answering",
        "knowledge base",
    ])
    
    # IPC/CPC Classification Codes
    ipc_codes: List[str] = field(default_factory=lambda: [
        "G06F 16",    # Information retrieval; Database structures
        "G06F 40",    # Natural language processing
        "G06N 3",     # Artificial intelligence - Neural networks
        "G06N 5",     # AI - Knowledge processing
        "G06N 20",    # Machine learning
        "H04L 12",    # Data switching networks (for distributed ML)
    ])
    
    # RAG-specific component keywords for tagging
    rag_component_keywords: List[str] = field(default_factory=lambda: [
        "retriever",
        "generator",
        "reranker",
        "re-ranker",
        "dense passage",
        "sparse retrieval",
        "hybrid retrieval",
        "knowledge base",
        "vector store",
        "embedding index",
        "semantic similarity",
        "context window",
        "chunking",
        "document encoder",
        "query encoder",
    ])


# =============================================================================
# Embedding Model Configuration (OpenAI API)
# =============================================================================

@dataclass
class EmbeddingConfig:
    """OpenAI Embedding configuration."""
    
    # Model - OpenAI text-embedding-3-small
    model_id: str = "text-embedding-3-small"
    embedding_dim: int = 1536  # OpenAI dimension
    max_context_length: int = 8191  # text-embedding-3-small limit
    
    # API settings
    api_key: str = os.environ.get("OPENAI_API_KEY", "")
    
    # Batch processing (OpenAI has 2048 texts per batch limit)
    batch_size: int = 100
    
    # Rate limiting
    requests_per_minute: int = 3000  # OpenAI tier limit
    tokens_per_minute: int = 1_000_000
    
    # Weighting for hybrid indexing
    title_weight: float = 1.5      # Higher weight for titles
    claim_weight: float = 2.0      # Highest weight for claims  
    abstract_weight: float = 1.2   # Medium weight for abstracts
    description_weight: float = 1.0  # Base weight for descriptions




# =============================================================================
# Pinecone Configuration
# =============================================================================

@dataclass
class PineconeConfig:
    """Pinecone vector database configuration (Serverless)."""
    
    # API Key (from environment variable)
    api_key: str = os.environ.get("PINECONE_API_KEY", "")
    
    # Index Settings
    index_name: str = "patent-guard-hybrid"
    dimension: int = 1536  # Must match embedding model
    metric: str = "dotproduct"  # Required for hybrid search (sparse values)
    
    # Cloud Settings (Serverless)
    cloud: str = "aws"
    region: str = "us-east-1"
    
    # Batch processing
    batch_size: int = 100  # Recommended batch size for upsert
    
    # Namespace
    namespace: str = "default"
    
    # Metadata path
    metadata_path: Optional[Path] = None
    
    # Metadata Truncation Length
    max_metadata_length: int = 10000


# =============================================================================
# PAI-NET Triplet Configuration
# =============================================================================

@dataclass
class PAINETConfig:
    """PAI-NET triplet generation configuration."""
    
    # Triplet generation
    min_citations_for_anchor: int = 3  # Minimum citations to be an anchor
    negatives_per_positive: int = 5    # Number of negatives per positive pair
    
    # Negative sampling strategy
    hard_negative_ratio: float = 0.3   # 30% hard negatives (same IPC, no citation)
    random_negative_ratio: float = 0.7 # 70% random negatives
    
    # Output format
    output_format: str = "jsonl"  # jsonl or parquet


# =============================================================================
# Self-RAG Configuration
# =============================================================================

@dataclass
class SelfRAGConfig:
    """Self-RAG analysis configuration using OpenAI."""
    
    # OpenAI API for analysis
    openai_model: str = "gpt-4o-mini"  # Cost-effective, fast
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    
    # Critique prompt template
    critique_prompt_template: str = """
당신은 20년 경력의 특허 분쟁 대응 전문 변리사입니다. 
당신의 목표는 [분석 대상 특허(Anchor)]가 [선행 기술(Prior Art)]에 의해 신규성이나 진보성이 부정될 수 있는지, 혹은 침해 리스크가 있는지를 '매우 비판적이고 보수적인' 관점에서 정밀 분석하는 것입니다.

## 분석 원칙
1. **엄격한 구성요소 대비 (All Elements Rule)**: 청구항의 각 구성요소를 1:1로 대비하여, 문언적 일치 여부를 엄격하게 판단하십시오. A+B+C 구조에서 C가 다르다면 비침해입니다.
2. **사실 기반 분석 (Faithfulness)**: 제공된 텍스트에 없는 내용을 추측하여 유사하다고 판단하지 마십시오.
3. **리스크 중심 평가**: 선행 기술에 유사한 구성이 일부라도 있다면 리스크를 구체적으로 지적하십시오. "대체로 비슷하다"는 식의 모호한 표현은 지양하십시오.

## 입력 데이터
[분석 대상 특허 (Anchor)]
- 특허번호: {anchor_publication_number}
- 핵심 청구항: {anchor_claim}

[선행 기술 (Prior Art)]
- 특허번호: {cited_publication_number}
- 공개 청구항: {cited_claim}

## 분석 수행 요청
다음 JSON 구조에 맞춰 분석 결과를 작성해주십시오. (마크다운 포맷팅 사용 가능)

[유사도 평가]
- 기술적 유사성 점수 (0-100점). 80점 이상이면 강력한 거절이유/침해위험 존재.
- 핵심 공통 기술 요소 나열. (불필요한 배경 설명 제외)

[침해 리스크]
- 리스크 수준: High (문언 침해 유력), Medium (균등 침해 가능성 또는 설계 변경 필요), Low (구조적 차이 명확)
- 위험 요소: 선행 기술이 분석 대상 특허의 권리 범위를 잠식하는 구체적인 부분.

[회피 전략]
- 분석 대상 특허가 선행 기술을 회피하기 위해 수정해야 할 구체적인 설계 변경 제안.
- 구성요소의 삭제, 치환, 변경을 포함한 실질적 조언.
"""
    
    # Output settings
    max_pairs_per_patent: int = 1  # Reduced to save API costs (was 5)
    include_full_context: bool = True  # Include full patent context


# =============================================================================
# Agent Configuration
# =============================================================================

@dataclass
class AgentConfig:
    """Patent agent model and threshold configuration."""
    
    # Models
    embedding_model: str = field(default_factory=lambda: os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small"))
    grading_model: str = field(default_factory=lambda: os.environ.get("GRADING_MODEL", "gpt-4o-mini"))
    analysis_model: str = field(default_factory=lambda: os.environ.get("ANALYSIS_MODEL", "gpt-4o"))
    hyde_model: str = field(default_factory=lambda: os.environ.get("HYDE_MODEL", "gpt-4o-mini"))
    fallback_model: str = field(default_factory=lambda: os.environ.get("FALLBACK_MODEL", "gpt-3.5-turbo"))
    parsing_model: str = field(default_factory=lambda: os.environ.get("PARSING_MODEL", "gpt-4o-mini"))
    
    # Thresholds
    grading_threshold: float = field(default_factory=lambda: float(os.environ.get("GRADING_THRESHOLD", "0.6")))
    cutoff_threshold: float = field(default_factory=lambda: float(os.environ.get("CUTOFF_THRESHOLD", "0.3")))
    max_rewrite_attempts: int = field(default_factory=lambda: int(os.environ.get("MAX_REWRITE_ATTEMPTS", "1")))
    top_k_results: int = field(default_factory=lambda: int(os.environ.get("TOP_K_RESULTS", "5")))
    
    # Search weights
    dense_weight: float = field(default_factory=lambda: float(os.environ.get("DENSE_WEIGHT", "0.5")))
    sparse_weight: float = field(default_factory=lambda: float(os.environ.get("SPARSE_WEIGHT", "0.5")))


# =============================================================================
# Pipeline Configuration
# =============================================================================

@dataclass
class PipelineConfig:
    """Pipeline execution configuration."""
    
    # Concurrency limits (for i5-1340P: 4P + 8E cores)
    max_workers: int = 8  # Limit to prevent UI freezing
    
    # Pre-computation mode
    precompute_embeddings: bool = True
    save_index_to_disk: bool = True


# =============================================================================
# Authentication Configuration
# =============================================================================

@dataclass
class AuthConfig:
    """Authentication and JWT configuration."""
    
    secret_key: str = field(default_factory=lambda: os.environ.get("SECRET_KEY", "your-super-secret-key-change-it-in-prod"))
    algorithm: str = "HS256"
    access_token_expire_minutes: int = field(default_factory=lambda: int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30")))
    refresh_token_expire_minutes: int = field(default_factory=lambda: int(os.environ.get("REFRESH_TOKEN_EXPIRE_MINUTES", "1440")))

@dataclass
class SocialAuthConfig:
    """OAuth2 Social Login configuration."""
    google_client_id: Optional[str] = field(default_factory=lambda: os.environ.get("GOOGLE_CLIENT_ID"))
    google_client_secret: Optional[str] = field(default_factory=lambda: os.environ.get("GOOGLE_CLIENT_SECRET"))
    google_redirect_uri: Optional[str] = field(default_factory=lambda: os.environ.get("GOOGLE_REDIRECT_URI"))
    
    naver_client_id: Optional[str] = field(default_factory=lambda: os.environ.get("NAVER_CLIENT_ID"))
    naver_client_secret: Optional[str] = field(default_factory=lambda: os.environ.get("NAVER_CLIENT_SECRET"))
    naver_redirect_uri: Optional[str] = field(default_factory=lambda: os.environ.get("NAVER_REDIRECT_URI"))
    
    kakao_client_id: Optional[str] = field(default_factory=lambda: os.environ.get("KAKAO_CLIENT_ID"))
    kakao_client_secret: Optional[str] = field(default_factory=lambda: os.environ.get("KAKAO_CLIENT_SECRET"))
    kakao_redirect_uri: Optional[str] = field(default_factory=lambda: os.environ.get("KAKAO_REDIRECT_URI"))

# =============================================================================
# Logging Configuration
# =============================================================================

@dataclass
class LoggingConfig:
    """Logging configuration."""
    
    log_level: str = "INFO"
    log_format: str = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    log_file: Optional[str] = str(PROJECT_ROOT / "logs" / "patent_guard.log")
    
    # Create logs directory
    def __post_init__(self):
        if self.log_file:
            Path(self.log_file).parent.mkdir(parents=True, exist_ok=True)


# =============================================================================
# Master Configuration
# =============================================================================

@dataclass
class PatentGuardConfig:
    """Master configuration aggregating all sub-configs."""
    
    bigquery: BigQueryConfig = field(default_factory=BigQueryConfig)
    domain: DomainConfig = field(default_factory=DomainConfig)
    embedding: EmbeddingConfig = field(default_factory=EmbeddingConfig)

    pinecone: PineconeConfig = field(default_factory=PineconeConfig)
    painet: PAINETConfig = field(default_factory=PAINETConfig)
    self_rag: SelfRAGConfig = field(default_factory=SelfRAGConfig)
    auth: AuthConfig = field(default_factory=AuthConfig)
    agent: AgentConfig = field(default_factory=AgentConfig)
    pipeline: PipelineConfig = field(default_factory=PipelineConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    social_auth: SocialAuthConfig = field(default_factory=SocialAuthConfig)


# =============================================================================
# Default Configuration Instance
# =============================================================================

config = PatentGuardConfig()


# =============================================================================
# Configuration Helpers
# =============================================================================

def update_config_from_env() -> PatentGuardConfig:
    """환경 변수 변경 사항을 config 인스턴스에 반영합니다.

    bootstrap_secrets() 호출 이후에 호출해야 합니다.
    """
    global config

    # BigQuery / GCP
    if os.environ.get("GCP_PROJECT_ID"):
        config.bigquery.project_id = os.environ["GCP_PROJECT_ID"]

    # OpenAI API
    if os.environ.get("OPENAI_API_KEY"):
        config.embedding.api_key = os.environ["OPENAI_API_KEY"]
        config.self_rag.openai_api_key = os.environ["OPENAI_API_KEY"]

    # Pinecone API
    if os.environ.get("PINECONE_API_KEY"):
        config.pinecone.api_key = os.environ["PINECONE_API_KEY"]

    # Authentication
    if os.environ.get("SECRET_KEY"):
        config.auth.secret_key = os.environ["SECRET_KEY"]
    if os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES"):
        config.auth.access_token_expire_minutes = int(os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"])
    if os.environ.get("REFRESH_TOKEN_EXPIRE_MINUTES"):
        config.auth.refresh_token_expire_minutes = int(os.environ["REFRESH_TOKEN_EXPIRE_MINUTES"])

    # Agent / Models Config
    if os.environ.get("EMBEDDING_MODEL"):
        config.agent.embedding_model = os.environ["EMBEDDING_MODEL"]
    if os.environ.get("GRADING_MODEL"):
        config.agent.grading_model = os.environ["GRADING_MODEL"]
    if os.environ.get("ANALYSIS_MODEL"):
        config.agent.analysis_model = os.environ["ANALYSIS_MODEL"]
    if os.environ.get("HYDE_MODEL"):
        config.agent.hyde_model = os.environ["HYDE_MODEL"]
    if os.environ.get("FALLBACK_MODEL"):
        config.agent.fallback_model = os.environ["FALLBACK_MODEL"]
    if os.environ.get("PARSING_MODEL"):
        config.agent.parsing_model = os.environ["PARSING_MODEL"]

    if os.environ.get("GRADING_THRESHOLD"):
        config.agent.grading_threshold = float(os.environ["GRADING_THRESHOLD"])
    if os.environ.get("CUTOFF_THRESHOLD"):
        config.agent.cutoff_threshold = float(os.environ["CUTOFF_THRESHOLD"])
    if os.environ.get("MAX_REWRITE_ATTEMPTS"):
        config.agent.max_rewrite_attempts = int(os.environ["MAX_REWRITE_ATTEMPTS"])
    if os.environ.get("TOP_K_RESULTS"):
        config.agent.top_k_results = int(os.environ["TOP_K_RESULTS"])
    if os.environ.get("DENSE_WEIGHT"):
        config.agent.dense_weight = float(os.environ["DENSE_WEIGHT"])
    if os.environ.get("SPARSE_WEIGHT"):
        config.agent.sparse_weight = float(os.environ["SPARSE_WEIGHT"])

    # Social Auth
    if os.environ.get("GOOGLE_CLIENT_ID"):
        config.social_auth.google_client_id = os.environ["GOOGLE_CLIENT_ID"]
    if os.environ.get("GOOGLE_CLIENT_SECRET"):
        config.social_auth.google_client_secret = os.environ["GOOGLE_CLIENT_SECRET"]
    if os.environ.get("GOOGLE_REDIRECT_URI"):
        config.social_auth.google_redirect_uri = os.environ["GOOGLE_REDIRECT_URI"]
    
    if os.environ.get("NAVER_CLIENT_ID"):
        config.social_auth.naver_client_id = os.environ["NAVER_CLIENT_ID"]
    if os.environ.get("NAVER_CLIENT_SECRET"):
        config.social_auth.naver_client_secret = os.environ["NAVER_CLIENT_SECRET"]
    if os.environ.get("NAVER_REDIRECT_URI"):
        config.social_auth.naver_redirect_uri = os.environ["NAVER_REDIRECT_URI"]
        
    if os.environ.get("KAKAO_CLIENT_ID"):
        config.social_auth.kakao_client_id = os.environ["KAKAO_CLIENT_ID"]
    if os.environ.get("KAKAO_CLIENT_SECRET"):
        config.social_auth.kakao_client_secret = os.environ["KAKAO_CLIENT_SECRET"]
    if os.environ.get("KAKAO_REDIRECT_URI"):
        config.social_auth.kakao_redirect_uri = os.environ["KAKAO_REDIRECT_URI"]

    return config


# bootstrap_secrets() 이후 환경 변수가 주입된 상태에서 config를 최신화
update_config_from_env()


def print_config_summary() -> None:
    """Print configuration summary."""
    print("\n" + "=" * 70)
    print("⚡ 쇼특허 (Short-Cut) v3.0 - Configuration Summary")
    print("=" * 70)
    print(f"\n📊 BigQuery:")
    print(f"   Project: {config.bigquery.project_id}")
    print(f"   Date Range: {config.bigquery.min_filing_date} ~ {config.bigquery.max_filing_date}")
    print(f"   Dry Run: {config.bigquery.dry_run}")
    
    print(f"\n🔍 Domain: {config.domain.domain_name}")
    print(f"   Keywords: {len(config.domain.keywords)} terms")
    
    print(f"\n🧠 Embedding (OpenAI API):")
    print(f"   Model: {config.embedding.model_id}")
    print(f"   Dimension: {config.embedding.embedding_dim}")
    print(f"   API Key: {'✅ Set' if config.embedding.api_key else '❌ Not set'}")
    
    print(f"\n🌲 Pinecone (Serverless):")
    print(f"   Index Name: {config.pinecone.index_name}")
    print(f"   Cloud: {config.pinecone.cloud} ({config.pinecone.region})")
    print(f"   API Key: {'✅ Set' if config.pinecone.api_key else '❌ Not set'}")
    
    print(f"\n🔎 Hybrid Search:")
    print(f"   Dense: Pinecone (Cosine)")
    print(f"   Sparse: Local BM25 (rank_bm25)")
    print(f"   Fusion: RRF (k=60)")

    print(f"\n⚡ Pipeline:")
    print(f"   Max Workers: {config.pipeline.max_workers}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    update_config_from_env()
    print_config_summary()
