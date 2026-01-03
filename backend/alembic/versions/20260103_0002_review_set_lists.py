"""add review_set_lists / review_set_items

Revision ID: 20260103_0002
Revises: 20260103_0001
Create Date: 2026-01-03

後方互換/移行:
- settings.review_timing が存在する場合、可能な範囲で review_set_lists/items へ初期移行を試みる
- ただし運用上、SQLite→Postgres移行スクリプト実行のタイミング次第では空のままになり得るため、
  アプリ側でも「新テーブルが空なら旧データから生成する」フォールバックを実装している。

"""
from __future__ import annotations

import json

from alembic import op
import sqlalchemy as sa

revision = "20260103_0002"
down_revision = "20260103_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "review_set_lists",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_review_set_lists_id", "review_set_lists", ["id"])

    op.create_table(
        "review_set_items",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("set_list_id", sa.Integer(), sa.ForeignKey("review_set_lists.id"), nullable=False),
        sa.Column("offset_days", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_review_set_items_id", "review_set_items", ["id"])
    op.create_index("ix_review_set_items_set_list_id", "review_set_items", ["set_list_id"])

    # 可能な範囲で旧データ(settings.review_timing)から初期移行
    bind = op.get_bind()
    try:
        row = bind.execute(sa.text("SELECT value FROM settings WHERE key = :k"), {"k": "review_timing"}).fetchone()
        if not row:
            return
        raw = row[0]
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            return

        # 既に何か入っている場合は移行しない
        existing = bind.execute(sa.text("SELECT COUNT(*) FROM review_set_lists")).scalar()
        if int(existing or 0) > 0:
            return

        for timing in parsed:
            if not isinstance(timing, dict):
                continue
            subject_name = str(timing.get("subject_name") or "").strip()
            review_days = timing.get("review_days") or []
            if not subject_name or not isinstance(review_days, list) or len(review_days) == 0:
                continue

            name = f"{subject_name}（旧）"
            rs_id = bind.execute(
                sa.text("INSERT INTO review_set_lists (name) VALUES (:name) RETURNING id"),
                {"name": name},
            ).scalar()
            if not rs_id:
                continue

            for day in review_days:
                try:
                    offset = int(day)
                except Exception:
                    continue
                bind.execute(
                    sa.text("INSERT INTO review_set_items (set_list_id, offset_days) VALUES (:sid, :off)"),
                    {"sid": int(rs_id), "off": int(offset)},
                )
    except Exception:
        # 移行失敗は致命ではない（アプリ側フォールバックがある）
        pass


def downgrade() -> None:
    raise RuntimeError("downgrade is disabled for data safety")



