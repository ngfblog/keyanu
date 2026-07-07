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


def test_workspace_update_delete_custom_type_and_icon(client, auth_headers):
    created = client.post(
        "/api/workspaces",
        headers=auth_headers,
        json={"name": "Portal", "type": "customer portal", "icon": "globe"},
    )
    assert created.status_code == 201
    ws_id = created.json()["id"]
    assert created.json()["type"] == "customer portal"
    assert created.json()["icon"] == "globe"

    renamed = client.put(
        f"/api/workspaces/{ws_id}",
        headers=auth_headers,
        json={"name": "Renamed Portal", "type": "app", "icon": "app"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Renamed Portal"
    assert renamed.json()["type"] == "app"
    assert renamed.json()["icon"] == "app"

    deleted = client.delete(f"/api/workspaces/{ws_id}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/workspaces/{ws_id}", headers=auth_headers).status_code == 404


def test_resource_custom_type_website_and_icon(client, auth_headers):
    ws_id = _get_workspace_id(client, auth_headers)
    website = client.post(
        f"/api/workspaces/{ws_id}/resources",
        headers=auth_headers,
        json={"name": "Docs", "type": "website", "icon": "globe"},
    )
    assert website.status_code == 201
    assert website.json()["type"] == "website"
    assert website.json()["icon"] == "globe"

    res_id = website.json()["id"]
    custom = client.put(
        f"/api/resources/{res_id}",
        headers=auth_headers,
        json={"type": "message broker", "icon": "network"},
    )
    assert custom.status_code == 200
    assert custom.json()["type"] == "message broker"
    assert custom.json()["icon"] == "network"


def test_custom_icon_upload_and_assignment(client, auth_headers):
    files = {"upload": ("icon.svg", b'<svg xmlns="http://www.w3.org/2000/svg"></svg>', "image/svg+xml")}
    uploaded = client.post("/api/icons/upload", headers=auth_headers, files=files)
    assert uploaded.status_code == 200
    icon_ref = uploaded.json()["icon"]
    assert icon_ref.startswith("custom:")

    fetched = client.get(uploaded.json()["url"])
    assert fetched.status_code == 200
    assert fetched.headers["content-type"].startswith("image/svg+xml")

    created = client.post(
        "/api/workspaces",
        headers=auth_headers,
        json={"name": "Custom Icon Workspace", "icon": icon_ref},
    )
    assert created.status_code == 201
    assert created.json()["icon"] == icon_ref


def test_custom_icon_upload_validates_type_and_size(client, auth_headers):
    bad_type = client.post(
        "/api/icons/upload",
        headers=auth_headers,
        files={"upload": ("icon.txt", b"not an icon", "text/plain")},
    )
    assert bad_type.status_code == 400

    too_large = client.post(
        "/api/icons/upload",
        headers=auth_headers,
        files={"upload": ("icon.png", b"0" * (1024 * 1024 + 1), "image/png")},
    )
    assert too_large.status_code == 413
