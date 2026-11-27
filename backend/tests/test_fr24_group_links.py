"""FR-24 Shareable URLs for groups of events (owner: Daniel). Tests written by Divyam."""
from tests.helpers import create_event, register_user

HOST = "+19725550331"
OTHER = "+19725550332"


def make_group(client, headers, event_ids, name="CS 3354 meetings"):
    return client.post("/api/groups", json={"name": name, "event_ids": event_ids}, headers=headers)


def test_fr24_01_group_link_lists_events(client, db_session):
    """Main flow: a host groups two events; anyone with the link sees both, each with its own response link."""
    host = register_user(client, HOST, "Host")
    a = create_event(client, host, title="Standup")
    b = create_event(client, host, title="Retro")

    res = make_group(client, host, [a["id"], b["id"]])
    assert res.status_code == 201, res.text
    token = res.json()["share_token"]

    client.cookies.clear()
    public = client.get(f"/api/share/group/{token}")
    assert public.status_code == 200
    events = public.json()["events"]
    assert [e["title"] for e in events] == ["Standup", "Retro"]
    assert all(e["share_token"] for e in events)


def test_fr24_02_cannot_group_someone_elses_event(client, db_session):
    """Exception: grouping an event you don't host or co-host is forbidden."""
    host = register_user(client, HOST, "Host")
    event = create_event(client, host)
    other = register_user(client, OTHER, "Other")

    res = make_group(client, other, [event["id"]])

    assert res.status_code == 403
    assert res.json()["detail"] == "You can only group events you host or co-host."


def test_fr24_03_rotation_kills_old_group_link(client, db_session):
    """FR-25 for groups: creator rotates; old link returns 410, new link works; others can't rotate."""
    host = register_user(client, HOST, "Host")
    event = create_event(client, host)
    group = make_group(client, host, [event["id"]]).json()
    other = register_user(client, OTHER, "Other")

    assert client.post(f"/api/groups/{group['id']}/share/rotate", headers=other).status_code == 403
    rotated = client.post(f"/api/groups/{group['id']}/share/rotate", headers=host).json()

    assert client.get(f"/api/share/group/{group['share_token']}").status_code == 410
    assert client.get(f"/api/share/group/{rotated['share_token']}").status_code == 200


def test_fr24_04_event_token_is_not_a_group_link(client, db_session):
    """Invalid input: an event's token used as a group link gets 404."""
    host = register_user(client, HOST, "Host")
    event = create_event(client, host)
    group = make_group(client, host, [event["id"]]).json()
    event_token = group["events"][0]["share_token"]

    res = client.get(f"/api/share/group/{event_token}")

    assert res.status_code == 404
    assert res.json()["detail"] == "This link is not a group link."
