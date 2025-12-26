# CPA Dashboard

公認会計士の勉強進捗を一覧できるダッシュボードWebアプリケーション

## 構成

- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **コンテナ**: Docker Compose

## セットアップ

### 1. 環境変数の設定

`.env`ファイルを作成してください：

```bash
cp .env.example .env
```

必要に応じてポート番号を変更できます。

### 2. Docker Composeで起動

```bash
docker-compose up --build
```

### 3. アクセス

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 開発

すべてのコードはDockerコンテナ内で実行されるため、ローカルPCを汚しません。

- Backend: `./backend` ディレクトリ内のコードが自動的にホットリロードされます
- Frontend: `./frontend` ディレクトリ内のコードが自動的にホットリロードされます

## 機能

- ✅ 学習時間タイマー（ストップウォッチ / 手動記録）
- ✅ 学習進捗の記録・集計（科目別の学習時間など）
- ✅ リマインダー（期限管理 / 検索 / フィルタ）
- ✅ **iOSリマインダー風のインタラクティブなチェックボックスアニメーション**
- ✅ カレンダー（ドラッグ&ドロップで期限変更）
- ✅ プロジェクト（カンバン / ドラッグ&ドロップで整理）
- ✅ 設定（科目・色・復習セットリスト）
- ✅ **UI/UXのブラッシュアップ（CPA Dashboardとしての完成度向上）**
- ✅ レスポンシブデザイン

## プロジェクト構成

```
cpa-dashboard/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPIアプリケーション
│   │   ├── database.py       # データベース設定
│   │   ├── models.py         # SQLAlchemyモデル
│   │   ├── schemas.py        # Pydanticスキーマ
│   │   └── crud.py           # CRUD操作
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── features/              # 機能別モジュール
│   │   │   ├── timer/             # タイマー関連
│   │   │   ├── kanban/            # プロジェクト・カンバン関連
│   │   │   ├── calendar/          # カレンダー・ヒートマップ関連
│   │   │   └── shared/            # 共通UI
│   │   ├── api/                   # APIクライアント / TypeScript型定義
│   │   ├── hooks/                 # グローバルHooks
│   │   └── utils/                 # ユーティリティ
│   │   ├── App.tsx           # メインアプリケーション
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .dockerignore
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## データベース

SQLiteを使用しています。データベースファイル（`cpa_dashboard.db`）は`backend`ディレクトリに自動的に作成されます。

