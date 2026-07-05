def test_preferences_default_theme_is_system(client, auth_headers):
    resp = client.get("/api/settings/preferences", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["theme"] == "system"


def test_preferences_theme_update_persists(client, auth_headers):
    resp = client.put("/api/settings/preferences", headers=auth_headers, json={"theme": "light"})
    assert resp.status_code == 200
    assert resp.json()["theme"] == "light"

    # Persisted -- a fresh GET reflects it, not just the PUT response.
    check = client.get("/api/settings/preferences", headers=auth_headers)
    assert check.json()["theme"] == "light"

    # And it survives a fresh login (new session), not just this token.
    login = client.post("/api/auth/login", json={"username": "admin", "password": "Sup3rSecret!"})
    new_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    persisted = client.get("/api/settings/preferences", headers=new_headers)
    assert persisted.json()["theme"] == "light"

    # Reset to system for the rest of the suite / manual testing consistency.
    client.put("/api/settings/preferences", headers=auth_headers, json={"theme": "system"})


def test_preferences_theme_rejects_invalid_value(client, auth_headers):
    resp = client.put("/api/settings/preferences", headers=auth_headers, json={"theme": "solarized"})
    assert resp.status_code == 422
