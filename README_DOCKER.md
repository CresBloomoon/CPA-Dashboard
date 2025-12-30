# Dockerセットアップガイド

このガイドでは、Docker Composeを使用してCPA Dashboardを起動する方法を、初心者向けに詳しく説明します。

## 目次

1. [前提条件](#前提条件)
2. [クイックスタート](#クイックスタート)
3. [環境変数の設定](#環境変数の設定)
4. [動作確認](#動作確認)
5. [よくある問題と解決方法](#よくある問題と解決方法)
6. [開発時の注意事項](#開発時の注意事項)

---

## 前提条件

### 必要なソフトウェア

- **Docker Desktop**（推奨）または **Docker Engine + Docker Compose**
  - Windows/Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop/)をダウンロードしてインストール
  - Linux: Docker EngineとDocker Composeをインストール

### ポートの確認

以下のポートが使用可能であることを確認してください：

- **8000**: Backend API
- **5173**: Frontend

ポートが使用中の場合は、後述の「環境変数の設定」で変更できます。

---

## クイックスタート

### Step 1: リポジトリのクローン

```bash
git clone <repository-url>
cd CPA-Dashboard
```

### Step 2: Docker Composeで起動

```bash
docker compose up --build
```

このコマンドで以下が自動的に実行されます：

1. Dockerイメージのビルド
2. 依存関係のインストール（初回のみ）
3. データベースの初期化
4. アプリケーションの起動

初回起動時は、依存関係のインストールとイメージのビルドに**数分程度**かかります。

### Step 3: 起動確認

起動が完了すると、以下のようなメッセージが表示されます：

```
cpa_backend  | INFO:     Application startup complete.
cpa_frontend | VITE v5.x.x  ready in xxx ms
```

### Step 4: アクセス

ブラウザで以下のURLにアクセスしてください：

- **Frontend（メインアプリ）**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API ドキュメント（Swagger UI）**: http://localhost:8000/docs

---

## 環境変数の設定

`.env`ファイルは**必須ではありません**。デフォルト値で動作します。

カスタマイズしたい場合のみ、以下の手順で`.env`ファイルを作成してください。

### .envファイルの作成

プロジェクトのルートディレクトリに`.env`ファイルを作成し、以下の内容を設定します：

```bash
# Backend Settings
BACKEND_PORT=8000
DATABASE_URL=sqlite:////app/data/cpa_dashboard.db

# Frontend Settings
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:8000

# Google Calendar Settings (Optional)
# GOOGLE_CALENDAR_TOKEN_PATH=token.json
# GOOGLE_CALENDAR_CREDENTIALS_PATH=credentials.json
```

### 環境変数の説明

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `BACKEND_PORT` | `8000` | Backend APIのポート番号 |
| `FRONTEND_PORT` | `5173` | Frontendのポート番号 |
| `VITE_API_URL` | `http://localhost:8000` | FrontendからBackend APIへの接続URL |
| `DATABASE_URL` | `sqlite:////app/data/cpa_dashboard.db` | データベースファイルのパス |

### ポート番号の変更例

ポート8000や5173が既に使用されている場合：

```env
BACKEND_PORT=8001
FRONTEND_PORT=5174
VITE_API_URL=http://localhost:8001
```

---

## 動作確認

### サービスの状態確認

```bash
docker compose ps
```

すべてのサービスが`healthy`状態になっていることを確認してください：

```
NAME            STATUS
cpa_backend     Up (healthy)
cpa_frontend    Up (healthy)
```

### ログの確認

```bash
# すべてのサービスのログ
docker compose logs -f

# 特定のサービスのログ
docker compose logs -f backend
docker compose logs -f frontend
```

---

## よくある問題と解決方法

### ポートが既に使用されている

**エラーメッセージ**: 
```
Bind for 0.0.0.0:8000 failed: port is already allocated
```

**解決方法**: 

1. `.env`ファイルでポート番号を変更する
2. または、使用中のプロセスを停止する

```env
BACKEND_PORT=8001
FRONTEND_PORT=5174
VITE_API_URL=http://localhost:8001
```

### データベースファイルが見つからない

**症状**: アプリケーションが起動しない、またはエラーが表示される

**解決方法**: 

データベースファイルは自動的に作成されます。`backend_db`ボリュームに保存されます。

もし問題が続く場合：

```bash
# コンテナとボリュームを削除して再起動
docker compose down -v
docker compose up --build
```

### 依存関係のインストールに失敗する

**症状**: ビルドエラーが発生する

**解決方法**: 

```bash
# キャッシュなしで再ビルド
docker compose build --no-cache
docker compose up
```

### package.json を更新したのに起動できない（依存関係が足りない）

**症状**: フロントエンドで `Failed to resolve import` など、依存関係不足のエラーが出る

**解決方法**:

このプロジェクトは **frontend 起動時に `npm install` を実行して依存関係を同期**します。通常は `docker compose up -d` だけで復旧します。

それでも解消しない場合は、以下を実行してください：

```bash
# フロントエンドのみ依存関係を再同期
docker compose exec frontend npm install

# それでもダメなら、イメージ/ボリュームを作り直す（最終手段）
docker compose down -v
docker compose up --build
```

### フロントエンドの変更が反映されない

**症状**: コードを変更してもブラウザに反映されない

**解決方法**: 

フロントエンドはホットリロードに対応しています。コードを変更すると自動的に反映されます。

もし反映されない場合：

```bash
# フロントエンドコンテナを再起動
docker compose restart frontend
```

### Docker Desktopが起動しない

**症状**: `docker compose up`コマンドが失敗する

**解決方法**: 

1. Docker Desktopが起動していることを確認
2. Docker Desktopの設定で、リソース（メモリ、CPU）が十分に割り当てられていることを確認

---

## 開発時の注意事項

### ホットリロード

BackendとFrontendの両方でホットリロードが有効になっています。

- **Backend**: `./backend`ディレクトリ内のコードを変更すると、自動的に再起動されます
- **Frontend**: `./frontend`ディレクトリ内のコードを変更すると、ブラウザが自動的に更新されます

### データベースの永続化

SQLiteデータベースは`backend_db`ボリュームに永続化されます。

**重要**: `docker compose down -v`でボリュームを削除すると、**すべてのデータが失われます**。

データを保持したい場合：

```bash
# ボリュームを保持したまま停止
docker compose down

# ボリュームも削除して停止（データが失われます）
docker compose down -v
```

### コンテナの再起動

```bash
# すべてのコンテナを再起動
docker compose restart

# 特定のコンテナを再起動
docker compose restart backend
docker compose restart frontend
```

### コンテナの停止

```bash
# コンテナを停止（データは保持）
docker compose down

# コンテナとボリュームを削除（データが失われます）
docker compose down -v
```

---

## 本番環境へのデプロイ

この設定は**開発環境向け**です。本番環境では以下の点を考慮してください：

- 環境変数の適切な設定
- HTTPSの設定
- データベースのバックアップ戦略
- ログ管理
- セキュリティ設定の強化
- リソース制限の設定

---

## トラブルシューティング

### コンテナのログを確認

```bash
# すべてのサービスのログ
docker compose logs -f

# 特定のサービスのログ（最新50行）
docker compose logs --tail=50 backend
```

### コンテナ内でコマンドを実行

```bash
# Backendコンテナ内でシェルを起動
docker compose exec backend sh

# Frontendコンテナ内でシェルを起動
docker compose exec frontend sh
```

### イメージの再ビルド

```bash
# 特定のサービスのみ再ビルド
docker compose build backend
docker compose build frontend

# すべてのサービスを再ビルド
docker compose build
```

---

## サポート

問題が解決しない場合は、GitHubのIssuesで報告してください。
