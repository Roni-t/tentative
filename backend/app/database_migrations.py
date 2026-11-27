"""Small, idempotent upgrades for databases created by earlier Tentative versions."""

from sqlalchemy import Column, Integer, MetaData, Table, inspect, text
from sqlalchemy.schema import CreateTable


def upgrade_legacy_schema(engine) -> None:
    """Keep existing SQLite/PostgreSQL deployments compatible with current models."""
    tables = set(inspect(engine).get_table_names())
    if not tables:
        return

    _rename_legacy_column(engine, tables, "rsvps", "participant_email_or_phone", "participant_phone")
    _rename_legacy_column(engine, tables, "bug_reports", "email_or_phone", "contact")
    _upgrade_invitees(engine, tables)


def _rename_legacy_column(engine, tables, table_name, old_name, new_name) -> None:
    if table_name not in tables:
        return
    columns = {column["name"] for column in inspect(engine).get_columns(table_name)}
    if old_name not in columns or new_name in columns:
        return
    quote = engine.dialect.identifier_preparer.quote
    with engine.begin() as connection:
        connection.execute(text(
            f"ALTER TABLE {quote(table_name)} RENAME COLUMN {quote(old_name)} TO {quote(new_name)}"
        ))


def _upgrade_invitees(engine, tables) -> None:
    if "invitees" not in tables:
        return

    columns = inspect(engine).get_columns("invitees")
    names = {column["name"] for column in columns}
    added_column = False
    for col_name, col_ddl in (
        ("joined_via_link", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("rsvp_status", "VARCHAR(16)"),
        ("rsvp_updated_at", "DATETIME"),
    ):
        if col_name not in names:
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE invitees ADD COLUMN {col_name} {col_ddl}"))
            added_column = True
    if added_column:
        columns = inspect(engine).get_columns("invitees")

    phone_fields_require_nullable_upgrade = any(
        not next((column["nullable"] for column in columns if column["name"] == field), True)
        for field in ("phone_encrypted", "phone_hash")
    )
    if not phone_fields_require_nullable_upgrade:
        return

    dialect = engine.dialect.name
    if dialect == "postgresql":
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invitees ALTER COLUMN phone_encrypted DROP NOT NULL"))
            connection.execute(text("ALTER TABLE invitees ALTER COLUMN phone_hash DROP NOT NULL"))
        return
    if dialect != "sqlite":
        raise RuntimeError(f"No invitee compatibility migration is available for {dialect}.")

    _rebuild_sqlite_invitees(engine)


def _rebuild_sqlite_invitees(engine) -> None:
    """SQLite cannot drop NOT NULL in place, so copy the table into the current shape."""
    from app.models.invitee import Invitee

    old_names = {column["name"] for column in inspect(engine).get_columns("invitees")}
    live_table = Invitee.__table__
    temp_name = "invitees__codex_upgrade"
    migration_metadata = MetaData()
    Table("events", migration_metadata, Column("id", Integer, primary_key=True))
    replacement = live_table.to_metadata(migration_metadata, name=temp_name)

    quote = engine.dialect.identifier_preparer.quote
    copy_columns = [column.name for column in live_table.columns if column.name in old_names]
    quoted_columns = ", ".join(quote(name) for name in copy_columns)

    with engine.begin() as connection:
        connection.execute(CreateTable(replacement))
        connection.execute(text(
            f"INSERT INTO {quote(temp_name)} ({quoted_columns}) "
            f"SELECT {quoted_columns} FROM {quote('invitees')}"
        ))
        connection.execute(text(f"DROP TABLE {quote('invitees')}"))
        connection.execute(text(
            f"ALTER TABLE {quote(temp_name)} RENAME TO {quote('invitees')}"
        ))
        for index in live_table.indexes:
            index.create(connection, checkfirst=True)

