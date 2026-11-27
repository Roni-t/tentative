"""Discussion (comments) was removed from the project scope (DEV-171)."""
from app.database import Base
from tests.helpers import create_event, register_user


def test_discussion_endpoints_are_gone(client):
    host = register_user(client, phone="+19725550142", name="Test Host")
    event = create_event(client, host)
    assert client.get(f"/api/events/{event['id']}/comments").status_code == 404
    res = client.post(f"/api/events/{event['id']}/comments", json={"author_name": "Gus", "content": "hi"})
    assert res.status_code in (404, 405)


def test_no_comments_table():
    assert "comments" not in Base.metadata.tables
