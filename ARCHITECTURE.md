# アーキテクチャ概要

## ディレクトリ構造

本プロジェクトは、クリーンアーキテクチャとDDD（ドメイン駆動設計）の原則に基づいて構造化されています。

### 機能別ディレクトリ構造

各機能は以下のレイヤーに分割されています：

```
features/[name]/
├── domain/              # 純粋なTypeScript（React依存なし）
│   ├── __tests__/      # ドメインロジックのユニットテスト
│   ├── *.ts            # エンティティ、値オブジェクト、ビジネスロジック
│   └── index.ts        # エクスポート
├── hooks/               # React Hooks（プレゼンテーションロジック）
├── components/          # 純粋なUIコンポーネント（Stateless/Functional）
└── types/               # 機能固有の型定義（オプション）
```

## Timer機能

### Domain層

- **state.ts**: タイマー状態の管理、開始/停止/リセットロジック
- **pomodoro.ts**: ポモドーロ関連の計算・判定ロジック
- **time.ts**: 時間フォーマット、変換ロジック
- **manual.ts**: 手動入力モード関連のロジック
- **persistence.ts**: 状態の永続化（シリアライゼーション）
- **types.ts**: ドメイン型定義

### Hooks層

- **useTimerController.ts**: タイマー制御ロジック（副作用管理）
- **TimerContext.tsx**: React Context提供

### Components層

- **StudyTimer.tsx**: タイマーUIコンポーネント（純粋な表示ロジック）
- **TimerModeTabs.tsx**: モード選択タブ
- **SubjectChart.tsx**: 科目別チャート表示
- **SummaryCards.tsx**: サマリーカード表示

## 設計原則

1. **Separation of Concerns**: UIとビジネスロジックの完全分離
2. **純粋関数**: Domain層は参照透過性を重視
3. **テストカバレッジ**: Domain層のテストカバレッジ100%
4. **型安全性**: TypeScriptの型システムを最大限活用（any禁止）






