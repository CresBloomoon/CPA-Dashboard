FROM python:3.11-slim

WORKDIR /app

# システムパッケージの更新と必要なパッケージのインストール
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY . .

# ポートの公開
EXPOSE 8000

# デフォルトコマンド（docker-composeで上書きされる）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

