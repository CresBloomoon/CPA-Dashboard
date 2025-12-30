# トラブルシューティング

CPA Dashboardを使用する際によくある問題と解決方法をまとめています。

## 目次

1. [起動できない](#起動できない)
2. [エラーメッセージが出る](#エラーメッセージが出る)
3. [画面が表示されない](#画面が表示されない)
4. [データが消えた](#データが消えた)

---

## 起動できない

### ポートが既に使用されている

**エラーメッセージ**: 
```
Bind for 0.0.0.0:8000 failed: port is already allocated
```

**解決方法**: 

`.env`ファイルを作成してポート番号を変更します。

プロジェクトのルートディレクトリに`.env`ファイルを作成し、以下の内容を記載してください：

```env
BACKEND_PORT=8001
FRONTEND_PORT=5174
VITE_API_URL=http://localhost:8001
```

### Docker Desktopが起動しない

**症状**: `docker compose up`コマンドが失敗する

**解決方法**: 

1. Docker Desktopが起動していることを確認してください
2. Docker Desktopの設定で、リソース（メモリ、CPU）が十分に割り当てられていることを確認してください
3. Docker Desktopを再起動してみてください

---

## エラーメッセージが出る

### データベースファイルが見つからない

**症状**: アプリケーションが起動しない、またはエラーが表示される

**解決方法**: 

データベースファイルは自動的に作成されます。問題が続く場合は、以下を実行してください：

```bash
docker compose down -v
docker compose up --build
```

**注意**: このコマンドは**すべてのデータを削除**します。

### 依存関係のインストールに失敗する

**症状**: ビルドエラーが発生する

**解決方法**: 

```bash
docker compose build --no-cache
docker compose up
```

---

## 画面が表示されない

### ブラウザでアクセスできない

**確認事項**:

1. `docker compose ps`コマンドで、すべてのサービスが`healthy`状態になっているか確認してください
2. ブラウザのアドレスバーに正しいURLが入力されているか確認してください
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

### フロントエンドの変更が反映されない

**症状**: コードを変更してもブラウザに反映されない

**解決方法**: 

```bash
docker compose restart frontend
```

---

## データが消えた

### データベースのデータが消えた

**原因**: 

`docker compose down -v`コマンドを実行すると、ボリュームも一緒に削除されるため、データが失われます。

**予防方法**: 

データを保持したい場合は、以下のコマンドを使用してください：

```bash
# データを保持したまま停止
docker compose down

# データも削除して停止（注意：データが失われます）
docker compose down -v
```

**復元方法**: 

残念ながら、削除されたデータを復元することはできません。定期的にバックアップを取ることをお勧めします。

---

## その他の問題

### コンテナのログを確認したい

```bash
# すべてのサービスのログ
docker compose logs -f

# 特定のサービスのログ
docker compose logs -f backend
docker compose logs -f frontend
```

### コンテナを再起動したい

```bash
# すべてのコンテナを再起動
docker compose restart

# 特定のコンテナを再起動
docker compose restart backend
docker compose restart frontend
```

---

## サポート

問題が解決しない場合は、GitHubのIssuesで報告してください。






