from __future__ import annotations

import os
import sys
import logging
from typing import Any, Dict, List

import sqlalchemy as sa
from sqlalchemy import text


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_sqlite_to_postgres")


def _require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"{name} is required")
    return v


def _mask_url(url: str) -> str:
    try:
        from sqlalchemy.engine.url import make_url

        u = make_url(url)
        if u.password:
            u = u.set(password="***")
        return str(u)
    except Exception:
        return "<unparseable>"


def _sqlite_url_from_path(path: str) -> str:
    # absolute path recommended
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    return f"sqlite:///{path}"


def _fetch_all(conn: sa.Connection, table: str) -> List[Dict[str, Any]]:
    result = conn.execute(text(f'SELECT * FROM "{table}"'))
    rows = [dict(r._mapping) for r in result.fetchall()]
    return rows


def _count(conn: sa.Connection, table: str) -> int:
    return int(conn.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar() or 0)


def _set_sequence(conn: sa.Connection, table: str, pk: str = "id") -> None:
    # Postgres only
    sql = text(
        """
        SELECT setval(
          pg_get_serial_sequence(:tbl, :pk),
          COALESCE((SELECT MAX(id) FROM """ + table + """), 1),
          true
        );
        """
    )
    conn.execute(sql, {"tbl": table, "pk": pk})


def main() -> int:
    sqlite_db_path = _require_env("SQLITE_DB_PATH")
    pg_url = _require_env("DATABASE_URL")

    sqlite_url = _sqlite_url_from_path(sqlite_db_path)

    if not os.path.exists(sqlite_db_path):
        raise RuntimeError(f"SQLite DB file not found: {sqlite_db_path}")

    if not pg_url.startswith("postgresql"):
        raise RuntimeError("DATABASE_URL must be PostgreSQL for this migration")

    logger.info(f"[CONFIG] SQLITE_DB_PATH={sqlite_db_path}")
    logger.info(f"[CONFIG] SQLITE_URL={sqlite_url}")
    logger.info(f"[CONFIG] DATABASE_URL={_mask_url(pg_url)}")

    sqlite_engine = sa.create_engine(sqlite_url, connect_args={"check_same_thread": False})
    pg_engine = sa.create_engine(pg_url, pool_pre_ping=True)

    tables_in_order = [
        "projects",
        "study_progress",
        "settings",
        "study_time_sync_sessions",
        "todos",
    ]

    with sqlite_engine.connect() as sqlite_conn:
        sqlite_tables = set(sa.inspect(sqlite_conn).get_table_names())
        missing_sqlite = [t for t in tables_in_order if t not in sqlite_tables]
        if missing_sqlite:
            raise RuntimeError(f"SQLite schema is missing tables: {missing_sqlite}")

        # SQLAlchemy 2.0 autobegin 対策:
        # - 明示的に Connection.begin() を呼ばず、Engine.begin() のコンテキストに統一する
        # - 例外時は自動ロールバックされる
        try:
            logger.info("[MIGRATE] starting transaction (pg_engine.begin())")
            with pg_engine.begin() as pg_conn:
                # Ensure postgres schema exists (alembic should have run already)
                pg_tables = set(sa.inspect(pg_conn).get_table_names())
                missing = [t for t in tables_in_order if t not in pg_tables]
                if missing:
                    raise RuntimeError(
                        f"PostgreSQL schema is missing tables: {missing}. Run `alembic upgrade head` first."
                    )

                # Safety: stop if postgres already has data (unless forced)
                force = os.getenv("MIGRATE_FORCE") == "1"
                existing_counts = {t: _count(pg_conn, t) for t in tables_in_order if t in pg_tables}
                non_empty = {t: c for t, c in existing_counts.items() if c > 0}
                if non_empty and not force:
                    raise RuntimeError(
                        f"PostgreSQL already has data (non-empty tables: {non_empty}). "
                        "Abort to avoid duplicates. Set MIGRATE_FORCE=1 to override."
                    )

                for table in tables_in_order:
                    src_rows = _fetch_all(sqlite_conn, table)
                    logger.info(f"[MIGRATE] {table}: rows={len(src_rows)}")

                    if not src_rows:
                        continue

                    # Insert in chunks
                    cols = list(src_rows[0].keys())
                    col_list = ", ".join([f'"{c}"' for c in cols])
                    val_list = ", ".join([f":{c}" for c in cols])
                    insert_sql = text(f'INSERT INTO "{table}" ({col_list}) VALUES ({val_list})')

                    chunk_size = 1000
                    for i in range(0, len(src_rows), chunk_size):
                        chunk = src_rows[i : i + chunk_size]
                        pg_conn.execute(insert_sql, chunk)

                # Adjust sequences
                for table in ["projects", "study_progress", "settings", "study_time_sync_sessions", "todos"]:
                    logger.info(f"[MIGRATE] set sequence: {table}.id")
                    _set_sequence(pg_conn, table, "id")

            logger.info("[MIGRATE] SUCCESS (committed)")
            return 0
        except Exception as e:
            logger.exception(f"[MIGRATE] FAILED -> rollback: {e}")
            return 1


if __name__ == "__main__":
    sys.exit(main())


