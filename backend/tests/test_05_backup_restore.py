import io
import zipfile

from app.core import backup as backup_module


def test_export_requires_correct_password(client, auth_headers):
    resp = client.post("/api/backup/export", headers=auth_headers, json={"current_password": "wrong"})
    assert resp.status_code == 400


def test_export_produces_valid_zip_with_manifest(client, auth_headers):
    resp = client.post(
        "/api/backup/export", headers=auth_headers, json={"current_password": "Sup3rSecret!"}
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/octet-stream"

    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    assert set(zf.namelist()) == {"manifest.json", "payload.enc"}


def test_verify_accepts_freshly_exported_backup(client, auth_headers):
    export = client.post(
        "/api/backup/export", headers=auth_headers, json={"current_password": "Sup3rSecret!"}
    )
    files = {"file": ("backup.keyanu", export.content, "application/octet-stream")}
    resp = client.post("/api/backup/verify", headers=auth_headers, files=files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["valid"] is True
    assert body["encryption_key_matches"] is True
    assert body["checksum_ok"] is True
    assert body["counts"]["workspaces"] >= 1


def test_verify_rejects_backup_with_different_encryption_key(client, auth_headers, monkeypatch):
    export = client.post(
        "/api/backup/export", headers=auth_headers, json={"current_password": "Sup3rSecret!"}
    )

    # Simulate this server having a different ENCRYPTION_KEY than the one the
    # backup was made with, without needing a second process.
    monkeypatch.setattr(backup_module, "encryption_key_fingerprint", lambda: "0000000000000000")

    files = {"file": ("backup.keyanu", export.content, "application/octet-stream")}
    resp = client.post("/api/backup/verify", headers=auth_headers, files=files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["valid"] is False
    assert body["encryption_key_matches"] is False
    assert body["can_decrypt"] is False
    assert any("different ENCRYPTION_KEY" in e for e in body["errors"])


def test_restore_rejects_mismatched_key_without_touching_data(client, auth_headers, monkeypatch):
    export = client.post(
        "/api/backup/export", headers=auth_headers, json={"current_password": "Sup3rSecret!"}
    )
    before = client.get("/api/workspaces", headers=auth_headers).json()

    monkeypatch.setattr(backup_module, "encryption_key_fingerprint", lambda: "0000000000000000")

    files = {"file": ("backup.keyanu", export.content, "application/octet-stream")}
    resp = client.post(
        "/api/backup/restore",
        headers=auth_headers,
        files=files,
        data={"current_password": "Sup3rSecret!", "confirm_overwrite": "true"},
    )
    assert resp.status_code == 400
    assert "different ENCRYPTION_KEY" in resp.json()["detail"]

    after = client.get("/api/workspaces", headers=auth_headers).json()
    assert before == after  # nothing was touched


def test_restore_requires_confirm_overwrite(client, auth_headers):
    export = client.post(
        "/api/backup/export", headers=auth_headers, json={"current_password": "Sup3rSecret!"}
    )
    files = {"file": ("backup.keyanu", export.content, "application/octet-stream")}
    resp = client.post(
        "/api/backup/restore",
        headers=auth_headers,
        files=files,
        data={"current_password": "Sup3rSecret!", "confirm_overwrite": "false"},
    )
    assert resp.status_code == 400


def test_restore_same_key_preserves_data_and_revokes_sessions(client, auth_headers):
    before_ws = client.get("/api/workspaces", headers=auth_headers).json()
    res_id = client.get(
        f"/api/workspaces/{before_ws[0]['id']}/resources", headers=auth_headers
    ).json()[0]["id"]
    before_creds = client.get(f"/api/resources/{res_id}/credentials", headers=auth_headers).json()

    export = client.post(
        "/api/backup/export", headers=auth_headers, json={"current_password": "Sup3rSecret!"}
    )
    files = {"file": ("backup.keyanu", export.content, "application/octet-stream")}
    resp = client.post(
        "/api/backup/restore",
        headers=auth_headers,
        files=files,
        data={"current_password": "Sup3rSecret!", "confirm_overwrite": "true"},
    )
    assert resp.status_code == 200
    assert resp.json()["restored"] is True

    # The token used to perform the restore is itself a session, and must be
    # revoked afterward along with everything else.
    after_restore_check = client.get("/api/workspaces", headers=auth_headers)
    assert after_restore_check.status_code == 401

    # Log back in and confirm the data survived the round trip intact.
    login = client.post("/api/auth/login", json={"username": "admin", "password": "Sup3rSecret!"})
    new_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    after_ws = client.get("/api/workspaces", headers=new_headers).json()
    assert [w["name"] for w in after_ws] == [w["name"] for w in before_ws]

    after_creds = client.get(f"/api/resources/{res_id}/credentials", headers=new_headers).json()
    assert [c["name"] for c in after_creds] == [c["name"] for c in before_creds]

    reveal = client.post(f"/api/credentials/{after_creds[0]['id']}/reveal", headers=new_headers)
    assert reveal.status_code == 200
    assert reveal.json()["fields"]["password"] == "hunter2"
