# 設定ガイド（CONFIG_GUIDE）

このドキュメントは `frontend/src/config/appConfig.ts` を元に、**調整パラメータの意味と影響範囲**を人間向けに一覧化したものです。

## 使い方

- **編集の基本**: まずは `appConfig.ts` の値を変更し、体感を確認してください。
- **単位**: `ms`（ミリ秒）, `s`（秒）, `px`（ピクセル）, `0..1`（不透明度）など。
- **反映**: 変更後、ブラウザをリロードすると反映されます（開発モードではホットリロードで自動反映）。

### タイマー関連（TIMER_SETTINGS）

| パス | 既定値 | 単位 | 何に効く？ | 主な影響箇所 |
|---|---:|---|---|---|
| `TIMER_SETTINGS.POMODORO.DEFAULT.FOCUS_MINUTES` | 25 | 分 | ポモドーロ集中の初期値 | `frontend/src/features/timer/context/TimerContext.tsx` |
| `TIMER_SETTINGS.POMODORO.DEFAULT.BREAK_MINUTES` | 5 | 分 | ポモドーロ休憩の初期値 | `frontend/src/features/timer/context/TimerContext.tsx` |
| `TIMER_SETTINGS.POMODORO.RANGE.FOCUS.MIN_MINUTES` | 5 | 分 | 集中時間の下限 | `frontend/src/features/timer/components/StudyTimer.tsx`（Popover） |
| `TIMER_SETTINGS.POMODORO.RANGE.FOCUS.MAX_MINUTES` | 120 | 分 | 集中時間の上限 | 同上 |
| `TIMER_SETTINGS.POMODORO.RANGE.BREAK.MIN_MINUTES` | 5 | 分 | 休憩時間の下限 | 同上 |
| `TIMER_SETTINGS.POMODORO.RANGE.BREAK.MAX_MINUTES` | 30 | 分 | 休憩時間の上限 | 同上 |
| `TIMER_SETTINGS.POMODORO.STEP_MINUTES` | 1 | 分 | ホイールで増減する刻み幅 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `TIMER_SETTINGS.POMODORO.SETTINGS_POPOVER.HOVER_OPEN_DELAY_MS` | 400 | ms | 時刻ホバー→設定Popover表示までの遅延 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `TIMER_SETTINGS.POMODORO.SETTINGS_POPOVER.CLOSE_GRACE_MS` | 80 | ms | 時刻ホバー解除→閉じるまでの猶予 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `TIMER_SETTINGS.ENGINE.TICK_INTERVAL_MS` | 1000 | ms | タイマーの内部更新間隔 | `frontend/src/features/timer/context/TimerContext.tsx` |
| `TIMER_SETTINGS.IMMERSIVE.IDLE_HIDE_MS` | 3000 | ms | 稼働中の無操作で没入モードに入るまで | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `TIMER_SETTINGS.FEEDBACK.TOAST_DURATION_MS` | 3000 | ms | 記録完了トーストの表示時間 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `TIMER_SETTINGS.FEEDBACK.FULLSCREEN_HINT_DURATION_MS` | 1600 | ms | 全画面ヒントの表示時間 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `TIMER_SETTINGS.CHECKBOX.BATCH_COMPLETION_DELAY_MS` | 1500 | ms | チェック連打を“まとめて完了”する猶予 | `frontend/src/features/kanban/components/AnimatedCheckbox.tsx` |

### アニメーション（ANIMATION_THEME）

| パス | 既定値 | 単位 | 何に効く？ | 主な影響箇所 |
|---|---:|---|---|---|
| `ANIMATION_THEME.IMMERSIVE.FADE_OUT_S` | 0.5 | s | 没入モードのフェードアウト速度 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.IMMERSIVE.FADE_IN_S` | 0.15 | s | 没入モードのフェードイン速度 | 同上 |
| `ANIMATION_THEME.DURATIONS_S.FADE` | 0.2 | s | 汎用フェード（overlay等） | `ConfirmDialog.tsx`, `ProjectCreateModal.tsx`, `TodoCreateModal.tsx`, `StudyTimer.tsx` |
| `ANIMATION_THEME.DURATIONS_S.POPOVER` | 0.22 | s | ポップオーバーの出入り | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.DURATIONS_S.HOVER_FEEDBACK` | 0.2 | s | ホバー枠などの出入り | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.DURATIONS_S.FULLSCREEN_HINT` | 0.25 | s | 全画面ヒントの出入り | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.DURATIONS_S.CENTER_ICON_SWAP` | 0.1 | s | タイマー中心のPlay/Pause背景アイコン切替 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.DURATIONS_S.POMODORO_RING_INTRO` | 0.6 | s | 科目カラーリング登場（展開）の時間 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.DURATIONS_S.POMODORO_FINISH_MICRO_PULSE` | 1.2 | s | 終了時の鼓動（1周期） | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.DURATIONS_S.POMODORO_FINISH_RIPPLE` | 1.2 | s | 終了時の波紋（1周期） | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.LOOPS.GLOW_BREATH_S` | 3.2 | s | 稼働中グロウの“呼吸”周期 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.LOOPS.POMODORO_FINISH_PULSE_S` | 2.6 | s | ポモドーロ終了パルスの“呼吸”周期 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.SCALES.GLOW.BREATH_MAX` | 1.02 | 倍率 | グロウが膨らむ最大値 | 同上 |
| `ANIMATION_THEME.SCALES.POMODORO.RING_INTRO_START` | 0.8 | 倍率 | リング登場の開始スケール | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.SCALES.POMODORO.CONTENT_INTRO_START` | 0.96 | 倍率 | 数字/背景の追従スケール | 同上 |
| `ANIMATION_THEME.SCALES.POMODORO.FINISH_MICRO_PULSE_PEAK` | 1.15 | 倍率 | 終了時の鼓動の強度 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.SCALES.POMODORO.FINISH_RIPPLE_END` | 1.22 | 倍率 | 終了時の波紋の広がり | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.SCALES.BUTTON.HOVER` | 1.06 | 倍率 | 小ボタンのホバー拡大 | `frontend/src/features/kanban/components/TodoList/index.tsx` |
| `ANIMATION_THEME.SCALES.BUTTON.TAP` | 0.94 | 倍率 | 小ボタンの押下縮小 | 同上 |
| `ANIMATION_THEME.OPACITIES.POMODORO.FINISH_RIPPLE_START` | 0.4 | 0..1 | 波紋の初期不透明度 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.OPACITIES.POMODORO.FINISH_FOCUS_FLASH_PEAK` | 0.35 | 0..1 | 集中終了フラッシュの強度 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.COUNTS.POMODORO.FINISH_MICRO_PULSE` | 3 | 回 | 微小鼓動の回数 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.COUNTS.POMODORO.FINISH_RIPPLE` | 3 | 枚 | 波紋の枚数 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.DELAYS_S.POMODORO.FINISH_RIPPLE_GAP` | 0.28 | s | 波紋の間隔 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `ANIMATION_THEME.SPRINGS.UI` | - | - | 小UI向けスプリング（検索バー等） | `frontend/src/features/kanban/components/TodoList/SearchBar.tsx` |
| `ANIMATION_THEME.SPRINGS.UI_TIGHT` | - | - | アイコンボタン向けスプリング | `frontend/src/features/kanban/components/TodoList/index.tsx` |
| `ANIMATION_THEME.SPRINGS.SIDEBAR_PILL` | - | - | サイドバーの選択ピル移動 | `frontend/src/features/shared/components/Sidebar.tsx` |
| `ANIMATION_THEME.SPRINGS.TIMER_MODE_TABS` | - | - | タイマーモードタブのインジケータ | `frontend/src/features/timer/components/TimerModeTabs.tsx` |
| `ANIMATION_THEME.SPRINGS.MODAL` | - | - | モーダルの出入り | `ConfirmDialog.tsx`, `ProjectCreateModal.tsx`, `TodoCreateModal.tsx` |
| `ANIMATION_THEME.EASINGS.OUT_BACK` | - | bezier | “最後だけ少し弾む” 展開イージング | `frontend/src/features/timer/components/StudyTimer.tsx` |

### 見た目（UI_VISUALS）

| パス | 既定値 | 単位 | 何に効く？ | 主な影響箇所 |
|---|---:|---|---|---|
| `UI_VISUALS.POPOVER.POMODORO_SETTINGS_WIDTH_PX` | 320 | px | ポモドーロ設定Popoverの横幅 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `UI_VISUALS.POPOVER.BG_OPACITY` | 0.7 | 0..1 | Popover背景の不透明度 | （将来統一用：現在はクラス指定が主） |
| `UI_VISUALS.TIME_HOVER.RING_OPACITY` | 0.2 | 0..1 | 時刻ホバー枠の目立ち具合 | （将来統一用：現在はクラス指定が主） |
| `UI_VISUALS.CHECKBOX.DIAMETER_PX` | 25 | px | iOS風チェックボックスのサイズ | `frontend/src/features/kanban/components/AnimatedCheckbox.tsx` |
| `UI_VISUALS.CHECKBOX.BORDER_WIDTH_PX` | 1 | px | iOS風チェックボックスの枠線 | 同上 |
| `UI_VISUALS.COLORS.BLUE_500` | #3b82f6 | color | 青（チップ/検索等） | （将来統一用） |
| `UI_VISUALS.COLORS.SKY_400` | #38bdf8 | color | 空色（タイマー系アクセント） | （将来統一用） |
| `UI_VISUALS.COLORS.POMODORO_FINISH_GREEN` | rgba(16, 94, 70, 1) | color | ポモドーロ終了（休憩の合図）の深緑 | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `UI_VISUALS.COLORS.POMODORO_FINISH_ORANGE` | rgba(249, 115, 22, 1) | color | ポモドーロ終了（達成/区切り）のオレンジ | `frontend/src/features/timer/components/StudyTimer.tsx` |
| `UI_VISUALS.FONT_SIZES.TIMER_DIGITS_CLASS` | text-7xl | class | タイマー中央数字のサイズ | （将来統一用） |

### 表示上限（APP_LIMITS）

| パス | 既定値 | 単位 | 何に効く？ | 主な影響箇所 |
|---|---:|---|---|---|
| `APP_LIMITS.CALENDAR.TITLE_TRUNCATE_CHARS` | 8 | 文字 | カレンダー内のタイトル省略 | `frontend/src/features/calendar/components/CalendarView.tsx` |
| `APP_LIMITS.CALENDAR.MAX_INCOMPLETE_TODOS` | 4 | 件 | 1日セル内の未完了最大表示 | `frontend/src/features/calendar/components/CalendarView.tsx` |
| `APP_LIMITS.SETTINGS.COLOR_PICKER.WIDTH_PX` | 200 | px | 設定画面カラーピッカーの幅 | `frontend/src/features/shared/components/SettingsView.tsx` |
| `APP_LIMITS.SETTINGS.COLOR_PICKER.GAP_PX` | 8 | px | ピッカー表示位置の余白 | `frontend/src/features/shared/components/SettingsView.tsx` |


