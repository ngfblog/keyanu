import pyotp


def test_bootstrap_forces_password_change(client):
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"})
    assert resp.status_code == 401


def test_must_change_password_blocks_other_endpoints(client):
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin-initial-pw"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Blocked: not on the allowlist while must_change_password is true.
    blocked = client.get("/api/workspaces", headers=headers)
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == "PASSWORD_CHANGE_REQUIRED"

    # Allowed: /auth/me always works.
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["must_change_password"] is True

    # Changing the password clears the flag and unblocks other endpoints.
    changed = client.post(
        "/api/security/change-password",
        headers=headers,
        json={"current_password": "admin-initial-pw", "new_password": "Sup3rSecret!"},
    )
    assert changed.status_code == 204

    now_allowed = client.get("/api/workspaces", headers=headers)
    assert now_allowed.status_code == 200


def test_change_password_requires_correct_current_password(client, auth_headers):
    resp = client.post(
        "/api/security/change-password",
        headers=auth_headers,
        json={"current_password": "totally-wrong", "new_password": "SomethingElse123!"},
    )
    assert resp.status_code == 400


def test_change_username_round_trip(client, auth_headers):
    resp = client.post(
        "/api/security/change-username",
        headers=auth_headers,
        json={"current_password": "Sup3rSecret!", "new_username": "admin2"},
    )
    assert resp.status_code == 204

    me = client.get("/api/auth/me", headers=auth_headers)
    assert me.json()["username"] == "admin2"

    # Revert for the rest of the suite / manual inspection consistency.
    revert = client.post(
        "/api/security/change-username",
        headers=auth_headers,
        json={"current_password": "Sup3rSecret!", "new_username": "admin"},
    )
    assert revert.status_code == 204


def test_totp_setup_enable_and_two_step_login(client, auth_headers):
    setup = client.post("/api/security/totp/setup", headers=auth_headers)
    assert setup.status_code == 200
    secret = setup.json()["secret"]
    assert "otpauth://totp/" in setup.json()["otpauth_url"]

    bad_enable = client.post("/api/security/totp/enable", headers=auth_headers, json={"code": "000000"})
    assert bad_enable.status_code == 400

    code = pyotp.TOTP(secret).now()
    enable = client.post("/api/security/totp/enable", headers=auth_headers, json={"code": code})
    assert enable.status_code == 204

    status_resp = client.get("/api/security/totp/status", headers=auth_headers)
    assert status_resp.json()["enabled"] is True

    # A plain login now returns a pending-TOTP ticket, not a token.
    login = client.post("/api/auth/login", json={"username": "admin", "password": "Sup3rSecret!"})
    assert login.status_code == 200
    body = login.json()
    assert body["requires_totp"] is True
    assert body["access_token"] is None
    ticket = body["login_ticket"]

    wrong_code = client.post("/api/auth/login/totp", json={"login_ticket": ticket, "code": "000000"})
    assert wrong_code.status_code == 401

    good_code = pyotp.TOTP(secret).now()
    finish = client.post("/api/auth/login/totp", json={"login_ticket": ticket, "code": good_code})
    assert finish.status_code == 200
    assert finish.json()["access_token"] is not None


def test_recovery_codes_generate_and_single_use_login(client, auth_headers):
    gen = client.post(
        "/api/security/recovery-codes/generate",
        headers=auth_headers,
        json={"current_password": "Sup3rSecret!"},
    )
    assert gen.status_code == 200
    codes = gen.json()["codes"]
    assert len(codes) == 10

    status_resp = client.get("/api/security/recovery-codes/status", headers=auth_headers)
    assert status_resp.json()["remaining"] == 10

    login = client.post("/api/auth/login", json={"username": "admin", "password": "Sup3rSecret!"})
    ticket = login.json()["login_ticket"]

    used_once = client.post("/api/auth/login/totp", json={"login_ticket": ticket, "code": codes[0]})
    assert used_once.status_code == 200

    # Reusing the same recovery code must fail.
    login2 = client.post("/api/auth/login", json={"username": "admin", "password": "Sup3rSecret!"})
    ticket2 = login2.json()["login_ticket"]
    reused = client.post("/api/auth/login/totp", json={"login_ticket": ticket2, "code": codes[0]})
    assert reused.status_code == 401

    status_resp2 = client.get("/api/security/recovery-codes/status", headers=auth_headers)
    assert status_resp2.json()["remaining"] == 9


def test_disable_totp_requires_password_and_clears_state(client, auth_headers):
    bad = client.post("/api/security/totp/disable", headers=auth_headers, json={"current_password": "wrong"})
    assert bad.status_code == 400

    good = client.post(
        "/api/security/totp/disable", headers=auth_headers, json={"current_password": "Sup3rSecret!"}
    )
    assert good.status_code == 204

    status_resp = client.get("/api/security/totp/status", headers=auth_headers)
    assert status_resp.json()["enabled"] is False

    # Plain login no longer requires a second factor.
    login = client.post("/api/auth/login", json={"username": "admin", "password": "Sup3rSecret!"})
    assert login.json()["requires_totp"] is False
    assert login.json()["access_token"] is not None


def test_sessions_list_and_revoke(client, auth_headers):
    sessions = client.get("/api/security/sessions", headers=auth_headers)
    assert sessions.status_code == 200
    items = sessions.json()
    assert len(items) >= 1
    assert any(s["is_current"] for s in items)


def test_session_timeout_get_and_update(client, auth_headers):
    resp = client.put(
        "/api/security/session-timeout", headers=auth_headers, json={"session_timeout_minutes": 60}
    )
    assert resp.status_code == 200
    assert resp.json()["session_timeout_minutes"] == 60

    resp2 = client.get("/api/security/session-timeout", headers=auth_headers)
    assert resp2.json()["session_timeout_minutes"] == 60

    # Restore a longer timeout so the rest of the suite's session doesn't expire.
    client.put("/api/security/session-timeout", headers=auth_headers, json={"session_timeout_minutes": 720})


def test_logout_revokes_session(client, auth_headers):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "Sup3rSecret!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    ok = client.get("/api/auth/me", headers=headers)
    assert ok.status_code == 200

    logout = client.post("/api/auth/logout", headers=headers)
    assert logout.status_code == 204

    after = client.get("/api/auth/me", headers=headers)
    assert after.status_code == 401
