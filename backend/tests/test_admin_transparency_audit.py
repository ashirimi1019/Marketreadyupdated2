from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.core.config import settings


def test_transparency_audit_requires_admin_token():
    settings.admin_token = "test-admin-token"
    client = TestClient(app)
    response = client.get("/admin/ai/transparency")
    assert response.status_code == 401


def test_transparency_audit_shape_and_weights():
    settings.admin_token = "test-admin-token"
    client = TestClient(app)
    response = client.get(
        "/admin/ai/transparency",
        headers={"X-Admin-Token": "test-admin-token"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["framework_version"] == "2026.1"
    factors = payload["factors"]
    assert len(factors) == 3
    assert factors[0]["label"] == "Code Logic"
    assert factors[0]["weight_percent"] == 80.0
    assert factors[1]["label"] == "Market Demand"
    assert factors[1]["weight_percent"] == 20.0
    assert factors[2]["label"] == "Personal Demographics"
    assert factors[2]["weight_percent"] == 0.0
    assert factors[2]["included"] is False
