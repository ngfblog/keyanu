"""Shared pytest fixtures.

Sets up an isolated temp SQLite database BEFORE importing the app, since
app.core.config.settings is instantiated at import time from environment
variables.
"""
import os
import shutil
import tempfile

import pytest

_TEST_DATA_DIR = tempfile.mkdtemp(prefix="keyanu-test-")

os.environ["DATA_DIR"] = _TEST_DATA_DIR
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["ENCRYPTION_KEY"] = "test-encryption-key"
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "admin-initial-pw"
os.environ["ENVIRONMENT"] = "test"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
    shutil.rmtree(_TEST_DATA_DIR, ignore_errors=True)


@pytest.fixture(scope="session")
def admin_token(client) -> str:
    """Returns a valid token for the rest of the suite. Tolerates the bootstrap
    initial password having already been consumed by an earlier test (e.g.
    test_must_change_password_blocks_other_endpoints), since fixture
    resolution order isn't the same as test file order."""
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin-initial-pw"})
    if resp.status_code == 200:
        data = resp.json()
        assert data["must_change_password"] is True
        token = data["access_token"]
        changed = client.post(
            "/api/security/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"current_password": "admin-initial-pw", "new_password": "Sup3rSecret!"},
        )
        assert changed.status_code == 204
        return token

    # Initial password already used up by another test -- log in with the
    # password the suite has standardized on instead.
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "Sup3rSecret!"})
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}
