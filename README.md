# CPA Dashboard

🚀 **3分で起動完了** - 公認会計士受験生のための学習進捗管理アプリ

---

## 📸 こんなことができます

> 💡 **プレースホルダー**: ここにアプリのスクリーンショットを追加してください

<!-- 
スクリーンショットの追加方法:
1. アプリを起動してスクリーンショットを撮影
2. 画像を `docs/images/` ディレクトリに保存
3. 以下のようにマークダウンを追加:

![メイン画面](docs/images/main-screen.png)
![タイマー機能](docs/images/timer-feature.png)
![学習進捗グラフ](docs/images/progress-chart.png)
-->

**公認会計士受験生の、公認会計士受験生による、公認会計士受験生のためのアプリ**

- ⏱️ 学習時間の記録と管理
- 📊 学習進捗の可視化
- ✅ リマインダー機能
- 📅 カレンダー表示
- 📋 プロジェクト管理

---

## ⚡ たった3ステップで起動

> **Step 1: Dockerをインストール**  
> [Docker Desktop](https://www.docker.com/products/docker-desktop/)をダウンロードしてインストールしてください。
> 
> *💻 Windows/Mac/Linuxすべてに対応しています*

---

> **Step 2: プロジェクトをダウンロード**
> 
> ```bash
> git clone <repository-url>
> cd CPA-Dashboard
> ```
> 
> *または、[ZIPファイルとしてダウンロード](https://github.com/your-username/CPA-Dashboard/archive/main.zip)して解凍してください*

---

> **Step 3: 起動する**
> 
> ```bash
> docker compose up --build
> ```
> 
> *⏱️ 初回のみ数分かかります。以下のメッセージが表示されたら準備完了です！*
> ```
> ✅ cpa_backend  | Application startup complete.
> ✅ cpa_frontend | VITE ready
> ```

---

## 🌐 アクセス方法

起動が完了したら、ブラウザで以下のURLを開いてください：

🔗 **http://localhost:5173**

<details>
<summary>その他のURL（クリックで展開）</summary>

- Backend API: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs

</details>

---

<details>
<summary>❓ 困ったときは（クリックで展開）</summary>

エラーが出た、起動しない、など問題が発生した場合は、[トラブルシューティングガイド](docs/TROUBLESHOOTING.md)をご覧ください。

</details>

---

<details>
<summary>📚 もっと詳しく知りたい方へ（クリックで展開）</summary>

- **Dockerの設定方法**: [README_DOCKER.md](./README_DOCKER.md)
- **カスタマイズ方法**: [docs/CONFIG_GUIDE.md](./docs/CONFIG_GUIDE.md)
- **アーキテクチャについて**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

</details>

---

<details>
<summary>🔧 開発者向け情報（クリックで展開）</summary>

### 設計思想

本プロジェクトは、**クリーンアーキテクチャ**と**DDD（ドメイン駆動設計）**の原則に基づいて設計されています。

- **Separation of Concerns**: UIとビジネスロジックの完全分離
- **純粋関数**: Domain層は参照透過性を重視
- **テストカバレッジ**: Domain層のテストカバレッジ100%
- **型安全性**: TypeScriptの型システムを最大限活用

### 開発

すべてのコードはDockerコンテナ内で実行されるため、ローカルPCを汚しません。

- **Backend**: `./backend` ディレクトリ内のコードが自動的にホットリロードされます
- **Frontend**: `./frontend` ディレクトリ内のコードが自動的にホットリロードされます

詳細は[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)を参照してください。

</details>

---

## 📝 ライセンス

（ライセンス情報があれば記載してください）
