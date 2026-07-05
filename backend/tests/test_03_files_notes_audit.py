def _get_resource_id(client, auth_headers) -> str:
    ws_id = client.get("/api/workspaces", headers=auth_headers).json()[0]["id"]
    return client.get(f"/api/workspaces/{ws_id}/resources", headers=auth_headers).json()[0]["id"]


def test_file_upload_download_roundtrip(client, auth_headers):
    res_id = _get_resource_id(client, auth_headers)
    files = {"upload": ("notes.txt", b"hello from a test file", "text/plain")}
    resp = client.post(f"/api/resources/{res_id}/files", headers=auth_headers, files=files)
    assert resp.status_code == 201
    file_id = resp.json()["id"]

    download = client.get(f"/api/files/{file_id}/download", headers=auth_headers)
    assert download.status_code == 200
    assert download.content == b"hello from a test file"


def test_note_create_update_delete(client, auth_headers):
    res_id = _get_resource_id(client, auth_headers)
    resp = client.post(
        f"/api/resources/{res_id}/notes",
        headers=auth_headers,
        json={"title": "Upgrade checklist", "content": "remember to snapshot first"},
    )
    assert resp.status_code == 201
    note_id = resp.json()["id"]

    updated = client.put(f"/api/notes/{note_id}", headers=auth_headers, json={"content": "updated content"})
    assert updated.status_code == 200
    assert updated.json()["content"] == "updated content"

    listing = client.get(f"/api/resources/{res_id}/notes", headers=auth_headers)
    assert any(n["id"] == note_id for n in listing.json())


def test_resource_audit_trail_recorded(client, auth_headers):
    res_id = _get_resource_id(client, auth_headers)
    audit = client.get(f"/api/resources/{res_id}/audit", headers=auth_headers)
    assert audit.status_code == 200
    actions = {entry["action"] for entry in audit.json()}
    assert "create" in actions


def test_credential_audit_trail_recorded(client, auth_headers):
    res_id = _get_resource_id(client, auth_headers)
    creds = client.get(f"/api/resources/{res_id}/credentials", headers=auth_headers).json()
    cred_id = creds[0]["id"]

    # revealing should be logged
    client.post(f"/api/credentials/{cred_id}/reveal", headers=auth_headers)

    audit = client.get(f"/api/credentials/{cred_id}/audit", headers=auth_headers)
    assert audit.status_code == 200
    actions = [entry["action"] for entry in audit.json()]
    assert "view_secret" in actions
