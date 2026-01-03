"""initial postgres schema

Revision ID: 20260103_0001
Revises:
Create Date: 2026-01-03

対象テーブル（SQLiteスキーマと一致）:
- study_progress
- projects
- settings
- study_time_sync_sessions
- todos

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260103_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # projects
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_projects_id", "projects", ["id"])

    # study_progress
    op.create_table(
        "study_progress",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=False),
        sa.Column("topic", sa.String(length=200), nullable=False),
        sa.Column("progress_percent", sa.Float(), nullable=True),
        sa.Column("study_hours", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("actual_time", sa.Float(), nullable=True),
        sa.Column("target_time", sa.Float(), nullable=True),
        sa.Column("variance_reason", sa.String(length=200), nullable=True),
        sa.Column("theory_calculation_ratio", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_study_progress_id", "study_progress", ["id"])
    op.create_index("ix_study_progress_subject", "study_progress", ["subject"])

    # settings
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("key", name="uq_settings_key"),
    )
    op.create_index("ix_settings_id", "settings", ["id"])
    op.create_index("ix_settings_key", "settings", ["key"])

    # study_time_sync_sessions
    op.create_table(
        "study_time_sync_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=100), nullable=False),
        sa.Column("date_key", sa.String(length=10), nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=False),
        sa.Column("client_session_id", sa.String(length=100), nullable=False),
        sa.Column("last_total_ms", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "date_key", "subject", "client_session_id", name="uq_study_time_sync"),
    )
    op.create_index("ix_study_time_sync_sessions_id", "study_time_sync_sessions", ["id"])
    op.create_index("ix_study_time_sync_sessions_user_id", "study_time_sync_sessions", ["user_id"])
    op.create_index("ix_study_time_sync_sessions_date_key", "study_time_sync_sessions", ["date_key"])
    op.create_index("ix_study_time_sync_sessions_subject", "study_time_sync_sessions", ["subject"])
    op.create_index("ix_study_time_sync_sessions_client_session_id", "study_time_sync_sessions", ["client_session_id"])

    # todos
    op.create_table(
        "todos",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_todos_id", "todos", ["id"])


def downgrade() -> None:
    # データ保護: downgradeしない
    raise RuntimeError("downgrade is disabled for data safety")



