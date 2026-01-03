## 目的（Raspberry Pi / 本番）

本番DBを **SQLite から PostgreSQL に完全移行**し、以後は **PostgreSQL の named volume (`pgdata`) が唯一の正データ**になります。

- **git pull + docker compose up -d** を何回繰り返してもデータが消えません
- DBスキーマ変更は **Alembic 以外禁止**（`create_all` 等は禁止）
- backend 起動時に **必ず `alembic upgrade head`** が走ります（失敗したら起動しません）

---

## データがどこに保存されるか

- **PostgreSQL データ**: Docker の named volume `pgdata`（`/var/lib/postgresql/data`）
- **旧SQLite（移行元）**: Raspberry Pi 上の既存ファイル（例: `/mnt/files/cpa-dashboard/cpa_dashboard.db`）

移行後は backend は SQLite を参照しません。

---

## 初回のみ（SQLite → PostgreSQL 1回限り移行）

### 0) 事前確認

- 旧SQLiteが存在すること（例: `/mnt/files/cpa-dashboard/cpa_dashboard.db`）
- `docker-compose.prod.yml` が本番起動に使われていること

### 1) 本番コンテナ起動（Postgresを立ち上げ、Alembicでスキーマ作成）

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

backend は起動時に `alembic upgrade head` を実行します。

### 2) SQLite → Postgres 移行（初回のみ）

**重要**: backend サービスは通常運用では SQLite をマウントしません。移行コマンド実行時だけ `docker compose run -v` で SQLite を読み取り専用で渡します。

例（旧SQLiteが `/mnt/files/cpa-dashboard/cpa_dashboard.db` の場合）:

```bash
docker compose -f docker-compose.prod.yml run --rm \
  -e SQLITE_DB_PATH=/app/data/cpa_dashboard.db \
  -v /mnt/files/cpa-dashboard:/app/data:ro \
  backend \
  python scripts/migrate_sqlite_to_postgres.py
```

移行が成功すると `[MIGRATE] SUCCESS (committed)` が表示されます。

---

## Dockerfile反映・スクリプト実行確認（本番で手編集不要）

以下の手順で **`/app/scripts/migrate_sqlite_to_postgres.py` がコンテナに含まれている**ことを確認できます。

```bash
docker compose -f docker-compose.prod.yml build --no-cache backend
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml run --rm backend \
  python /app/scripts/migrate_sqlite_to_postgres.py
```

※ 実際の移行実行では `SQLITE_DB_PATH` と SQLite ファイルのマウントが必要です（上の「初回のみ」手順参照）。

### 3) 再起動

```bash
docker compose -f docker-compose.prod.yml up -d
```

以後、データは PostgreSQL（`pgdata`）のみが正となります。

---

## 移行後の運用（git pull してもデータが消えない理由）

### 運用手順

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### なぜデータが消えないか

- DBは SQLite ファイルではなく **PostgreSQL の named volume `pgdata`** に保存されるため、コンテナを作り直しても DB は残ります。
- backend 起動時に **必ず `alembic upgrade head`** を実行し、スキーマを追従します。
- `create_all` による “推測でのテーブル生成/変更” を一切行いません。

---

## 失敗時（安全設計）

- `alembic upgrade head` が失敗した場合: backend は **起動しません**（ログを出して終了）
- SQLite→Postgres移行が失敗した場合: **Postgres側はロールバック**します（途中まで入らない）


