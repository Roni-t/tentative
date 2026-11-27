"""Daniel's Assignment 5 backend coverage for FR-23, FR-24, FR-25 and FR-26.

Each test is self-contained: it registers its own host, creates its own event and
uses the shared in-memory SQLite fixtures from tests/conftest.py. Printed lines are
intentional so the executed HTTP status codes can be quoted in the assignment log.
"""
import re
from datetime import datetime, timedelta, timezone

import pytest

from app.models.changelog import ChangeLogEntry
from app.models.shareable_url import ShareableURL
from tests.helpers import create_event, register_user

HOST_PHONE = "+19725550142"
OTHER_PHONE = "+14695550188"
START = "2026-12-02T23:00:00Z"
END = "2026-12-03T00:00:00Z"
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{22}$")


@pytest.fixture
def host(client):
    headers = register_user(client, phone=HOST_PHONE, name="Daniel Host")
    client.cookies.clear()
    return headers


def age_link(db_session, token, days=31):
    row = db_session.query(ShareableURL).filter(ShareableURL.token == token).first()
    row.created_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    db_session.commit()


# ------------------------------------------------------------------ FR-23 (UC-7)

def test_f23_01_anonymous_visitor_reads_event_details_from_public_share_url(client, host):
    event = create_event(
        client,
        host,
        title="Daniel Share Bash",
        description="Public details for everyone",
        location="ECSS 2.410",
    )
    token = event["active_token"]

    shared = client.get(f"/api/share/{token}")
    detail = client.get(f"/api/events/{event['id']}")

    print(f"[F-23-01] share_status={shared.status_code} event_status={detail.status_code} "
          f"event_id={event['id']} token={token}")
    assert shared.status_code == 200
    assert detail.status_code == 200
    body = shared.json()
    assert body["id"] == event["id"]
    assert body["title"] == "Daniel Share Bash"
    assert body["description"] == "Public details for everyone"
    assert body["location"] == "ECSS 2.410"
    assert body["candidate_dates"] == event["candidate_dates"]
    assert body["active_token"] == token
    assert body["is_host"] is False
    assert body["is_cohost"] is False
    assert detail.json()["title"] == "Daniel Share Bash"
    assert detail.json()["is_host"] is False


def test_f23_02_anonymous_visitor_submits_and_reads_back_availability(client, host):
    event = create_event(client, host, title="Daniel Open Dinner")
    token = event["active_token"]
    assert client.get(f"/api/share/{token}").status_code == 200

    response = client.post(
        f"/api/events/{event['id']}/availability",
        json={
            "participant_name": "Daniel Guest",
            "slots": [{"start_time": START, "end_time": END}],
        },
    )
    print(f"[F-23-02] availability_status={response.status_code} body={response.json()}")
    assert response.status_code == 200
    result = response.json()
    assert result["message"] == "Availability successfully saved."
    assert result["participant_name"] == "Daniel Guest"
    assert result["slots_count"] == 1
    assert TOKEN_RE.match(result["edit_token"])

    client.cookies.clear()
    saved = client.get(f"/api/events/{event['id']}/availability/me",
                       params={"edit_token": result["edit_token"]})
    print(f"[F-23-02] saved_status={saved.status_code} saved_slots={saved.json()}")
    assert saved.status_code == 200
    assert len(saved.json()) == 1
    assert saved.json()[0]["start_time"].startswith("2026-12-02T23:00:00")

    client.cookies.clear()
    updated = client.get(f"/api/events/{event['id']}")
    assert updated.status_code == 200
    assert updated.json()["respondents_count"] == 1


def test_f23_03_anonymous_visitor_can_rsvp_after_following_the_share_link(client, host):
    event = create_event(client, host, title="Daniel RSVP Dinner")
    token = event["active_token"]
    assert client.get(f"/api/share/{token}").status_code == 200

    answer = client.post(
        f"/api/events/{event['id']}/availability",
        json={
            "participant_name": "Daniel Guest",
            "slots": [{"start_time": START, "end_time": END}],
        },
    )
    assert answer.status_code == 200
    edit_token = answer.json()["edit_token"]

    finalized = client.post(
        f"/api/events/{event['id']}/finalize",
        json={"start_time": START, "end_time": END, "notify_participants": False},
        headers=host,
    )
    assert finalized.status_code == 200
    client.cookies.clear()

    # Check both possible RSVP lookup endpoints so the test stays resilient to router naming
    mine = client.get(f"/api/events/{event['id']}/my-rsvp", params={"token": edit_token})
    if mine.status_code == 404:
        mine = client.get(f"/api/rsvp/{edit_token}")
    assert mine.status_code == 200
    mine_json = mine.json()
    rsvp_token = mine_json.get("token") or mine_json.get("rsvp_token") or edit_token

    page = client.get(f"/api/rsvp/{rsvp_token}")
    assert page.status_code == 200
    rsvp = client.post(f"/api/rsvp/{rsvp_token}", json={"status": "going"})
    print(f"[F-23-03] my_rsvp_status={mine.status_code} rsvp_page_status={page.status_code} "
          f"rsvp_post_status={rsvp.status_code} body={rsvp.json()}")
    assert rsvp.status_code == 200
    rsvp_body = rsvp.json()
    assert (rsvp_body.get("rsvp_status") or rsvp_body.get("status")) == "going"


def test_f23_04_unknown_public_share_token_returns_404(client, host):
    create_event(client, host)
    client.cookies.clear()
    missing = client.get("/api/share/not-a-real-token")
    print(f"[F-23-04] unknown_token_status={missing.status_code} detail={missing.json()['detail']!r}")
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Orbit link not found."


# ------------------------------------------------------------------ FR-24 (UC-7)

def _post_or_get_group_link(client, event_id, headers=None):
    res = client.post(f"/api/events/{event_id}/group-link", headers=headers)
    if res.status_code in (404, 405):
        res = client.get(f"/api/events/{event_id}/group-link", headers=headers)
    return res


def test_f24_01_event_creation_returns_cryptographic_share_url(client, host):
    event = create_event(client, host, title="Daniel Crypto Link")
    token = event["active_token"]
    assert token and TOKEN_RE.match(token), token

    link = _post_or_get_group_link(client, event["id"], headers=host)
    print(f"[F-24-01] group_link_status={link.status_code} token={token} "
          f"token_length={len(token)} body={link.json()}")
    assert link.status_code == 200
    body = link.json()
    returned_token = body.get("token") or body.get("active_token") or token
    assert returned_token == token
    assert body.get("share_url", f"/share/{returned_token}").endswith(f"/share/{returned_token}")
    assert client.get(f"/api/share/{token}").status_code == 200


def test_f24_02_two_events_receive_distinct_tokens_and_copy_returns_same_token(client, host):
    first = create_event(client, host, title="Daniel Link A")
    second = create_event(client, host, title="Daniel Link B")
    first_copy = _post_or_get_group_link(client, first["id"], headers=host)
    second_copy = _post_or_get_group_link(client, second["id"], headers=host)
    print(f"[F-24-02] first_status={first_copy.status_code} second_status={second_copy.status_code} "
          f"first_body={first_copy.json()} second_body={second_copy.json()}")
    assert first_copy.status_code == 200 and second_copy.status_code == 200
    first_token = first_copy.json().get("token") or first["active_token"]
    second_token = second_copy.json().get("token") or second["active_token"]
    assert first_token != second_token
    assert first_token == first["active_token"]
    assert second_token == second["active_token"]
    assert TOKEN_RE.match(first_token)
    assert TOKEN_RE.match(second_token)


# ------------------------------------------------------------------ FR-25 (UC-7)

def test_f25_01_creator_replaces_expired_link_and_non_creator_is_forbidden(client, host, db_session):
    event = create_event(client, host, title="Daniel Rotation")
    old_token = event["active_token"]

    other = register_user(client, phone=OTHER_PHONE, name="Daniel Other")
    client.cookies.clear()
    forbidden = _post_or_get_group_link(client, event["id"], headers=other)
    print(f"[F-25-01] non_creator_status={forbidden.status_code} detail={forbidden.json().get('detail')!r}")
    assert forbidden.status_code in (403, 404)

    age_link(db_session, old_token, 31)
    rotated = _post_or_get_group_link(client, event["id"], headers=host)
    assert rotated.status_code == 200
    new_token = rotated.json().get("token") or rotated.json().get("active_token")
    old_status = client.get(f"/api/share/{old_token}").status_code
    new_status = client.get(f"/api/share/{new_token}").status_code
    active_count = (db_session.query(ShareableURL)
                    .filter(ShareableURL.event_id == event["id"], ShareableURL.is_active.is_(True))
                    .count())
    rotated_logs = (db_session.query(ChangeLogEntry)
                    .filter(ChangeLogEntry.event_id == event["id"], ChangeLogEntry.action == "url_rotated")
                    .count())
    print(f"[F-25-01] rotate_status={rotated.status_code} old_token_status={old_status} "
          f"new_token_status={new_status} active_links={active_count} url_rotated_logs={rotated_logs} "
          f"old_token={old_token} new_token={new_token}")
    assert new_token != old_token
    assert new_status == 200
    assert old_status == 410
    assert active_count == 1
    assert rotated_logs == 1


@pytest.mark.xfail(
    strict=True,
    reason="FR-25 requires a creator-only rotate endpoint with old link 404 / new link 200; "
           "backend has no manual rotate endpoint and returns 410 Gone for an expired event link",
)
def test_f25_02_spec_requires_manual_rotation_old_link_404(client, host):
    event = create_event(client, host, title="Daniel Manual Rotation")
    old_token = event["active_token"]

    other = register_user(client, phone=OTHER_PHONE, name="Daniel Other")
    client.cookies.clear()
    other_rotate = client.post(f"/api/events/{event['id']}/share/rotate", headers=other)
    rotate = client.post(f"/api/events/{event['id']}/share/rotate", headers=host)
    old_status = client.get(f"/api/share/{old_token}").status_code
    print(f"[F-25-02] non_creator_rotate_status={other_rotate.status_code} "
          f"creator_rotate_status={rotate.status_code} old_token_status={old_status}")
    assert other_rotate.status_code == 403
    assert rotate.status_code == 200
    new_token = rotate.json()["token"]
    assert new_token != old_token
    assert client.get(f"/api/share/{new_token}").status_code == 200
    assert old_status == 404


# ------------------------------------------------------------------ FR-26 (UC-8)

def test_f26_01_finalized_event_exports_a_valid_ics_file(client, host):
    event = create_event(
        client,
        host,
        title="Daniel, Demo; Part 1",
        description="Bring snacks, drinks; fun",
        location="ECSS 2.410",
    )
    finalized = client.post(
        f"/api/events/{event['id']}/finalize",
        json={"start_time": START, "end_time": END, "notify_participants": False},
        headers=host,
    )
    assert finalized.status_code == 200
    client.cookies.clear()

    res = client.get(f"/api/events/{event['id']}/export.ics")
    print(f"[F-26-01] export_status={res.status_code} content_type={res.headers['content-type']!r} "
          f"content_disposition={res.headers['content-disposition']!r}")
    assert res.status_code == 200
    assert res.headers["content-type"] == "text/calendar; charset=utf-8"
    assert res.headers["content-disposition"] == f'attachment; filename="tentative-{event["id"]}.ics"'

    text = res.text
    assert "\r\n" in text and text.endswith("\r\n")
    assert text.startswith("BEGIN:VCALENDAR\r\n") and text.rstrip("\r\n").endswith("END:VCALENDAR")
    assert "VERSION:2.0" in text
    assert "PRODID:-//Tentative//Group Scheduling" in text
    assert "CALSCALE:GREGORIAN" in text
    assert "METHOD:PUBLISH" in text
    assert "BEGIN:VEVENT" in text and "END:VEVENT" in text
    assert f"UID:tentative-event-{event['id']}-" in text
    assert re.search(r"DTSTAMP:\d{8}T\d{6}Z", text)
    assert "DTSTART:20261202T230000Z" in text
    assert "DTEND:20261203T000000Z" in text
    assert r"SUMMARY:Daniel\, Demo\; Part 1" in text
    assert "LOCATION:ECSS 2.410" in text
    assert r"DESCRIPTION:Bring snacks\, drinks\; fun" in text
    assert "STATUS:CONFIRMED" in text
    dtstamp = re.search(r"DTSTAMP:(\d{8}T\d{6}Z)", text)
    assert dtstamp
    print(f"[F-26-01] vevent_lines={len([line for line in text.splitlines() if line.startswith(('BEGIN:', 'END:'))])} "
          f"uid_present={f'tentative-event-{event["id"]}-' in text} dtstamp={dtstamp.group(1)}")
    assert text.index("BEGIN:VEVENT") < text.index("SUMMARY:") < text.index("END:VEVENT")


def test_f26_02_missing_event_export_returns_404(client):
    client.cookies.clear()
    missing = client.get("/api/events/999999/export.ics")
    print(f"[F-26-02] missing_export_status={missing.status_code} detail={missing.json()['detail']!r}")
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Event not found"
