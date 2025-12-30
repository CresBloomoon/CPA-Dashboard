FROM node:20-slim AS build

WORKDIR /app

# Vite の環境変数はビルド時に埋め込まれる（import.meta.env）
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# 依存関係を先にインストールしてキャッシュを効かせる
COPY package*.json ./
RUN npm ci --no-fund --no-audit

# ソースコードをコピーして本番ビルド
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
