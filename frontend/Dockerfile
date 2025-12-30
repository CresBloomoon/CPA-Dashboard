FROM node:20-slim

WORKDIR /app

# wgetをインストール（healthcheck用）
RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# パッケージファイルをコピーして依存関係をインストール
COPY package*.json ./
RUN npm install --no-fund --no-audit

# アプリケーションコードをコピー
COPY . .

# ポートの公開
EXPOSE 5173

# デフォルトコマンド（docker-composeで上書きされる）
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
