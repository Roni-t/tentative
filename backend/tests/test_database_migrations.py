from sqlalchemy import create_engine, inspect, text

from app.database_migrations import upgrade_legacy_schema


def test_upgrade_legacy_schema_renames_columns_and_allows_link_invitees(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.sqlite'}")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE events (id INTEGER PRIMARY KEY)"))
        connection.execute(text("""
            CREATE TABLE invitees (
                id INTEGER PRIMARY KEY,
                event_id INTEGER NOT NULL REFERENCES events(id),
                name VARCHAR(128) NOT NULL,
                phone_encrypted VARCHAR(512) NOT NULL,
                phone_hash VARCHAR(64) NOT NULL,
                timezone VARCHAR(64),
                response_token VARCHAR(64) NOT NULL,
                responded_at DATETIME,
                reminder_sent_at DATETIME,
                created_at DATETIME NOT NULL,
                CONSTRAINT uq_invitee_event_phone UNIQUE(event_id, phone_hash)
            )
        """))
        connection.execute(text("""
            CREATE TABLE rsvps (
                id INTEGER PRIMARY KEY,
                participant_email_or_phone VARCHAR(128)
            )
        """))
        connection.execute(text("""
            CREATE TABLE bug_reports (
                id INTEGER PRIMARY KEY,
                email_or_phone VARCHAR(128)
            )
        """))
        connection.execute(text("INSERT INTO events (id) VALUES (1)"))
        connection.execute(text("""
            INSERT INTO invitees (id, event_id, name, phone_encrypted, phone_hash, response_token, created_at)
            VALUES (1, 1, 'Existing Guest', 'encrypted', 'hash', 'old-link', CURRENT_TIMESTAMP)
        """))
        connection.execute(text("INSERT INTO rsvps VALUES (1, 'old-contact')"))
        connection.execute(text("INSERT INTO bug_reports VALUES (1, 'old-contact')"))

    upgrade_legacy_schema(engine)
    upgrade_legacy_schema(engine)  # Startup migration is safe to repeat.

    invitee_columns = {column["name"]: column for column in inspect(engine).get_columns("invitees")}
    assert "joined_via_link" in invitee_columns
    assert invitee_columns["phone_encrypted"]["nullable"]
    assert invitee_columns["phone_hash"]["nullable"]
    assert {column["name"] for column in inspect(engine).get_columns("rsvps")} == {
        "id", "participant_phone"
    }
    assert {column["name"] for column in inspect(engine).get_columns("bug_reports")} == {
        "id", "contact"
    }

    with engine.begin() as connection:
        connection.execute(text("""
            INSERT INTO invitees (event_id, name, phone_encrypted, phone_hash, response_token, joined_via_link, created_at)
            VALUES (1, 'Link Guest', NULL, NULL, 'new-link', TRUE, CURRENT_TIMESTAMP)
        """))
        old = connection.execute(text("SELECT name, phone_hash FROM invitees WHERE id = 1")).one()
        new = connection.execute(text("SELECT name, joined_via_link FROM invitees WHERE response_token = 'new-link'")).one()
    assert old == ("Existing Guest", "hash")
    assert new == ("Link Guest", 1)
