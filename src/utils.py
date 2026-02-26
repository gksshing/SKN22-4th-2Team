"""
Utility functions for the Short-Cut Patent Analysis App.
State-less helper functions + API 호출 관측용 로깅 유틸리티.
"""
from __future__ import annotations

import json
import logging
import sys
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import streamlit as st


# =============================================================================
# 구조화 로깅 유틸리티 (Structured Logging Utilities)
# =============================================================================

class _JsonFormatter(logging.Formatter):
    """JSON 형식 로그 포매터 — 구조화된 로그 출력용."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict = {
            "timestamp": datetime.now(tz=__import__('datetime').timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.name,
            "message": record.getMessage(),
        }
        # extra 필드 병합 (log_api_call 등에서 전달)
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)
        return json.dumps(log_entry, ensure_ascii=False)


def get_structured_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """
    JSON 구조화 로거 팩토리.

    동일 이름으로 재호출 시 기존 로거를 반환합니다.
    핸들러 중복 방지 로직 포함.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(level)
        logger.propagate = False
    return logger


@dataclass
class OpenAICallMetrics:
    """OpenAI API 단일 호출 메트릭 캡슐화."""

    method: str = ""
    model: str = ""
    elapsed_ms: float = 0.0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    success: bool = True
    error: Optional[str] = None
    error_type: Optional[str] = None


def log_api_call(logger: logging.Logger, metrics: OpenAICallMetrics) -> None:
    """
    OpenAI API 호출 결과를 구조화 로그로 기록.

    성공 시 INFO, 실패 시 ERROR 레벨로 출력합니다.
    """
    extra: dict = {
        "api_method": metrics.method,
        "model": metrics.model,
        "elapsed_ms": round(metrics.elapsed_ms, 2),
        "prompt_tokens": metrics.prompt_tokens,
        "completion_tokens": metrics.completion_tokens,
        "total_tokens": metrics.total_tokens,
        "success": metrics.success,
    }
    if metrics.error:
        extra["error"] = metrics.error
        extra["error_type"] = metrics.error_type

    record_msg = (
        f"[OpenAI] {metrics.method} | model={metrics.model} | "
        f"{metrics.elapsed_ms:.0f}ms | tokens={metrics.total_tokens}"
    )

    if metrics.success:
        logger.info(record_msg, extra={"extra_fields": extra})
    else:
        logger.error(record_msg, extra={"extra_fields": extra})

def get_risk_color(risk_level: str) -> tuple:
    """Get color scheme based on risk level."""
    colors = {
        "high": ("#dc3545", "🔴", "metric-high"),
        "medium": ("#ffc107", "🟡", "metric-medium"),
        "low": ("#28a745", "🟢", "metric-low"),
    }
    return colors.get(risk_level.lower(), ("#6c757d", "⚪", "metric-low"))


def get_score_color(score: int) -> str:
    """Get color based on similarity score."""
    if score >= 70:
        return "#dc3545"
    elif score >= 40:
        return "#ffc107"
    else:
        return "#28a745"


def get_patent_link(patent_id: str) -> str:
    """Generate Google Patents link from patent ID."""
    # Clean patent ID (remove spaces, dashes for URL)
    clean_id = patent_id.replace(" ", "").replace("-", "")
    return f"https://patents.google.com/patent/{clean_id}"


def display_patent_with_link(patent_id: str):
    """Display patent ID with clickable link."""
    link = get_patent_link(patent_id)
    st.markdown(f"📄 `{patent_id}` [🔗 원문 보기]({link})")


def format_analysis_markdown(result: dict) -> str:
    """Format analysis result as downloadable markdown."""
    analysis = result.get("analysis", {})
    
    md = f"""# ⚡ 쇼특허 (Short-Cut) Analysis Report
> Generated: {result.get('timestamp', datetime.now().isoformat())}
> Search Type: {result.get('search_type', 'hybrid').upper()}

## 💡 User Idea
{result.get('user_idea', 'N/A')}

---

## 📊 Analysis Summary

### [1. 유사도 평가] Similarity Assessment
- **Score**: {analysis.get('similarity', {}).get('score', 0)}/100
- **Summary**: {analysis.get('similarity', {}).get('summary', 'N/A')}
- **Common Elements**: {', '.join(analysis.get('similarity', {}).get('common_elements', []))}
- **Evidence Patents**: {', '.join(analysis.get('similarity', {}).get('evidence', []))}

### [2. 침해 리스크] Infringement Risk
- **Risk Level**: {analysis.get('infringement', {}).get('risk_level', 'unknown').upper()}
- **Summary**: {analysis.get('infringement', {}).get('summary', 'N/A')}
- **Risk Factors**:
{chr(10).join(['  - ' + f for f in analysis.get('infringement', {}).get('risk_factors', [])])}
- **Evidence Patents**: {', '.join(analysis.get('infringement', {}).get('evidence', []))}

### [3. 회피 전략] Avoidance Strategy
- **Summary**: {analysis.get('avoidance', {}).get('summary', 'N/A')}
- **Strategies**:
{chr(10).join(['  - ' + s for s in analysis.get('avoidance', {}).get('strategies', [])])}
- **Alternatives**: {', '.join(analysis.get('avoidance', {}).get('alternatives', []))}

---

## 📌 Conclusion
{analysis.get('conclusion', 'N/A')}

---

## 📚 Referenced Patents
"""
    for patent in result.get("search_results", []):
        md += f"""
### {patent.get('patent_id')}
- **Title**: {patent.get('title')}
- **Score**: {patent.get('grading_score', 0):.2f} (RRF: {patent.get('rrf_score', 0):.4f})
- **Abstract**: {patent.get('abstract')}
"""
    return md
