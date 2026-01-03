FROM python:3.11-slim

WORKDIR /app

# システムパッケージの更新と必要なパッケージのインストール
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---
# アプリ本体と運用スクリプトを明示的にコピー
# - app/      -> /app/app
# - scripts/  -> /app/scripts
# - alembic   -> /app/alembic（起動時にalembic upgrade headを実行）
# ---
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic
COPY app ./app
COPY scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# entrypoint
RUN chmod +x /app/docker-entrypoint.sh
ENV PYTHONPATH=/app

# ポートの公開
EXPOSE 8000

# 起動時: alembic upgrade head → 起動（失敗時は起動しない）
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
