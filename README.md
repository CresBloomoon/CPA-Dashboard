# CPA Dashboard

公認会計士の勉強進捗を一覧できるダッシュボードWebアプリケーション

## 目次

1. [概要](#概要)
2. [クイックスタート](#クイックスタート)
3. [設計思想](#設計思想)
4. [設定ガイド](#設定ガイド)
5. [機能一覧](#機能一覧)

---

## 概要

CPA Dashboardは、公認会計士試験の勉強進捗を管理するためのWebアプリケーションです。学習時間の記録、リマインダー管理、カレンダー表示、プロジェクト管理などの機能を提供します。

### 技術スタック

- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **データベース**: SQLite
- **コンテナ**: Docker Compose

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

初回起動時は、依存関係のインストールとイメージのビルドに数分かかります。

### Step 3: アクセス

起動が完了したら、以下のURLにアクセスできます：

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs

### 詳細情報

Dockerのセットアップやトラブルシューティングについては、[README_DOCKER.md](./README_DOCKER.md)を参照してください。

---

## 設計思想

本プロジェクトは、**クリーンアーキテクチャ**と**DDD（ドメイン駆動設計）**の原則に基づいて設計されています。

### 主な特徴

- **Separation of Concerns**: UIとビジネスロジックの完全分離
- **純粋関数**: Domain層は参照透過性を重視
- **テストカバレッジ**: Domain層のテストカバレッジ100%
- **型安全性**: TypeScriptの型システムを最大限活用（any禁止）

### 詳細情報

アーキテクチャの詳細については、[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)を参照してください。

---

## 設定ガイド

アプリケーションの動作をカスタマイズするには、`frontend/src/config/appConfig.ts`を編集します。

### 主な設定項目

- **タイマー設定**: ポモドーロの時間、ストップウォッチの設定など
- **アニメーション**: 各種UIアニメーションの速度やイージング
- **見た目**: 色、フォントサイズ、UI要素のサイズなど
- **表示上限**: カレンダーやリストの表示件数など

### 詳細情報

すべての設定パラメータの一覧と説明については、[docs/CONFIG_GUIDE.md](./docs/CONFIG_GUIDE.md)を参照してください。

---

## 機能一覧

- ✅ **学習時間タイマー**
  - ストップウォッチモード
  - ポモドーロタイマー
  - 手動入力モード

- ✅ **学習進捗の記録・集計**
  - 科目別の学習時間集計
  - 週間・月間の学習時間グラフ
  - 学習ヒートマップ

- ✅ **リマインダー管理**
  - 期限管理
  - 検索・フィルタ機能
  - iOSリマインダー風のチェックボックスアニメーション

- ✅ **カレンダー表示**
  - ドラッグ&ドロップで期限変更
  - 学習ヒートマップ表示

- ✅ **プロジェクト管理**
  - カンバンボード
  - ドラッグ&ドロップで整理

- ✅ **設定機能**
  - 科目・色のカスタマイズ
  - 復習セットリストの管理

- ✅ **レスポンシブデザイン**
  - PC・タブレット・スマートフォンに対応

---

## 開発

すべてのコードはDockerコンテナ内で実行されるため、ローカルPCを汚しません。

- **Backend**: `./backend` ディレクトリ内のコードが自動的にホットリロードされます
- **Frontend**: `./frontend` ディレクトリ内のコードが自動的にホットリロードされます

### プロジェクト構成

```
cpa-dashboard/
├── backend/              # FastAPI バックエンド
│   ├── app/             # アプリケーションコード
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # React フロントエンド
│   ├── src/
│   │   ├── features/    # 機能別モジュール
│   │   ├── api/         # APIクライアント
│   │   └── hooks/       # グローバルHooks
│   ├── Dockerfile
│   └── package.json
├── docs/                 # 詳細ドキュメント
│   ├── ARCHITECTURE.md
│   └── CONFIG_GUIDE.md
├── docker-compose.yml
├── README.md            # このファイル
└── README_DOCKER.md     # Dockerセットアップガイド
```

---

## データベース

SQLiteを使用しています。データベースファイル（`cpa_dashboard.db`）はDockerコンテナ内の`/app/data`ディレクトリに自動的に作成され、`backend_db`ボリュームに永続化されます。

---

## ライセンス

（ライセンス情報があれば記載してください）
