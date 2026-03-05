"""Public demo endpoints — no authentication required."""
from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, UploadFile, HTTPException, Request

from app.core.config import settings
from app.core.ratelimit import RateLimiter
from app.services.ai import (
    _extract_resume_blob_text,
    ai_is_configured,
)

router = APIRouter(prefix="/public/demo", tags=["demo"])
logger = logging.getLogger(__name__)

# Rate limiter: 5 scans per 60 seconds per IP
resume_scan_limiter = RateLimiter(limit=5, window_seconds=60)

# Max file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".doc", ".rtf"}


def _get_client_ip(request: Request) -> str:
    """Extract client IP from request, respecting X-Forwarded-For."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rules_based_score(resume_text: str) -> dict[str, Any]:
    """Generate resume score and feedback using rule-based analysis."""
    text_lower = resume_text.lower()

    # Score calculation
    score = 50  # Base score

    # Check for quantified outcomes/metrics (+15)
    metrics_indicators = ["increased", "improved", "reduced", "achieved", "delivered", "%", "million", "thousands"]
    if any(ind in text_lower for ind in metrics_indicators):
        score += 15

    # Check for technical skills (+20)
    tech_skills = ["python", "javascript", "java", "react", "aws", "kubernetes", "sql", "git", "ci/cd"]
    matched_skills = [s for s in tech_skills if s in text_lower]
    if matched_skills:
        score = min(100, score + (len(matched_skills) * 2))

    # Check for GitHub presence (+10)
    if "github" in text_lower:
        score += 10

    # Check for full stack/multiple disciplines (+10)
    fullstack_indicators = ["frontend", "backend", "full stack", "fullstack", "full-stack"]
    if any(ind in text_lower for ind in fullstack_indicators):
        score += 10

    # Check for leadership/impact (+10)
    leadership_keywords = ["led", "managed", "mentored", "architected", "designed"]
    if any(kw in text_lower for kw in leadership_keywords):
        score += 10

    # Cap score at 100
    score = min(100, score)

    # Determine band based on score
    if score >= 85:
        band = "Highly Hireable"
    elif score >= 65:
        band = "Competitive"
    elif score >= 45:
        band = "Needs Improvement"
    else:
        band = "Underqualified"

    # Extract strengths
    strengths = []
    if any(ind in text_lower for ind in metrics_indicators):
        strengths.append("Clear, quantified outcomes and impact metrics")
    if matched_skills:
        strengths.append(f"Strong technical foundation ({', '.join(matched_skills[:3])})")
    if "github" in text_lower:
        strengths.append("GitHub presence demonstrates hands-on coding")

    if not strengths:
        strengths = ["Resume includes relevant content"]

    # Extract improvements
    improvements = []
    if not any(ind in text_lower for ind in metrics_indicators):
        improvements.append("Add quantified metrics and outcomes (e.g., '30% improvement', '$2M revenue')")
    if len(matched_skills) < 3:
        improvements.append("Highlight more specific technical skills and technologies")
    if "github" not in text_lower:
        improvements.append("Include a link to GitHub portfolio or code samples")

    if not improvements:
        improvements = ["Continue building diverse project experience"]

    # Extract keywords
    all_tech = tech_skills + ["machine learning", "devops", "docker", "postgresql", "mongodb", "rest api", "graphql"]
    keywords_found = [t for t in all_tech if t in text_lower]
    keywords_found = list(dict.fromkeys(keywords_found))[:5]  # Unique, max 5

    # Infer role
    role_match = "Software Engineer"
    if "data" in text_lower or "analytics" in text_lower:
        role_match = "Data Engineer / Analyst"
    elif "devops" in text_lower or "infra" in text_lower:
        role_match = "DevOps / Infrastructure Engineer"
    elif "frontend" in text_lower or "react" in text_lower or "ui/ux" in text_lower:
        role_match = "Frontend Engineer"
    elif "backend" in text_lower or "api" in text_lower:
        role_match = "Backend Engineer"

    return {
        "score": score,
        "band": band,
        "strengths": strengths,
        "improvements": improvements,
        "keywords_found": keywords_found,
        "role_match": role_match,
    }


async def _call_llm_for_scoring(resume_text: str) -> dict[str, Any] | None:
    """Call LLM to generate resume score and feedback."""
    try:
        from app.services.ai import _call_llm

        system_prompt = """You are an expert hiring manager and resume reviewer. Analyze the provided resume and score its hireability from 0-100 based on market demand, technical depth, and communication clarity. Return valid JSON only."""

        user_message = f"""Analyze this resume and provide a hireability score (0-100) and feedback in JSON format with these exact fields:
{{
  "score": <int 0-100>,
  "band": "<one of: Highly Hireable, Competitive, Needs Improvement, Underqualified>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "keywords_found": ["<tech skill 1>", "<tech skill 2>", ...],
  "role_match": "<inferred target role>"
}}

Resume:
{resume_text[:4000]}"""

        result_text = _call_llm(system_prompt, user_message, expect_json=True)
        if not result_text:
            return None

        # Parse JSON response
        result = json.loads(result_text)

        # Validate required fields
        if not all(k in result for k in ["score", "band", "strengths", "improvements", "keywords_found", "role_match"]):
            return None

        # Clamp score
        result["score"] = max(0, min(100, int(result["score"])))

        return result
    except Exception as e:
        logger.warning(f"LLM scoring failed: {e}")
        return None


@router.post("/resume-scan")
async def demo_resume_scan(
    file: UploadFile = File(...),
    request: Request = None,
) -> dict[str, Any]:
    """
    Public endpoint to analyze a resume and provide hireability score.
    No authentication required. Rate limited per IP.

    Returns:
    - score: int 0-100 hireability score
    - band: category (Highly Hireable, Competitive, Needs Improvement, Underqualified)
    - strengths: list of 3 resume strengths
    - improvements: list of 3 improvement suggestions
    - keywords_found: top technical keywords detected
    - role_match: inferred target role
    """

    # Rate limit by IP
    client_ip = _get_client_ip(request)
    try:
        resume_scan_limiter.check(f"resume_scan:{client_ip}")
    except Exception as e:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in 60 seconds.")

    # Validate file extension
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max 5MB.")

    # Read file
    try:
        blob = await file.read()
        if len(blob) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large. Max 5MB.")
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        raise HTTPException(status_code=400, detail="Failed to read file")

    # Extract text
    resume_text = _extract_resume_blob_text(blob, suffix)
    if not resume_text or len(resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract text from resume. Ensure it's a valid file.")

    # Try LLM first, fall back to rules-based
    if ai_is_configured():
        llm_result = await _call_llm_for_scoring(resume_text)
        if llm_result:
            logger.info(f"Resume scan scored via LLM: {llm_result['score']}")
            return llm_result
        logger.info("LLM scoring unavailable, falling back to rules-based")

    # Fall back to rules-based scoring
    result = _rules_based_score(resume_text)
    logger.info(f"Resume scan scored via rules: {result['score']}")
    return result
