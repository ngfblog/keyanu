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
    return next(resource["id"] for resource in resp.json() if resource["name"] == "pfSense Firewall")


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


def test_credential_update_preserves_unspecified_encrypted_fields(client, auth_headers):
    res_id = _get_resource_id(client, auth_headers)
    created = client.post(
        f"/api/resources/{res_id}/credentials",
        headers=auth_headers,
        json={
            "name": "Runbook note",
            "template": "secure_note",
            "fields": {"title": "Original", "body": "original content", "notes": "unchanged"},
        },
    )
    assert created.status_code == 201
    cred_id = created.json()["id"]

    updated = client.put(
        f"/api/credentials/{cred_id}",
        headers=auth_headers,
        json={"fields": {"body": "updated content"}},
    )
    assert updated.status_code == 200

    reveal = client.post(f"/api/credentials/{cred_id}/reveal", headers=auth_headers)
    assert reveal.status_code == 200
    assert reveal.json()["fields"] == {
        "title": "Original",
        "body": "updated content",
        "notes": "unchanged",
    }

    removed = client.put(
        f"/api/credentials/{cred_id}",
        headers=auth_headers,
        json={"fields": {"notes": None}},
    )
    assert removed.status_code == 200

    reveal_after_remove = client.post(f"/api/credentials/{cred_id}/reveal", headers=auth_headers)
    assert reveal_after_remove.status_code == 200
    assert reveal_after_remove.json()["fields"] == {
        "title": "Original",
        "body": "updated content",
    }


def test_unauthenticated_requests_are_rejected(client):
    resp = client.get("/api/workspaces")
    assert resp.status_code == 401


def test_workspace_icon_upload_serves_custom_icon(client, auth_headers):
    ws_id = _get_workspace_id(client, auth_headers)
    files = {
        "upload": (
            "icon.svg",
            b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>',
            "image/svg+xml",
        )
    }

    resp = client.post(f"/api/workspaces/{ws_id}/icon", headers=auth_headers, files=files)

    assert resp.status_code == 201
    icon = resp.json()["icon"]
    assert icon.startswith("custom:")

    icon_filename = icon.removeprefix("custom:")
    served = client.get(f"/api/icons/{icon_filename}", headers=auth_headers)
    assert served.status_code == 200
    assert served.content == files["upload"][1]


def test_resource_icon_upload_serves_custom_png_icon(client, auth_headers):
    routes = {getattr(route, "path", "") for route in client.app.routes}
    assert "/api/icons/{filename}" in routes

    ws_id = _get_workspace_id(client, auth_headers)
    resource = client.post(
        f"/api/workspaces/{ws_id}/resources",
        headers=auth_headers,
        json={"name": "Icon Test Host", "type": "server", "hostname": "icon-test.local"},
    )
    assert resource.status_code == 201
    res_id = resource.json()["id"]
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc````\x00\x00\x00"
        b"\x05\x00\x01\x0d\x0a-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    files = {"upload": ("icon.png", png_bytes, "image/png")}

    uploaded = client.post(f"/api/resources/{res_id}/icon", headers=auth_headers, files=files)

    assert uploaded.status_code == 201
    icon = uploaded.json()["icon"]
    assert icon.startswith("custom:")
    icon_filename = icon.removeprefix("custom:")

    from app.core.config import settings

    icon_path = settings.icons_dir_path / icon_filename
    assert icon_path.is_file()
    assert icon_path.read_bytes() == png_bytes

    served = client.get(f"/api/icons/{icon_filename}", headers=auth_headers)
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/png"
    assert served.content == png_bytes


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
