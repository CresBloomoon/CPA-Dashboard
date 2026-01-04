"""study_progress legacy化 + 互換VIEW

Revision ID: 20260104_0004
Revises: 20260103_0003
Create Date: 2026-01-04

目的:
- 学習時間の正を study_time_sync_sessions(date_key) に統一する
- 旧 study_progress は DROP せず、実体テーブルを study_progress_legacy として保持する
- 旧名 study_progress は VIEW として再作成し、旧参照互換を提供する

方針:
- upgrade:
  1) study_progress -> study_progress_legacy に rename（データ保持）
  2) study_progress VIEW を作成
     - legacy の「学習時間以外」をそのまま返す
     - study_time_sync_sessions を (date_key, subject) 単位で集計し、topic='学習時間' の互換行として返す
       created_at/updated_at は JST 00:00 を timestamptz に変換した値で埋める
- downgrade:
  1) study_progress VIEW を DROP
  2) study_progress_legacy -> study_progress に rename

注意:
- 既存データ削除は禁止（DROP TABLE 禁止）
"""

from __future__ import annotations

from alembic import op

revision = "20260104_0004"
down_revision = "20260103_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) 実体テーブルを legacy に退避
    op.rename_table("study_progress", "study_progress_legacy")

    # 2) 旧名で互換VIEWを作成
    op.execute(
        """
        CREATE VIEW study_progress AS
        SELECT
            sp.id::integer AS id,
            sp.subject::varchar(100) AS subject,
            sp.topic::varchar(200) AS topic,
            sp.progress_percent::double precision AS progress_percent,
            sp.study_hours::double precision AS study_hours,
            sp.notes::text AS notes,
            sp.actual_time::double precision AS actual_time,
            sp.target_time::double precision AS target_time,
            sp.variance_reason::varchar(200) AS variance_reason,
            sp.theory_calculation_ratio::double precision AS theory_calculation_ratio,
            sp.created_at::timestamptz AS created_at,
            sp.updated_at::timestamptz AS updated_at
        FROM study_progress_legacy sp
        WHERE sp.topic <> '学習時間'
        UNION ALL
        SELECT
            (-row_number() OVER (ORDER BY sts.subject, sts.date_key))::integer AS id,
            sts.subject::varchar(100) AS subject,
            '学習時間'::varchar(200) AS topic,
            NULL::double precision AS progress_percent,
            (SUM(sts.last_total_ms)::double precision / 3600000.0)::double precision AS study_hours,
            NULL::text AS notes,
            NULL::double precision AS actual_time,
            NULL::double precision AS target_time,
            NULL::varchar(200) AS variance_reason,
            NULL::double precision AS theory_calculation_ratio,
            ((sts.date_key || ' 00:00:00+09')::timestamptz) AS created_at,
            ((sts.date_key || ' 00:00:00+09')::timestamptz) AS updated_at
        FROM study_time_sync_sessions sts
        WHERE sts.user_id = 'default'
        GROUP BY sts.subject, sts.date_key
        ;
        """
    )


def downgrade() -> None:
    # 1) VIEW を削除
    op.execute("DROP VIEW IF EXISTS study_progress;")

    # 2) legacy を元のテーブル名へ戻す
    op.rename_table("study_progress_legacy", "study_progress")


