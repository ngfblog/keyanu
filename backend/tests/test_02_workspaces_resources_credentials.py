def test_create_workspace(client, auth_headers):
    resp = client.post("/api/workspaces", headers=auth_headers, json={"name": "Home Lab", "description": "test"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Home Lab"
    assert data["resource_count"] == 0


def _get_workspace_id(client, auth_headers) -> str:
    resp = client.get("/api/workspaces", headers=auth_headers)
    return resp.json()[0]["id"]


def test_create_resource(client, auth_headers):
    ws_id = _get_workspace_id(client, auth_headers)
    resp = client.post(
        f"/api/workspaces/{ws_id}/resources",
        headers=auth_headers,
        json={"name": "pfSense Firewall", "type": "pfsense", "hostname": "10.0.0.1"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "pfsense"
    assert data["credential_count"] == 0


def _get_resource_id(client, auth_headers) -> str:
    ws_id = _get_workspace_id(client, auth_headers)
    resp = client.get(f"/api/workspaces/{ws_id}/resources", headers=auth_headers)
    return resp.json()[0]["id"]


def test_resource_detail_includes_breadcrumb(client, auth_headers):
    res_id = _get_resource_id(client, auth_headers)
    resp = client.get(f"/api/resources/{res_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["workspace_name"] == "Home Lab"


def test_credential_create_encrypted_and_reveal(client, auth_headers):
    res_id = _get_resource_id(client, auth_headers)
    resp = client.post(
        f"/api/resources/{res_id}/credentials",
        headers=auth_headers,
        json={
            "name": "Admin login",
            "template": "password",
            "fields": {"username": "root", "password": "hunter2"},
        },
    )
    assert resp.status_code == 201
    cred = resp.json()
    assert cred["summary"] == "root"
    assert "encrypted_data" not in cred  # never leaked in the read schema

    reveal = client.post(f"/api/credentials/{cred['id']}/reveal", headers=auth_headers)
    assert reveal.status_code == 200
    assert reveal.json()["fields"] == {"username": "root", "password": "hunter2"}


def test_credential_detail_endpoint_has_full_breadcrumb(client, auth_headers):
    res_id = _get_resource_id(client, auth_headers)
    creds = client.get(f"/api/resources/{res_id}/credentials", headers=auth_headers).json()
    cred_id = creds[0]["id"]

    detail = client.get(f"/api/credentials/{cred_id}", headers=auth_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["resource_name"] == "pfSense Firewall"
    assert body["workspace_name"] == "Home Lab"


def test_credential_rename(client, auth_headers):
    res_id = _get_resource_id(client, auth_headers)
    creds = client.get(f"/api/resources/{res_id}/credentials", headers=auth_headers).json()
    cred_id = creds[0]["id"]

    resp = client.put(f"/api/credentials/{cred_id}", headers=auth_headers, json={"name": "Root SSH"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Root SSH"


def test_unauthenticated_requests_are_rejected(client):
    resp = client.get("/api/workspaces")
    assert resp.status_code == 401
