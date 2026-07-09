from app.core.config import settings


def test_health_returns_configured_version(client, monkeypatch):
    monkeypatch.setattr(settings, "APP_VERSION", "9.8.7-test")

    resp = client.get("/api/health")

    assert resp.status_code == 200
    assert resp.json()["version"] == "9.8.7-test"


def test_about_returns_configured_version(client, monkeypatch):
    monkeypatch.setattr(settings, "APP_VERSION", "9.8.7-test")

    resp = client.get("/api/settings/about")

    assert resp.status_code == 200
    assert resp.json()["version"] == "9.8.7-test"
