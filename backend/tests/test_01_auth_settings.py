

def test_about_version_comes_from_configuration(client):
    response = client.get("/api/settings/about")
    assert response.status_code == 200
    assert response.json()["version"] == "0.2.0"
