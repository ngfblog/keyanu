import pytest


@pytest.fixture(scope="module")
def search_fixture_resource_id(client, auth_headers):
    ws = client.post(
        "/api/workspaces", headers=auth_headers, json={"name": "Search Fixtures Workspace"}
    ).json()
    res = client.post(
        f"/api/workspaces/{ws['id']}/resources",
        headers=auth_headers,
        json={"name": "SearchTargetSystem", "type": "cloudflare", "hostname": "searchtarget.example"},
    ).json()
    client.post(
        f"/api/resources/{res['id']}/credentials",
        headers=auth_headers,
        json={"name": "SearchTargetCredential", "template": "api_token", "fields": {"token": "abc123"}},
    )
    client.post(
        f"/api/resources/{res['id']}/notes",
        headers=auth_headers,
        json={"title": "Unrelated title", "content": "contains the word searchtargetphrase in the body"},
    )
    files = {"upload": ("searchtargetfile.txt", b"contents", "text/plain")}
    client.post(f"/api/resources/{res['id']}/files", headers=auth_headers, files=files)
    return res["id"]


def test_search_finds_resource_by_name(client, auth_headers, search_fixture_resource_id):
    resp = client.get("/api/search", params={"q": "SearchTargetSystem"}, headers=auth_headers)
    assert resp.status_code == 200
    names = [r["name"] for r in resp.json()["resources"]]
    assert "SearchTargetSystem" in names


def test_search_finds_credential_by_name(client, auth_headers, search_fixture_resource_id):
    resp = client.get("/api/search", params={"q": "SearchTargetCredential"}, headers=auth_headers)
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()["credentials"]]
    assert "SearchTargetCredential" in names


def test_search_matches_note_content_not_just_title(client, auth_headers, search_fixture_resource_id):
    resp = client.get("/api/search", params={"q": "searchtargetphrase"}, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["notes"]) >= 1
    assert resp.json()["notes"][0]["title"] == "Unrelated title"


def test_search_matches_filename(client, auth_headers, search_fixture_resource_id):
    resp = client.get("/api/search", params={"q": "searchtargetfile"}, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["files"]) >= 1


def test_search_no_match_returns_empty_lists(client, auth_headers):
    resp = client.get("/api/search", params={"q": "zzz_no_such_thing_zzz"}, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body == {
        "query": "zzz_no_such_thing_zzz",
        "resources": [],
        "credentials": [],
        "files": [],
        "notes": [],
    }


def test_search_requires_auth(client):
    resp = client.get("/api/search", params={"q": "pfSense"})
    assert resp.status_code == 401
