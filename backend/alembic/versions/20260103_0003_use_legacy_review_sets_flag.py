"""add settings flag: use_legacy_review_sets (data-only)

Revision ID: 20260103_0003
Revises: 20260103_0002
Create Date: 2026-01-03

スキーマ変更は不要（settingsはkey-value）。
既存ユーザー保護のため、未設定の場合は use_legacy_review_sets=true を初期投入する。

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260103_0003"
down_revision = "20260103_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        bind.execute(
            sa.text(
                """
                INSERT INTO settings (key, value)
                VALUES (:k, :v)
                ON CONFLICT (key) DO NOTHING
                """
            ),
            {"k": "use_legacy_review_sets", "v": "true"},
        )
    else:
        # SQLite 等: 既存行があれば無視
        bind.execute(
            sa.text(
                """
                INSERT OR IGNORE INTO settings (key, value)
                VALUES (:k, :v)
                """
            ),
            {"k": "use_legacy_review_sets", "v": "true"},
        )


def downgrade() -> None:
    raise RuntimeError("downgrade is disabled for data safety")


