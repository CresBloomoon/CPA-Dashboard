FROM node:20-alpine

WORKDIR /app

# wgetをインストール（healthcheck用）
RUN apk add --no-cache wget

# パッケージファイルをコピーして依存関係をインストール
COPY package*.json ./
RUN npm install --no-fund --no-audit

# アプリケーションコードをコピー
COPY . .

# ポートの公開
EXPOSE 5173

# デフォルトコマンド（docker-composeで上書きされる）
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
