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

- ✅ 勉強進捗の登録・編集・削除
- ✅ 科目別の進捗管理（財務会計、管理会計、監査論、企業法、租税法）
- ✅ 進捗率と学習時間の記録
- ✅ メモ機能
- ✅ 科目別の統計表示（学習時間、平均進捗率）
- ✅ 進捗の可視化（プログレスバー、チャート）
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
│   │   ├── components/
│   │   │   ├── ProgressList.tsx    # 進捗一覧コンポーネント
│   │   │   ├── ProgressForm.tsx    # 進捗フォームコンポーネント
│   │   │   ├── SummaryCards.tsx    # 統計カードコンポーネント
│   │   │   └── SubjectChart.tsx    # 科目別チャートコンポーネント
│   │   ├── App.tsx           # メインアプリケーション
│   │   ├── main.tsx
│   │   ├── api.ts            # APIクライアント
│   │   ├── types.ts          # TypeScript型定義
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

