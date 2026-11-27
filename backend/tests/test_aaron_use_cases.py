from tests.helpers import register_user, create_event


def test_poll_create_vote_and_list(client):
    headers = register_user(client)
    event = create_event(client, headers)
    event_id = event["id"]
    client.cookies.clear()

    created = client.post(
        f"/api/aaron/events/{event_id}/polls",
        json={"question": "Which day?", "category": "Schedule", "options": ["Friday", "Saturday"]},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    poll = created.json()
    assert poll["tally"] == {"Friday": 0, "Saturday": 0}

    voted = client.post(
        f"/api/aaron/events/{event_id}/polls/{poll['id']}/votes",
        json={"option": "Friday"},
    )
    assert voted.status_code == 200, voted.text
    assert voted.json()["tally"]["Friday"] == 1
    assert "tentative_poll_voter" in client.cookies

    changed = client.post(
        f"/api/aaron/events/{event_id}/polls/{poll['id']}/votes",
        json={"option": "Saturday"},
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["tally"] == {"Friday": 0, "Saturday": 1}

    # A second browser gets a distinct server-issued identity, even if a user
    # could submit the same display name as the first browser.
    client.cookies.clear()
    second_browser_vote = client.post(
        f"/api/aaron/events/{event_id}/polls/{poll['id']}/votes",
        json={"option": "Friday", "voter_name": "Jordan"},
    )
    assert second_browser_vote.status_code == 200, second_browser_vote.text
    assert second_browser_vote.json()["tally"] == {"Friday": 1, "Saturday": 1}

    # A blank/whitespace cookie is ignored and replaced with a fresh server token.
    client.cookies.clear()
    blank_cookie_vote = client.post(
        f"/api/aaron/events/{event_id}/polls/{poll['id']}/votes",
        json={"option": "Friday"},
        headers={"Cookie": "tentative_poll_voter=   "},
    )
    assert blank_cookie_vote.status_code == 200, blank_cookie_vote.text
    assert client.cookies.get("tentative_poll_voter", "").strip()
    assert blank_cookie_vote.json()["tally"] == {"Friday": 2, "Saturday": 1}
    assert len(client.get(f"/api/aaron/events/{event_id}/polls").json()) == 1

    # Canceled events close poll voting.
    assert client.post(f"/api/events/{event_id}/cancel", headers=headers).status_code == 200
    canceled_vote = client.post(
        f"/api/aaron/events/{event_id}/polls/{poll['id']}/votes",
        json={"option": "Saturday"},
    )
    assert canceled_vote.status_code == 400
    assert canceled_vote.json()["detail"] == "Polls are closed for canceled events."


def test_poll_validation_and_host_auth(client):
    headers = register_user(client)
    event = create_event(client, headers)
    event_id = event["id"]
    client.cookies.clear()

    missing_auth = client.post(
        f"/api/aaron/events/{event_id}/polls",
        json={"question": "Choice?", "options": ["A", "B"]},
    )
    assert missing_auth.status_code == 401

    invalid_options = client.post(
        f"/api/aaron/events/{event_id}/polls",
        json={"question": "Choice?", "options": ["A", "a"]},
        headers=headers,
    )
    assert invalid_options.status_code == 400


def test_event_backup_requires_owner_and_excludes_secret_fields(client):
    headers = register_user(client)
    event = create_event(client, headers)
    event_id = event["id"]
    client.cookies.clear()

    denied = client.get(f"/api/aaron/events/{event_id}/backup.json")
    assert denied.status_code == 401

    backup_response = client.get(f"/api/aaron/events/{event_id}/backup.json", headers=headers)
    assert backup_response.status_code == 200, backup_response.text
    data = backup_response.json()
    assert data["status"] == "BACKUP_CREATED"
    assert data["payload"]["event"]["title"] == event["title"]
    assert len(data["checksum"]) == 64
    serialized = backup_response.text.lower()
    for secret_key in ("phone", "response_token", "edit_token", "encrypted_phone"):
        assert secret_key not in serialized
