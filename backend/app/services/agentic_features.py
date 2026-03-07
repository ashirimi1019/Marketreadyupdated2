from __future__ import annotations

from datetime import datetime, timezone
import json
import re
from typing import Any

from sqlalchemy.orm import Session

from app.models.entities import ChecklistItem, ChecklistVersion, MarketSignal, UserPathway
from app.services.ai import (
    _cached_call_llm,
    _call_llm,
    _log_ai_audit,
    _safe_json,
    ai_is_configured,
    ai_strict_mode_enabled,
    get_active_ai_model,
)
from app.services.market_stress import (
    compute_market_stress_test,
    fetch_adzuna_benchmarks,
    fetch_careeronestop_skills,
)

CRUCIBLE_DEFAULT_SCENARIO = "sql-injection-outage"
CRUCIBLE_TIME_LIMIT_SECONDS = 300
CRUCIBLE_SCENARIOS: dict[str, dict[str, str]] = {
    "sql-injection-outage": {
        "id": "sql-injection-outage",
        "title": "5-Minute Stress Test: SQL Injection Outage",
        "prompt": (
            "Your production API is failing after a SQL injection exploit attempt. "
            "You have 5 minutes. What are your first 3 steps and why?"
        ),
        "log_snippet": (
            "2026-02-22T22:40:17Z api-gateway WARN 500 POST /v1/payments\n"
            "db ERROR syntax error at or near \"OR 1=1\" in query id=8f23\n"
            "waf WARN signature=sql-injection source_ip=185.71.xx.xx"
        ),
    }
}

STOPWORDS = {
    "and",
    "the",
    "for",
    "with",
    "from",
    "into",
    "that",
    "this",
    "your",
    "what",
    "when",
    "then",
    "will",
    "role",
    "task",
    "plan",
    "step",
    "first",
    "next",
}


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_text(value: str) -> str:
    return " ".join(
        (value or "")
        .strip()
        .lower()
        .replace("_", " ")
        .replace("-", " ")
        .replace("/", " ")
        .split()
    )


def _tokenize(value: str) -> list[str]:
    return [
        token
        for token in re.findall(r"[a-z0-9+#.]+", _normalize_text(value))
        if len(token) >= 3 and token not in STOPWORDS
    ]


def _dedupe(values: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for raw in values:
        value = (raw or "").strip()
        key = value.lower()
        if not value or key in seen:
            continue
        seen.add(key)
        out.append(value)
    return out


def get_crucible_scenario(scenario_id: str | None = None) -> dict[str, str]:
    scenario = CRUCIBLE_SCENARIOS.get((scenario_id or "").strip())
    if scenario:
        return scenario
    return CRUCIBLE_SCENARIOS[CRUCIBLE_DEFAULT_SCENARIO]


def _fallback_crucible_score(answer: str) -> dict[str, Any]:
    text = _normalize_text(answer)
    buckets: list[tuple[str, set[str], str]] = [
        (
            "Incident Triage",
            {"isolate", "rollback", "disable", "block", "contain", "incident"},
            "Prioritize impact triage and containment before deep debugging.",
        ),
        (
            "Containment",
            {"waf", "rotate", "revoke", "firewall", "patch", "lockdown", "sanitize"},
            "Explicitly state short-term risk controls that stop active abuse.",
        ),
        (
            "Communication",
            {"notify", "stakeholder", "status page", "incident channel", "on-call", "team"},
            "Call out who gets updated and how often.",
        ),
        (
            "Root-Cause Reasoning",
            {"logs", "query", "trace", "reproduce", "audit", "payload", "forensics"},
            "Show root-cause logic, not only symptom mitigation.",
        ),
        (
            "Recovery Validation",
            {"test", "monitor", "postmortem", "verify", "alerts", "regression", "metrics"},
            "End with validation checks and prevention steps.",
        ),
    ]

    dimensions: list[dict[str, Any]] = []
    strengths: list[str] = []
    risks: list[str] = []
    next_actions: list[str] = []

    for label, keywords, guidance in buckets:
        hits = sum(1 for keyword in keywords if keyword in text)
        score = min(100.0, 24.0 + (hits * 17.0))
        dimensions.append({"label": label, "score": round(score, 1)})
        if hits >= 2:
            strengths.append(f"{label}: clear process signal.")
        else:
            risks.append(f"{label}: thin process evidence.")
            next_actions.append(guidance)

    avg = sum(float(item["score"]) for item in dimensions) / max(len(dimensions), 1)
    if len(answer.strip()) < 120:
        avg = max(0.0, avg - 9.0)
        risks.append("Answer is short; add a deeper reasoning chain.")
    process_score = round(max(0.0, min(100.0, avg)), 1)

    if process_score >= 85:
        rating = "elite"
    elif process_score >= 70:
        rating = "strong"
    elif process_score >= 50:
        rating = "developing"
    else:
        rating = "high_risk"

    return {
        "process_score": process_score,
        "rating": rating,
        "dimensions": dimensions,
        "strengths": _dedupe(strengths)[:4],
        "risks": _dedupe(risks)[:4],
        "next_actions": _dedupe(next_actions)[:4],
        "model_used": "fallback",
    }


def evaluate_crucible_response(
    db: Session,
    *,
    user_id: str,
    answer: str,
    target_role: str | None,
    location: str | None,
    scenario_id: str | None,
) -> dict[str, Any]:
    scenario = get_crucible_scenario(scenario_id)
    trimmed_answer = (answer or "").strip()
    if len(trimmed_answer) < 20:
        raise ValueError("Provide a detailed response with your first 3 steps.")

    # Compute keyword-based preliminary score immediately (fast path, ~100ms)
    keyword_fallback = _fallback_crucible_score(trimmed_answer)
    preliminary_score: float = float(keyword_fallback.get("process_score", 0.0))

    model_used = "fallback"
    ai_failure_reason: str | None = None
    parsed: dict[str, Any] | None = None

    if ai_is_configured():
        try:
            payload = {
                "scenario": scenario,
                "answer": trimmed_answer,
                "target_role": target_role,
                "location": location,
                "scoring_dimensions": [
                    "incident triage",
                    "containment",
                    "communication",
                    "root-cause reasoning",
                    "recovery validation",
                ],
            }
            system_prompt = (
                "You are a hiring evaluator scoring behavioral crisis response process. "
                "Score process quality, not factual perfection. "
                "Ignore demographics, pedigree, and identity factors. "
                "Return strict JSON: "
                "{process_score,rating,dimensions:[{label,score}],strengths:[...],risks:[...],next_actions:[...]}"
            )
            parsed = _safe_json(
                _cached_call_llm(system_prompt, json.dumps(payload))
            )
            model_used = get_active_ai_model()
        except Exception as exc:
            ai_failure_reason = str(exc)
            parsed = None

    if not parsed:
        if ai_strict_mode_enabled() and not ai_is_configured():
            raise RuntimeError(
                "AI strict mode: Crucible scoring requires an AI provider configuration."
            )
        if ai_strict_mode_enabled() and ai_failure_reason:
            raise RuntimeError(
                "AI strict mode: Crucible scoring failed. "
                f"Reason: {ai_failure_reason[:220]}"
            )
        fallback = _fallback_crucible_score(trimmed_answer)
        parsed = fallback
        model_used = fallback.get("model_used", "fallback")

    dimensions = parsed.get("dimensions") if isinstance(parsed.get("dimensions"), list) else []
    cleaned_dimensions: list[dict[str, Any]] = []
    for row in dimensions:
        if not isinstance(row, dict):
            continue
        label = str(row.get("label") or "").strip()
        if not label:
            continue
        score = float(row.get("score") or 0.0)
        cleaned_dimensions.append({"label": label, "score": round(max(0.0, min(100.0, score)), 1)})
    if not cleaned_dimensions:
        fallback = _fallback_crucible_score(trimmed_answer)
        cleaned_dimensions = fallback["dimensions"]

    process_score = float(parsed.get("process_score") or 0.0)
    if process_score <= 0:
        process_score = sum(float(item["score"]) for item in cleaned_dimensions) / max(len(cleaned_dimensions), 1)
    process_score = round(max(0.0, min(100.0, process_score)), 1)

    rating = str(parsed.get("rating") or "").strip().lower()
    if rating not in {"elite", "strong", "developing", "high_risk"}:
        if process_score >= 85:
            rating = "elite"
        elif process_score >= 70:
            rating = "strong"
        elif process_score >= 50:
            rating = "developing"
        else:
            rating = "high_risk"

    strengths = [str(row).strip() for row in (parsed.get("strengths") or []) if str(row).strip()]
    risks = [str(row).strip() for row in (parsed.get("risks") or []) if str(row).strip()]
    next_actions = [str(row).strip() for row in (parsed.get("next_actions") or []) if str(row).strip()]

    output = {
        "scenario_id": scenario["id"],
        "scenario_title": scenario["title"],
        "scenario_prompt": scenario["prompt"],
        "log_snippet": scenario["log_snippet"],
        "time_limit_seconds": CRUCIBLE_TIME_LIMIT_SECONDS,
        "process_score": process_score,
        "preliminary_score": round(preliminary_score, 1),
        "rating": rating,
        "dimensions": cleaned_dimensions,
        "strengths": _dedupe(strengths)[:4],
        "risks": _dedupe(risks)[:4],
        "next_actions": _dedupe(next_actions)[:4],
        "model_used": model_used,
        "evaluated_at": _utc_iso(),
    }

    _log_ai_audit(
        db,
        user_id=user_id,
        feature="proof_crucible_stress_test",
        prompt_input={
            "target_role": target_role,
            "location": location,
            "scenario_id": scenario["id"],
        },
        context_ids=[],
        model=model_used,
        output=f"score={output['process_score']} rating={output['rating']}",
    )
    return output


def _checklist_skill_hints(db: Session, user_id: str) -> list[str]:
    selection = db.query(UserPathway).filter(UserPathway.user_id == user_id).one_or_none()
    if not selection:
        return []

    version_id = selection.checklist_version_id
    if not version_id:
        version = (
            db.query(ChecklistVersion)
            .filter(ChecklistVersion.pathway_id == selection.pathway_id)
            .filter(ChecklistVersion.status == "published")
            .order_by(ChecklistVersion.version_number.desc())
            .first()
        )
        if not version:
            return []
        version_id = version.id

    rows = db.query(ChecklistItem.title).filter(ChecklistItem.version_id == version_id).all()
    return _dedupe([str(row[0]).strip() for row in rows if row and row[0]])[:20]


def _task_skill_matches(tasks: list[str], skills: list[str], *, limit: int = 8) -> list[str]:
    if not tasks or not skills:
        return []
    normalized_skills = [(_normalize_text(skill), skill) for skill in skills if skill]
    selected: list[str] = []
    for task in tasks:
        task_tokens = set(_tokenize(task))
        if not task_tokens:
            continue
        best_skill = ""
        best_overlap = 0
        for norm_skill, raw_skill in normalized_skills:
            skill_tokens = set(_tokenize(norm_skill))
            overlap = len(task_tokens & skill_tokens)
            if overlap > best_overlap:
                best_overlap = overlap
                best_skill = raw_skill
        if best_skill and best_overlap > 0:
            selected.append(best_skill)
        if len(selected) >= limit:
            break
    return _dedupe(selected)


def _proxy_delta_from_market_signals(
    db: Session,
    *,
    skill: str,
    target_job: str,
    base_salary: float,
) -> float:
    query = db.query(MarketSignal.frequency).order_by(MarketSignal.window_end.desc().nullslast()).limit(120)
    normalized_skill = _normalize_text(skill)
    normalized_job = _normalize_text(target_job)
    if normalized_skill:
        query = query.filter(MarketSignal.role_family.ilike(f"%{normalized_skill}%"))
    elif normalized_job:
        query = query.filter(MarketSignal.role_family.ilike(f"%{normalized_job}%"))

    rows = query.all()
    values = [float(row[0]) for row in rows if row and row[0] is not None and float(row[0]) > 0]
    mean_freq = (sum(values) / len(values)) if values else 0.0
    normalized_freq = max(0.0, min(1.0, mean_freq / 25.0))
    pct = 0.02 + (normalized_freq * 0.08)
    return round(max(0.0, base_salary) * pct, 2)


def build_salary_delta_projection(
    db: Session,
    *,
    user_id: str,
    target_job: str,
    location: str,
    completed_tasks: list[str],
    all_tasks: list[str],
) -> dict[str, Any]:
    target_role = (target_job or "software engineer").strip() or "software engineer"
    target_location = (location or "united states").strip() or "united states"
    completed = _dedupe([str(task).strip() for task in completed_tasks if str(task).strip()])
    planned = _dedupe([str(task).strip() for task in all_tasks if str(task).strip()])

    base_salary = 0.0
    source_mode = "estimated_fallback"
    query_used = target_role
    location_used = target_location

    try:
        stress = compute_market_stress_test(
            db,
            user_id=user_id,
            target_job=target_role,
            location=target_location,
        )
        base_salary = float(stress.get("salary_average") or 0.0)
        source_mode = str(stress.get("source_mode") or "live")
        query_used = str(stress.get("adzuna_query_used") or target_role)
        location_used = str(stress.get("adzuna_location_used") or target_location)
    except Exception:
        try:
            benchmark = fetch_adzuna_benchmarks(target_role, target_location)
            base_salary = float(benchmark.salary_avg or 0.0)
            source_mode = "live"
            query_used = benchmark.adzuna_query_used or target_role
            location_used = benchmark.adzuna_location_used or target_location
        except Exception:
            base_salary = 0.0
            source_mode = "estimated_fallback"

    try:
        required_skills = fetch_careeronestop_skills(target_role)
    except Exception:
        required_skills = _checklist_skill_hints(db, user_id)

    required_skills = _dedupe(required_skills)[:20]
    completed_skill_hits = _task_skill_matches(completed, required_skills, limit=10)
    planned_skill_hits = _task_skill_matches(planned, required_skills, limit=12)

    tracked_skills = _dedupe(completed_skill_hits + planned_skill_hits + required_skills[:6])[:12]
    if not tracked_skills and required_skills:
        tracked_skills = required_skills[:8]

    delta_cache: dict[str, tuple[float, str]] = {}
    skill_deltas: list[dict[str, Any]] = []
    completed_skill_set = {skill.lower() for skill in completed_skill_hits}

    for skill in tracked_skills:
        key = skill.lower()
        if key not in delta_cache:
            try:
                benchmark = fetch_adzuna_benchmarks(f"{target_role} {skill}", target_location)
                skill_salary = float(benchmark.salary_avg or 0.0)
                if base_salary > 0 and skill_salary > 0:
                    delta_value = skill_salary - base_salary
                elif skill_salary > 0:
                    delta_value = skill_salary * 0.06
                else:
                    delta_value = _proxy_delta_from_market_signals(
                        db,
                        skill=skill,
                        target_job=target_role,
                        base_salary=base_salary,
                    )
                delta_cache[key] = (round(delta_value, 2), "adzuna_skill_query")
            except Exception:
                delta_cache[key] = (
                    _proxy_delta_from_market_signals(
                        db,
                        skill=skill,
                        target_job=target_role,
                        base_salary=base_salary,
                    ),
                    "market_signal_proxy",
                )

        delta_value, delta_source = delta_cache[key]
        unlocked = key in completed_skill_set
        skill_deltas.append(
            {
                "skill": skill,
                "unlocked": unlocked,
                "delta_usd": round(delta_value, 2),
                "source": delta_source,
            }
        )

    potential_value = sum(max(0.0, float(row["delta_usd"])) for row in skill_deltas if row["unlocked"])
    projected_salary = max(0.0, base_salary + potential_value)

    return {
        "base_salary_estimate": round(base_salary, 2),
        "projected_salary_estimate": round(projected_salary, 2),
        "potential_value_added": round(potential_value, 2),
        "unlocked_skill_count": sum(1 for row in skill_deltas if row["unlocked"]),
        "tracked_skill_count": len(skill_deltas),
        "source_mode": source_mode,
        "adzuna_query_used": query_used,
        "adzuna_location_used": location_used,
        "skill_deltas": skill_deltas,
        "generated_at": _utc_iso(),
    }
