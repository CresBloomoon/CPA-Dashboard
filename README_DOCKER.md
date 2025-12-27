# CPA Dashboard - Docker起動ガイド

このガイドでは、Docker Composeを使用してCPA Dashboardを一発で起動する方法を説明します。

## 前提条件

- Docker Desktop（またはDocker Engine + Docker Compose）がインストールされていること
- ポート 8000（Backend）と 5173（Frontend）が使用可能であること

## クイックスタート

### 1. リポジトリのクローン（初回のみ）

```bash
git clone <repository-url>
cd CPA-Dashboard
```

### 2. 環境変数の設定（オプション）

`.env`ファイルは必須ではありません。デフォルト値で動作します。

カスタマイズしたい場合は、`.env`ファイルを作成し、以下の内容を設定してください：

```bash
# .envファイルを作成
cat > .env << EOF
# Backend Settings
BACKEND_PORT=8000
DATABASE_URL=sqlite:////app/data/cpa_dashboard.db

# Frontend Settings
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:8000

# Google Calendar Settings (Optional)
# GOOGLE_CALENDAR_TOKEN_PATH=token.json
# GOOGLE_CALENDAR_CREDENTIALS_PATH=credentials.json
EOF
```

### 3. Docker Composeで起動

```bash
docker compose up --build
```

初回起動時は、依存関係のインストールとイメージのビルドに時間がかかります（数分程度）。

### 4. アクセス

起動が完了したら、以下のURLにアクセスできます：

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs

## 動作確認

起動が正常に完了したかどうかを確認するには：

```bash
docker compose ps
```

すべてのサービスが`healthy`状態になっていることを確認してください。

## 停止

```bash
docker compose down
```

データベースファイルを含むボリュームも削除する場合：

```bash
docker compose down -v
```

## よくある問題

### ポートが既に使用されている

エラーメッセージ: `Bind for 0.0.0.0:8000 failed: port is already allocated`

**解決方法**: `.env`ファイルでポート番号を変更するか、使用中のプロセスを停止してください。

```env
BACKEND_PORT=8001
FRONTEND_PORT=5174
```

### データベースファイルが見つからない

データベースファイルは自動的に作成されます。`backend_db`ボリュームに保存されます。

### 依存関係のインストールに失敗する

```bash
# キャッシュなしで再ビルド
docker compose build --no-cache
docker compose up
```

### フロントエンドの変更が反映されない

フロントエンドはホットリロードに対応しています。コードを変更すると自動的に反映されます。

もし反映されない場合：

```bash
# フロントエンドコンテナを再起動
docker compose restart frontend
```

## 開発時の注意事項

- **ホットリロード**: BackendとFrontendの両方でホットリロードが有効になっています。コードを変更すると自動的に反映されます。
- **データベース**: SQLiteデータベースは`backend_db`ボリュームに永続化されます。`docker compose down -v`でボリュームを削除すると、データが失われます。
- **ログ確認**: 各サービスのログを確認するには：

```bash
# すべてのサービスのログ
docker compose logs -f

# 特定のサービスのログ
docker compose logs -f backend
docker compose logs -f frontend
```

## 本番環境へのデプロイ

この設定は開発環境向けです。本番環境では以下の点を考慮してください：

- 環境変数の適切な設定
- HTTPSの設定
- データベースのバックアップ戦略
- ログ管理
- セキュリティ設定の強化

