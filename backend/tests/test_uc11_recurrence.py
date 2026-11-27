"""UC-11 Host can set recurring events (FR-1, owner: Aaron). Tests written by Divyam.

Shared event: first candidate date 2026-12-02 (a Wednesday), America/Chicago.
"""
from tests.helpers import create_event, register_user

HOST = "+19725550311"
OTHER = "+19725550312"


def put_rule(client, event_id, headers, frequency="weekly", days=("WE",), end="2026-12-30"):
    return client.put(
        f"/api/events/{event_id}/recurrence",
        json={"frequency": frequency, "days_of_week": list(days), "end_date": end},
        headers=headers,
    )


def test_uc11_01_weekly_series_saved_and_listed(client, db_session):
    """Main flow: weekly on Wednesdays until Dec 30 -> 5 meetings, readable by anyone."""
    host = register_user(client, HOST, "Host")
    event = create_event(client, host)

    res = put_rule(client, event["id"], host)

    assert res.status_code == 200, res.text
    assert res.json()["occurrences"] == ["2026-12-02", "2026-12-09", "2026-12-16", "2026-12-23", "2026-12-30"]
    public = client.get(f"/api/events/{event['id']}/recurrence").json()
    assert public["is_recurring"] is True and public["frequency"] == "weekly"


def test_uc11_02_biweekly_multiple_days(client, db_session):
    """Alternate flow: every other week on Wednesday and Friday."""
    host = register_user(client, HOST, "Host")
    event = create_event(client, host)

    res = put_rule(client, event["id"], host, frequency="biweekly", days=("FR", "WE"), end="2026-12-31")

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["days_of_week"] == ["WE", "FR"]
    assert body["occurrences"] == ["2026-12-02", "2026-12-04", "2026-12-16", "2026-12-18", "2026-12-30"]


def test_uc11_weekly_multiple_days_returns_full_series(client, db_session):
    host = register_user(client, HOST, "Host")
    event = create_event(client, host)

    res = put_rule(client, event["id"], host, days=("MO", "TU"), end="2027-12-02")

    assert res.status_code == 200, res.text
    occurrences = res.json()["occurrences"]
    assert len(occurrences) == 104
    assert occurrences[0] == "2026-12-07"
    assert occurrences[-1] == "2027-11-30"
    assert len(occurrences) == len(set(occurrences))


def test_uc11_03_invalid_inputs_rejected(client, db_session):
    """Invalid input: bad frequency, no days, unknown day, end date not after the first meeting."""
    host = register_user(client, HOST, "Host")
    event = create_event(client, host)

    cases = [
        ({"frequency": "daily"}, "Frequency must be 'weekly' or 'biweekly'."),
        ({"days": ()}, "Pick at least one day of the week."),
        ({"days": ("XX",)}, "Unknown day code: XX. Use MO, TU, WE, TH, FR, SA, SU."),
        ({"end": "2026-12-02"}, "End date must be after the first meeting date."),
        ({"end": "2028-01-01"}, "A recurring series can last at most one year."),
    ]
    for kwargs, message in cases:
        res = put_rule(client, event["id"], host, **kwargs)
        assert res.status_code == 400, (kwargs, res.text)
        assert res.json()["detail"] == message


def test_uc11_04_only_host_or_cohost_can_set(client, db_session):
    """Exception: a logged-in user who is not host or co-host gets 403; a co-host succeeds."""
    host = register_user(client, HOST, "Host")
    other = register_user(client, OTHER, "Other")
    event = create_event(client, host)

    denied = put_rule(client, event["id"], other)
    assert denied.status_code == 403
    assert denied.json()["detail"] == "Only the host or a co-host can change the recurrence."

    client.post(f"/api/events/{event['id']}/cohosts", json={"identifier": OTHER}, headers=host)
    assert put_rule(client, event["id"], other).status_code == 200


def test_uc11_05_remove_and_canceled_event(client, db_session):
    """Removing the rule stops the series; a canceled event cannot get a new recurrence."""
    host = register_user(client, HOST, "Host")
    event = create_event(client, host)
    put_rule(client, event["id"], host)

    removed = client.delete(f"/api/events/{event['id']}/recurrence", headers=host)
    assert removed.status_code == 200 and removed.json()["is_recurring"] is False

    client.post(f"/api/events/{event['id']}/cancel", headers=host)
    res = put_rule(client, event["id"], host)
    assert res.status_code == 400
    assert res.json()["detail"] == "Cannot set a recurrence on a canceled event."
