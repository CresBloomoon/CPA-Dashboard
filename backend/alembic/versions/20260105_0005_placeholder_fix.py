"""placeholder fix for missing revision

Revision ID: 20260105_0005
Revises: 20260104_0004
Create Date: 2026-01-05

目的:
- DBの alembic_version が '20260105_0005' を参照しているが、
  リポジトリに該当マイグレーションファイルが存在しないため参照切れが発生している。
- このファイルは参照切れを修復するためのプレースホルダー。
- スキーマ変更は一切行わない（no-op）。

注意:
- upgrade()/downgrade() は pass のみで、実際の操作は行わない。
- 既存データに影響を与えない。
"""
from __future__ import annotations

from alembic import op

revision = "20260105_0005"
down_revision = "20260104_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # no-op: スキーマ変更なし
    pass


def downgrade() -> None:
    # no-op: スキーマ変更なし
    pass

