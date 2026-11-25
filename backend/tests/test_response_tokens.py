"""A response token belongs to one response on one event, and an account has one response per event."""
import pytest

from tests.helpers import add_invitee, create_event, register_user

SLOT = [{"start_time": "2026-12-05T01:00:00Z", "end_time": "2026-12-05T02:00:00Z"}]
OTHER_SLOT = [{"start_time": "2026-12-05T02:00:00Z", "end_time": "2026-12-05T03:00:00Z"}]


@pytest.fixture
def host(client):
    headers = register_user(client, phone="+19725550142", name="Test Host")
    client.cookies.clear()
    return headers


@pytest.fixture
def member(client):
    headers = register_user(client, phone="+14695550150", name="Mia Member")
    client.cookies.clear()
    return headers


def respond(client, event, name, slots, token=None, headers=None):
    """Save availability with no cookies, so only the token and login passed in identify the person."""
    client.cookies.clear()
    body = {"participant_name": name, "slots": slots}
    if token:
        body["edit_token"] = token
    res = client.post(f"/api/events/{event['id']}/availability", json=body, headers=headers or {})
    client.cookies.clear()
    assert res.status_code == 200, res.text
    return res.json()["edit_token"]


def my_starts(client, event, token=None, headers=None):
    client.cookies.clear()
    params = {"edit_token": token} if token else {}
    res = client.get(f"/api/events/{event['id']}/availability/me", params=params, headers=headers or {})
    assert res.status_code == 200, res.text
    return [s["start_time"][:16] for s in res.json()]


def invitee_names(client, event, host):
    return [i["name"] for i in client.get(f"/api/events/{event['id']}/invitees", headers=host).json()]


def respondents(client, event):
    return client.get(f"/api/events/{event['id']}/heatmap?refresh=true").json()["total_respondents"]


# ------------------------------------------------------------------ one token per event

def test_guest_can_answer_a_second_event_with_the_same_browser_token(client, host):
    first, second = create_event(client, host), create_event(client, host)
    token = respond(client, first, "Gus", SLOT)
    respond(client, second, "Gus", SLOT, token=token)
    assert invitee_names(client, second, host) == ["Gus"]


def test_a_token_from_another_event_is_replaced(client, host):
    first, second = create_event(client, host), create_event(client, host)
    token = respond(client, first, "Gus", SLOT)
    second_token = respond(client, second, "Gus", OTHER_SLOT, token=token)
    assert second_token != token
    assert my_starts(client, first, token) == ["2026-12-05T01:00"]
    assert my_starts(client, second, second_token) == ["2026-12-05T02:00"]


def test_replacement_token_works_for_the_text_opt_in(client, host):
    first, second = create_event(client, host), create_event(client, host)
    token = respond(client, first, "Gus", SLOT)
    second_token = respond(client, second, "Gus", SLOT, token=token)
    code = client.post(f"/api/invite/{second_token}/phone/request-code", json={"phone": "+14695550166"}).json()["dev_code"]
    res = client.post(f"/api/invite/{second_token}/phone/verify", json={"phone": "+14695550166", "code": code})
    assert res.status_code == 200, res.text
    can_text = [client.get(f"/api/events/{e['id']}/invitees", headers=host).json()[0]["can_text"] for e in (first, second)]
    assert can_text == [False, True]


def test_personal_link_token_is_not_reused_on_another_event(client, host):
    first, second = create_event(client, host), create_event(client, host)
    invitee = add_invitee(client, host, first["id"], "Sam")
    token = respond(client, first, "Sam", SLOT, token=invitee["response_token"])
    assert token == invitee["response_token"]
    assert respond(client, second, "Sam", SLOT, token=token) != token


def test_host_token_from_one_event_is_not_reused_on_another(client, host):
    """The host has no invitee row, so their token is only known from their availability."""
    first, second = create_event(client, host), create_event(client, host)
    token = respond(client, first, "Test Host", SLOT, headers=host)
    assert respond(client, second, "Test Host", SLOT, token=token) != token


def test_guest_resubmitting_with_their_token_replaces_their_answer(client, host):
    event = create_event(client, host)
    token = respond(client, event, "Gus", SLOT)
    assert respond(client, event, "Gus", OTHER_SLOT, token=token) == token
    assert my_starts(client, event, token) == ["2026-12-05T02:00"]
    assert respondents(client, event) == 1


# ------------------------------------------------------------------ one response per account

def test_member_answering_from_another_device_replaces_their_answer(client, host, member):
    event = create_event(client, host)
    token = respond(client, event, "Mia Member", SLOT, headers=member)
    assert respond(client, event, "Mia Member", OTHER_SLOT, headers=member) == token
    assert my_starts(client, event, token) == ["2026-12-05T02:00"]
    assert respondents(client, event) == 1
    assert invitee_names(client, event, host) == ["Mia Member"]


def test_member_with_a_token_from_another_event_replaces_their_answer(client, host, member):
    event, other = create_event(client, host), create_event(client, host)
    token = respond(client, event, "Mia Member", SLOT, headers=member)
    other_token = respond(client, other, "Mia Member", SLOT, headers=member)
    assert respond(client, event, "Mia Member", OTHER_SLOT, token=other_token, headers=member) == token


def test_member_who_cleared_their_answer_can_answer_again(client, host, member):
    event = create_event(client, host)
    respond(client, event, "Mia Member", [], headers=member)
    respond(client, event, "Mia Member", SLOT, headers=member)
    assert invitee_names(client, event, host) == ["Mia Member"]


def test_host_answering_from_another_device_replaces_their_answer(client, host):
    event = create_event(client, host)
    token = respond(client, event, "Test Host", SLOT, headers=host)
    assert respond(client, event, "Test Host", OTHER_SLOT, headers=host) == token
    assert respondents(client, event) == 1


def test_member_does_not_overwrite_a_guest_who_used_the_same_browser(client, host, member):
    event = create_event(client, host)
    token = respond(client, event, "Mia Member", SLOT, headers=member)
    guest_token = respond(client, event, "Gus", SLOT)
    assert respond(client, event, "Mia Member", OTHER_SLOT, token=guest_token, headers=member) == token
    assert my_starts(client, event, guest_token) == ["2026-12-05T01:00"]


def test_guest_who_logs_in_keeps_the_same_response_on_another_device(client, host, member):
    event = create_event(client, host)
    token = respond(client, event, "Mia", SLOT)
    respond(client, event, "Mia Member", SLOT, token=token, headers=member)
    assert respond(client, event, "Mia Member", OTHER_SLOT, headers=member) == token
    assert respondents(client, event) == 1


def test_member_can_still_use_a_personal_link(client, host, member):
    event = create_event(client, host)
    invitee = add_invitee(client, host, event["id"], "Sam")
    respond(client, event, "Mia Member", SLOT, headers=member)
    link_token = invitee["response_token"]
    assert respond(client, event, "Sam", OTHER_SLOT, token=link_token, headers=member) == link_token


def test_host_filling_in_for_an_invitee_keeps_their_own_answer_separate(client, host):
    event = create_event(client, host)
    link_token = add_invitee(client, host, event["id"], "Sam")["response_token"]
    respond(client, event, "Sam", SLOT, token=link_token, headers=host)
    own_token = respond(client, event, "Test Host", OTHER_SLOT, headers=host)
    assert own_token != link_token
    assert my_starts(client, event, link_token) == ["2026-12-05T01:00"]


def test_two_accounts_have_separate_responses(client, host, member):
    event = create_event(client, host)
    other = register_user(client, phone="+14695550151", name="Omar Other")
    first = respond(client, event, "Mia Member", SLOT, headers=member)
    assert respond(client, event, "Omar Other", SLOT, headers=other) != first
    assert respondents(client, event) == 2


# ------------------------------------------------------------------ loading saved answers

def test_member_sees_their_saved_answer_on_another_device(client, host, member):
    event = create_event(client, host)
    respond(client, event, "Mia Member", SLOT, headers=member)
    assert my_starts(client, event, headers=member) == ["2026-12-05T01:00"]


def test_without_a_token_or_login_no_saved_answer_is_shown(client, host, member):
    event = create_event(client, host)
    respond(client, event, "Mia Member", SLOT, headers=member)
    assert my_starts(client, event) == []
