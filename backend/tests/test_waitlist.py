from tests.helpers import register_user
def test_capacity_limit_and_waitlist_auto_promotion(client, db_session):
    # Host creates event with capacity limit = 2
    phone = "+19725550142"
    headers = register_user(client, phone=phone, name="Test Host")

    create_resp = client.post("/api/events", json={
        "title": "VIP Orbit Summit",
        "candidate_dates": ["2026-11-28"],
        "capacity_limit": 2
    }, headers=headers)
    event_id = create_resp.json()["id"]

    # Participant 1 RSVPs Going
    client.cookies.clear()
    p1 = client.post(f"/api/events/{event_id}/rsvp", json={
        "participant_name": "Sarah Connor",
        "status": "going"
    }).json()
    assert p1["status"] == "going"
    assert p1["waitlist_position"] is None

    # Participant 2 RSVPs Going
    client.cookies.clear()
    p2 = client.post(f"/api/events/{event_id}/rsvp", json={
        "participant_name": "John Connor",
        "status": "going"
    }).json()
    assert p2["status"] == "going"
    assert p2["waitlist_position"] is None

    # Participant 3 RSVPs Going -> Capacity full! Assigned to waitlist (Rank 1)
    client.cookies.clear()
    p3 = client.post(f"/api/events/{event_id}/rsvp", json={
        "participant_name": "Kyle Reese",
        "status": "going"
    }).json()
    assert p3["status"] == "waitlisted"
    assert p3["waitlist_position"] == 1

    # Participant 4 RSVPs Going -> Waitlisted (Rank 2)
    client.cookies.clear()
    p4 = client.post(f"/api/events/{event_id}/rsvp", json={
        "participant_name": "Miles Dyson",
        "status": "going"
    }).json()
    assert p4["status"] == "waitlisted"
    assert p4["waitlist_position"] == 2

    # Check RSVP Summary
    summary = client.get(f"/api/events/{event_id}/rsvp").json()
    assert summary["count_going"] == 2
    assert summary["count_waitlisted"] == 2

    # Now Sarah Connor (p1) changes status to "not_going"
    # This should automatically promote Kyle Reese (p3) to "going"!
    client.post(f"/api/events/{event_id}/rsvp", json={
        "participant_name": "Sarah Connor",
        "edit_token": p1["edit_token"],
        "status": "not_going"
    })

    # Re-check summary & Kyle Reese status
    summary_after = client.get(f"/api/events/{event_id}/rsvp").json()
    assert summary_after["count_going"] == 2
    assert summary_after["count_waitlisted"] == 1
    assert summary_after["count_not_going"] == 1

    # Inspect Kyle Reese
    kyle = [r for r in summary_after["rsvps"] if r["participant_name"] == "Kyle Reese"][0]
    assert kyle["status"] == "going"
    assert kyle["waitlist_position"] is None

    # Inspect Miles Dyson (should now be promoted to Rank 1)
    miles = [r for r in summary_after["rsvps"] if r["participant_name"] == "Miles Dyson"][0]
    assert miles["status"] == "waitlisted"
    assert miles["waitlist_position"] == 1
