from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services import ai_orchestrator as orchestrator


class DummyDB:
    pass


def test_pivot_applies_when_candidate_improves_demand(monkeypatch):
    demand_by_role = {
        "frontend engineer": 50.0,
        "backend engineer": 70.0,  # +20.0
        "cloud security engineer": 58.0,
        "data engineer": 60.0,
        "ml engineer": 62.0,
    }

    def fake_stress(_db, *, user_id, target_job, location):
        return {
            "components": {
                "market_trend_score": demand_by_role[target_job],
            }
        }

    monkeypatch.setattr(orchestrator, "compute_market_stress_test", fake_stress)

    best_role, pivot_applied, reason, delta = orchestrator._evaluate_pivot(
        DummyDB(),
        user_id="user-1",
        location="atlanta, ga",
        base_target_job="frontend engineer",
        base_market_trend_score=50.0,
    )

    assert pivot_applied is True
    assert best_role == "backend engineer"
    assert delta == 20.0
    assert "Pivot applied" in reason


def test_pivot_applies_for_small_positive_delta(monkeypatch):
    demand_by_role = {
        "software engineer": 48.1,
        "backend engineer": 50.6,  # +2.5
        "cloud security engineer": 49.0,
        "data engineer": 48.3,
        "ml engineer": 48.2,
    }

    def fake_stress(_db, *, user_id, target_job, location):
        return {
            "components": {
                "market_trend_score": demand_by_role[target_job],
            }
        }

    monkeypatch.setattr(orchestrator, "compute_market_stress_test", fake_stress)

    best_role, pivot_applied, reason, delta = orchestrator._evaluate_pivot(
        DummyDB(),
        user_id="user-2",
        location="atlanta, ga",
        base_target_job="software engineer",
        base_market_trend_score=48.1,
    )

    assert pivot_applied is True
    assert best_role == "backend engineer"
    assert delta == 2.5
    assert "Pivot applied" in reason


def test_pivot_not_applied_when_no_candidate_improves_demand(monkeypatch):
    demand_by_role = {
        "software engineer": 52.0,
        "backend engineer": 50.5,
        "cloud security engineer": 51.9,
        "data engineer": 49.7,
        "ml engineer": 48.8,
    }

    def fake_stress(_db, *, user_id, target_job, location):
        return {
            "components": {
                "market_trend_score": demand_by_role[target_job],
            }
        }

    monkeypatch.setattr(orchestrator, "compute_market_stress_test", fake_stress)

    best_role, pivot_applied, reason, delta = orchestrator._evaluate_pivot(
        DummyDB(),
        user_id="user-3",
        location="atlanta, ga",
        base_target_job="software engineer",
        base_market_trend_score=52.0,
    )

    assert pivot_applied is False
    assert best_role == "software engineer"
    assert delta == 0.0
    assert "Pivot not applied" in reason
