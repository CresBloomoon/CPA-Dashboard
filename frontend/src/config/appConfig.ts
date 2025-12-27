/**
 * アプリ全体の「手触り（UX）」を調整するための集中管理パラメータ群です。
 * ここを変更するだけで、タイマー/アニメ/見た目/表示上限などの挙動をまとめて調整できます。
 *
 * - 基本方針: “値が散らばらない” ように、ここへ寄せてから参照する
 * - コメント方針: 人間が直感で調整できるように「体感の目安」を併記する
 */
export const TIMER_SETTINGS = {
  POMODORO: {
    /**
     * ポモドーロタイマーのデフォルト値（新規コンテナ生成時の初期値）。
     * 
     * ⚠️ 重要: これらはアプリ全体の「唯一の真実の源（Single Source of Truth）」です。
     * - この値を変更すると、新規ユーザー（localStorageが空）の初期値が変わります。
     * - 他の箇所（useTimerController.ts, domain/persistence.ts等）は全てこの値を参照しています。
     * - ハードコードされた値（25, 5, 3等）を他のファイルに書かないでください。
     * - この値を変更する際は、全ての参照箇所が自動的に新しい値を反映します。
     */
    DEFAULT: {
      /** 集中時間のデフォルト（分） */
      FOCUS_MINUTES: 25, // 15だと短め / 25は標準 / 50は没入寄り
      /** 休憩時間のデフォルト（分） */
      BREAK_MINUTES: 5, // 3だと短め / 5は標準 / 10はゆったり
      /** セット数のデフォルト */
      SETS: 3, // 1: 標準 / 3〜5: 集中セッション / 10: 最大
    },
    RANGE: {
      FOCUS: {
        /** 集中時間の最小（分） */
        MIN_MINUTES: 1, // 5〜10: キビキビ / 25+: じっくり
        /** 集中時間の最大（分） */
        MAX_MINUTES: 120, // 60: 長め / 90〜120: “答練”級
      },
      BREAK: {
        /** 休憩時間の最小（分） */
        MIN_MINUTES: 1, // 3だと切替が速い / 5は安定
        /** 休憩時間の最大（分） */
        MAX_MINUTES: 30, // 15: 標準 / 30: しっかり休む
      },
      SETS: {
        /** セット数の最小 */
        MIN: 1, // 1: 標準
        /** セット数の最大 */
        MAX: 10, // 10: 最大
      },
    },
    /** UIで変更する際の刻み幅（分） */
    STEP_MINUTES: 1, // 1: 細かい / 5: 直感的 / 10: 大味
    SETTINGS_POPOVER: {
      /** ホバーしてからPopoverを開くまでの遅延（ms） */
      HOVER_OPEN_DELAY_MS: 400, // 200: 速い / 400: 落ち着く / 600: かなり慎重
      /** ホバー解除後に閉じるまでの猶予（ms） */
      CLOSE_GRACE_MS: 80, // 0: キビキビ / 80: 自然 / 150: 余裕あり
    },
  },
  ENGINE: {
    /** タイマーのtick間隔（ms） */
    TICK_INTERVAL_MS: 1000, // 1000: 秒単位で安定 / 250: 滑らかだが負荷増
  },
  IMMERSIVE: {
    /** 没入モード：無操作でUIを隠すまでの時間（ms） */
    IDLE_HIDE_MS: 3000, // 1500: すぐ消える / 3000: 標準 / 5000: ゆっくり
  },
  FEEDBACK: {
    /** トースト：記録完了メッセージの表示時間（ms） */
    TOAST_DURATION_MS: 3000, // 1500: 速い / 3000: 標準 / 5000: しっかり見せる
    /** 全画面ヒント：表示時間（ms） */
    FULLSCREEN_HINT_DURATION_MS: 1600, // 800: 短い / 1600: 標準 / 2400: 長め
  },
  CHECKBOX: {
    /** チェックボックス：バッチ完了（まとめてAPI更新）までの猶予（ms） */
    BATCH_COMPLETION_DELAY_MS: 1500, // 800: キビキビ / 1500: “シュパッ” / 2500: じっくり
  },
} as const;

export const ANIMATION_THEME = {
  IMMERSIVE: {
    /** フェードアウト時間（秒） */
    FADE_OUT_S: 1.0, // 0.5: 標準 / 1.0: ふんわり消える / 1.5: かなりゆったり
    /** フェードイン時間（秒） */
    FADE_IN_S: 0.15, // 0.1: 速い / 0.15: 標準（パッと表示） / 0.25: しっとり
  },
  DURATIONS_S: {
    /** 汎用フェード時間（秒）（例: overlay） */
    FADE: 0.2, // 0.12: 速い / 0.2: 標準 / 0.3: ふわっと
    /** Popover：表示/非表示のスケール・フェード時間（秒） */
    POPOVER: 0.22, // 0.15: 速い / 0.22: 標準 / 0.35: リッチ
    /** ホバー演出（枠など）のフェード時間（秒） */
    HOVER_FEEDBACK: 0.2, // 0.12: 速い / 0.2: 標準
    /** 全画面ヒント：表示アニメ時間（秒） */
    FULLSCREEN_HINT: 0.25, // 0.18: 速い / 0.25: 標準 / 0.35: ゆったり
    /** 中央アイコン差し替え：表示アニメ時間（秒） */
    CENTER_ICON_SWAP: 0.1, // 0.06: 即時 / 0.1: 標準 / 0.18: 余韻
    /** ポモドーロ：科目カラーリング登場（展開）アニメ時間（秒） */
    POMODORO_RING_INTRO: 0.6, // 0.5: キビキビ / 0.6: 標準 / 0.7: ゆったり
    /** ポモドーロ終了：鼓動（Micro-Pulse）1周期（秒） */
    POMODORO_FINISH_MICRO_PULSE: 1.2, // 0.9: キビキビ / 1.2: 標準 / 1.6: ゆったり
    /** ポモドーロ終了：波紋（Ripple）1周期（秒） */
    POMODORO_FINISH_RIPPLE: 1.2, // 0.9: 速い / 1.2: 標準 / 1.6: ゆっくり
  },
  LOOPS: {
    /** 稼働中グロウ：呼吸の周期（秒） */
    GLOW_BREATH_S: 3.2, // 2.0: 速い / 3.2: 標準 / 5.0: ゆったり
    /** ポモドーロ終了時パルス：呼吸の周期（秒） */
    POMODORO_FINISH_PULSE_S: 2.6, // 2.0: 速い / 2.6: 標準 / 3.2: ゆったり
  },
  SCALES: {
    GLOW: {
      /** 稼働中グロウ：呼吸の最大スケール */
      BREATH_MAX: 1.02, // 1.01: さりげない / 1.02: 標準 / 1.05: 目立つ
    },
    BUTTON: {
      /** 小さなボタン：ホバー時のスケール */
      HOVER: 1.06, // 1.03: 控えめ / 1.06: 標準 / 1.10: 元気
      /** 小さなボタン：押下時のスケール */
      TAP: 0.94, // 0.97: 柔らか / 0.94: 標準 / 0.90: 強め
    },
    POMODORO: {
      /** 科目カラーリング登場：開始スケール（リング） */
      RING_INTRO_START: 0.8, // 0.75: 目立つ / 0.8: 標準 / 0.9: さりげない
      /** 科目カラーリング登場：開始スケール（数字/背景の追従） */
      CONTENT_INTRO_START: 0.96, // 0.94: しっかり / 0.96: 標準 / 0.98: さりげない
      /** 終了時：鼓動の最大スケール */
      FINISH_MICRO_PULSE_PEAK: 1.15, // 1.10: しっかり / 1.15: 標準 / 1.20: 強め
      /** 終了時：波紋の到達スケール */
      FINISH_RIPPLE_END: 1.22, // 1.14: 控えめ / 1.22: 標準 / 1.30: 大きめ
    },
  },
  OPACITIES: {
    POMODORO: {
      /** 終了時：波紋の開始不透明度（0..1） */
      FINISH_RIPPLE_START: 0.4, // 0.25: 控えめ / 0.4: 標準 / 0.55: かなり見える
      /** 終了時：集中→休憩の一瞬フラッシュ（0..1） */
      FINISH_FOCUS_FLASH_PEAK: 0.35, // 0.25: 控えめ / 0.35: 標準 / 0.45: 強め
    },
  },
  COUNTS: {
    POMODORO: {
      /** 終了時：鼓動の回数（2〜3推奨） */
      FINISH_MICRO_PULSE: 3,
      /** 終了時：波紋の枚数（2〜3推奨） */
      FINISH_RIPPLE: 3,
    },
  },
  DELAYS_S: {
    POMODORO: {
      /** 終了時：波紋の間隔（秒） */
      FINISH_RIPPLE_GAP: 0.28, // 0.18: 近い / 0.28: 標準 / 0.4: 離す
    },
  },
  EASINGS: {
    /**
     * “最後だけ少し弾む” 展開演出（cubic-bezier）。
     * - 普通のeaseOutより「よし、集中するぞ」感が出る
     */
    OUT_BACK: [0.34, 1.56, 0.64, 1] as const,
  },
  SPRINGS: {
    /** 小さなUIのスプリング（例: 検索バーのフォーカス演出） */
    UI: { type: 'spring', stiffness: 350, damping: 26 }, // stiffness↑でキビキビ / damping↑で収まり良い
    /** アイコンボタン向け：少し締まったスプリング */
    UI_TIGHT: { type: 'spring', stiffness: 350, damping: 22 }, // damping↓で弾みやすい
    /** サイドバーのアクティブピル：スプリング */
    SIDEBAR_PILL: { type: 'spring', bounce: 0.2, duration: 0.4 }, // bounce↑で遊び心 / duration↑でゆったり
    /** タイマーモードタブのインジケータ：スプリング */
    TIMER_MODE_TABS: { type: 'spring', stiffness: 360, damping: 42, mass: 1.2 }, // stiffness↑で速い / damping↑で落ち着く
    /** モーダル（Project/Todo/Confirm）：スプリング */
    MODAL: { type: 'spring', stiffness: 300, damping: 30 }, // stiffness↑でキビキビ / damping↑で“ドスン”減
  },
} as const;

export const UI_VISUALS = {
  POPOVER: {
    /** ポモドーロ設定Popover：横幅（px） */
    POMODORO_SETTINGS_WIDTH_PX: 320, // 280: タイト / 320: 標準 / 360: 余裕
    /** Popover背景：不透明度（0..1） */
    BG_OPACITY: 0.7, // 0.6: 透明感 / 0.7: 標準 / 0.85: しっかり
  },
  TIME_HOVER: {
    /** 時刻ホバー枠：不透明度（0..1） */
    RING_OPACITY: 0.2, // 0.12: さりげない / 0.2: 標準 / 0.3: 目立つ
  },
  CHECKBOX: {
    /** iOS風チェックボックス：直径（px） */
    DIAMETER_PX: 25, // 22: 小さめ / 25: 標準 / 28: 大きめ
    /** iOS風チェックボックス：枠線の太さ（px） */
    BORDER_WIDTH_PX: 1, // 1: 繊細 / 2: しっかり
  },
  COLORS: {
    /** Tailwind blue-500 相当（検索/チップなどの青） */
    BLUE_500: '#3b82f6',
    /** Tailwind sky-400 相当（タイマーの空色アクセント） */
    SKY_400: '#38bdf8',
    /** サークル/ガラス面の白っぽいストローク（透明感） */
    WHITE_STROKE: 'rgba(255,255,255,0.20)',
    /** ポモドーロ終了（休憩の合図）：深緑寄りのトーン */
    POMODORO_FINISH_GREEN: 'rgba(16, 94, 70, 1)', // 落ち着いた深緑（teal-900系）
    /** ポモドーロ終了（達成/区切り）：温かいオレンジ */
    POMODORO_FINISH_ORANGE: 'rgba(249, 115, 22, 1)', // orange-500系
  },
  FONT_SIZES: {
    /**
     * タイマー中央の数字（Tailwindクラス相当）。
     * text-6xl: 落ち着く / text-7xl: 標準 / text-8xl: 迫力
     */
    TIMER_DIGITS_CLASS: 'text-7xl',
  },
  TIMER_DISPLAY: {
    /**
     * タイマー中央の数字表示のスタイル定義（一元化）。
     * すべてのモード（ポモドーロ/ストップウォッチ/手動入力）で統一。
     * 
     * スタイルの詳細:
     * - fontSize: text-7xl (4.5rem / 72px)
     * - fontWeight: font-extralight (200)
     * - color: text-slate-200 (rgb(226, 232, 240))
     * - letterSpacing: tracking-[0.02em] (0.02em)
     * - fontFamily: tabular-nums (等幅数字)
     */
    DIGITS: {
      /** フォントサイズクラス */
      SIZE_CLASS: 'text-7xl',
      /** フォントウェイト（extralight: 細い / light: やや細い / normal: 標準 / medium: やや太い / semibold: 太め / bold: 太い） */
      WEIGHT_CLASS: 'font-medium',
      /** テキストカラー（不透明度100%） */
      COLOR_CLASS: 'text-white',
      /** 文字間隔 */
      TRACKING_CLASS: 'tracking-[0.02em]',
      /** 等幅数字（tabular-nums） */
      TABULAR_NUMS: 'tabular-nums',
      /**
       * 完全なTailwindクラス文字列（一元化されたスタイル定義）。
       * この定義を変更するだけで、すべてのモードの時刻表示が連動して変わります。
       */
      CLASS: 'text-7xl font-medium text-white tabular-nums tracking-[0.02em]',
    },
    /**
     * ポモドーロ待機中（FOCUS/REST表示）のスタイル。
     * 通常の数字表示とは異なるサイズとウェイトを使用。
     * 
     * スタイルの詳細:
     * - fontSize: text-4xl (2.25rem / 36px)
     * - fontWeight: font-medium (500)
     * - color: text-slate-200 (rgb(226, 232, 240))
     * - letterSpacing: tracking-[0.02em] (0.02em)
     */
    AWAITING_PHASE: {
      SIZE_CLASS: 'text-4xl',
      WEIGHT_CLASS: 'font-medium',
      COLOR_CLASS: 'text-white',
      TRACKING_CLASS: 'tracking-[0.02em]',
      /**
       * 完全なTailwindクラス文字列（ポモドーロ待機中専用）。
       */
      CLASS: 'text-4xl font-medium text-white tracking-[0.02em]',
    },
  },
  /**
   * ボタンクリックフィードバックのスタイル定義（一元化）。
   * タイマーサークル、科目選択ボタン、記録ボタンなどで統一された押下感を提供。
   */
  BUTTON_CLICK_FEEDBACK: {
    /**
     * 押下時のスタイルクラス（一元化）。
     * scale-[0.985]: 少し縮小（押し込む感）
     * translate-y-[1px]: 少し下に移動（沈む感）
     * bg-slate-900/45: 背景色を少し濃く
     * shadow-inner: 内側の影（凹み感）
     * 
     * この定義を変更するだけで、すべてのボタンの押下フィードバックが連動して変わります。
     */
    ACTIVE_CLASS: 'scale-[0.985] translate-y-[1px] bg-slate-900/45 shadow-inner',
  },
} as const;

export const APP_LIMITS = {
  CALENDAR: {
    /** タイトル省略の文字数 */
    TITLE_TRUNCATE_CHARS: 8, // 6: かなり短い / 8: 標準 / 12: 余裕
    /** 未完了の最大表示件数（1日セル内） */
    MAX_INCOMPLETE_TODOS: 4, // 3: スッキリ / 4: 標準 / 6: 詰め込む
  },
  SETTINGS: {
    COLOR_PICKER: {
      /** カラーピッカーの幅（px） */
      WIDTH_PX: 200, // 180: タイト / 200: 標準 / 240: 余裕
      /** アンカーからの間隔（px） */
      GAP_PX: 8, // 4: 近い / 8: 標準 / 12: 離す
    },
  },
} as const;


