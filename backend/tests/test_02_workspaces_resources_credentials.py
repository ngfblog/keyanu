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


def test_move_resource_preserves_related_data_and_audit(client, auth_headers):
    workspace_a = client.post(
        "/api/workspaces", headers=auth_headers, json={"name": "Infrastructure"}
    ).json()
    workspace_b = client.post(
        "/api/workspaces", headers=auth_headers, json={"name": "Network"}
    ).json()

    created = client.post(
        f"/api/workspaces/{workspace_a['id']}/resources",
        headers=auth_headers,
        json={"name": "pfSense", "type": "pfsense", "hostname": "10.0.0.1"},
    )
    assert created.status_code == 201
    resource = created.json()
    resource_id = resource["id"]

    credential = client.post(
        f"/api/resources/{resource_id}/credentials",
        headers=auth_headers,
        json={
            "name": "Admin login",
            "template": "password",
            "fields": {"username": "root", "password": "hunter2"},
        },
    )
    assert credential.status_code == 201

    note = client.post(
        f"/api/resources/{resource_id}/notes",
        headers=auth_headers,
        json={"title": "Runbook", "content": "do not reboot during business hours"},
    )
    assert note.status_code == 201

    file_payload = {"upload": ("config.txt", b"backup config", "text/plain")}
    uploaded_file = client.post(
        f"/api/resources/{resource_id}/files", headers=auth_headers, files=file_payload
    )
    assert uploaded_file.status_code == 201

    icon_payload = {
        "upload": (
            "icon.svg",
            b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>',
            "image/svg+xml",
        )
    }
    uploaded_icon = client.post(
        f"/api/resources/{resource_id}/icon", headers=auth_headers, files=icon_payload
    )
    assert uploaded_icon.status_code == 201
    icon = uploaded_icon.json()["icon"]

    audit_before = client.get(f"/api/resources/{resource_id}/audit", headers=auth_headers).json()
    assert audit_before

    same_workspace = client.post(
        f"/api/resources/{resource_id}/move",
        headers=auth_headers,
        json={"destination_workspace_id": workspace_a["id"]},
    )
    assert same_workspace.status_code == 400
    assert same_workspace.json()["detail"] == "Destination Workspace equals current Workspace"

    missing_workspace = client.post(
        f"/api/resources/{resource_id}/move",
        headers=auth_headers,
        json={"destination_workspace_id": "missing-workspace"},
    )
    assert missing_workspace.status_code == 404
    assert missing_workspace.json()["detail"] == "Destination Workspace not found"

    moved = client.post(
        f"/api/resources/{resource_id}/move",
        headers=auth_headers,
        json={"destination_workspace_id": workspace_b["id"]},
    )
    assert moved.status_code == 200
    assert moved.json()["id"] == resource_id
    assert moved.json()["workspace_id"] == workspace_b["id"]
    assert moved.json()["icon"] == icon

    workspace_a_resources = client.get(
        f"/api/workspaces/{workspace_a['id']}/resources", headers=auth_headers
    ).json()
    workspace_b_resources = client.get(
        f"/api/workspaces/{workspace_b['id']}/resources", headers=auth_headers
    ).json()
    assert all(item["id"] != resource_id for item in workspace_a_resources)
    assert any(item["id"] == resource_id for item in workspace_b_resources)

    detail = client.get(f"/api/resources/{resource_id}", headers=auth_headers).json()
    assert detail["id"] == resource_id
    assert detail["workspace_id"] == workspace_b["id"]
    assert detail["workspace_name"] == "Network"
    assert detail["credential_count"] == 1
    assert detail["file_count"] == 1
    assert detail["note_count"] == 1
    assert detail["icon"] == icon

    creds = client.get(f"/api/resources/{resource_id}/credentials", headers=auth_headers).json()
    assert creds[0]["id"] == credential.json()["id"]
    reveal = client.post(f"/api/credentials/{creds[0]['id']}/reveal", headers=auth_headers)
    assert reveal.json()["fields"] == {"username": "root", "password": "hunter2"}

    notes = client.get(f"/api/resources/{resource_id}/notes", headers=auth_headers).json()
    assert notes[0]["id"] == note.json()["id"]
    files = client.get(f"/api/resources/{resource_id}/files", headers=auth_headers).json()
    assert files[0]["id"] == uploaded_file.json()["id"]

    audit_after = client.get(f"/api/resources/{resource_id}/audit", headers=auth_headers).json()
    actions = [entry["action"] for entry in audit_after]
    assert "move" in actions
    assert set(entry["id"] for entry in audit_before).issubset(
        {entry["id"] for entry in audit_after}
    )
    move_entry = next(entry for entry in audit_after if entry["action"] == "move")
    assert move_entry["entity_name"] == "pfSense"
    assert resource_id == move_entry["entity_id"]
    assert "Infrastructure" in move_entry["detail"]
    assert "Network" in move_entry["detail"]
    assert move_entry["user_id"] is not None
    assert move_entry["created_at"] is not None
