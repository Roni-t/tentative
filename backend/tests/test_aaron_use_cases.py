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
        json={"voter_name": "Jordan", "option": "Friday"},
    )
    assert voted.status_code == 200, voted.text
    assert voted.json()["tally"]["Friday"] == 1

    changed = client.post(
        f"/api/aaron/events/{event_id}/polls/{poll['id']}/votes",
        json={"voter_name": "jordan", "option": "Saturday"},
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["tally"] == {"Friday": 0, "Saturday": 1}
    assert len(client.get(f"/api/aaron/events/{event_id}/polls").json()) == 1


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
