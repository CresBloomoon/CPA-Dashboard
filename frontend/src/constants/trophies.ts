import type { Trophy } from '../types/trophy';

/**
 * トロフィーマスター（動作確認用のテストデータ）
 * NOTE: conditionは関数のため永続化されません（獲得状態は別途localStorageに保存）。
 */
export const TROPHIES: Trophy[] = [
  {
    id: 'timer_mash_10',
    trigger: 'immediate',
    title: '無限プチプチ',
    description: 'タイマーボタンを10回連続でクリックした。',
    icon: 'Zap',
    isSecret: true,
    unlockedAt: null,
    metadata: {
      comboThreshold: 10,
      comboWindowMs: 500,
    },
    // イベント駆動でunlockTrophyから解放する（checkTrophiesでは解放しない）
    condition: () => false,
  },
  {
    id: 'reminder_mash_10',
    trigger: 'immediate',
    title: '無限プチプチ',
    description: 'リマインダーを10回連続でクリックした。たまには息抜きも必要。',
    icon: 'Zap',
    isSecret: true,
    unlockedAt: null,
    metadata: {
      comboThreshold: 10,
      comboWindowMs: 600,
    },
    // イベント駆動でunlockTrophyから解放する（checkTrophiesでは解放しない）
    condition: () => false,
  },
  {
    id: 'test_immediate',
    trigger: 'immediate',
    title: 'テスト解除！',
    description: '即時系テストトロフィー（checkTrophiesが呼ばれたら獲得可能）',
    icon: 'Sparkle',
    isSecret: false,
    unlockedAt: null,
    metadata: {},
    // 例: state.__testImmediate === true になったタイミングで獲得
    condition: (state: any) => Boolean(state?.__testImmediate),
  },
  {
    id: 'test_audit',
    trigger: 'audit_report',
    title: '週次報告完了！',
    description: '週次報告（audit report）後のテストトロフィー（stateのフラグで判定）',
    icon: 'ScrollText',
    isSecret: false,
    unlockedAt: null,
    metadata: {},
    // 例: state.auditReportCompleted === true になったタイミングで獲得
    condition: (state: any) => Boolean(state?.auditReportCompleted),
  },
  {
    id: 'weekly_report_first',
    trigger: 'audit_report',
    title: '週次決算完了',
    description: '初めて週次報告書を作成した',
    icon: 'ScrollText',
    isSecret: false,
    unlockedAt: null,
    metadata: {},
    // イベント駆動でunlockTrophyから解放する（checkTrophiesでは解放しない）
    condition: () => false,
  },
  {
    id: 'weekly_hours_70',
    trigger: 'audit_report',
    title: '超過勤務の達人',
    description: '週の合計学習時間が70時間を突破した',
    icon: 'Clock',
    isSecret: false,
    unlockedAt: null,
    metadata: {},
    // イベント駆動でunlockTrophyから解放する（checkTrophiesでは解放しない）
    condition: () => false,
  },
  {
    id: 'weekly_perfect_streak',
    trigger: 'audit_report',
    title: '不退転の決意',
    description: '1週間、1日も欠かさず学習を記録した',
    icon: 'Flame',
    isSecret: false,
    unlockedAt: null,
    metadata: {},
    // イベント駆動でunlockTrophyから解放する（checkTrophiesでは解放しない）
    condition: () => false,
  },
  // 一括表示UIの動作確認用（10個同時）
  ...Array.from({ length: 10 }).map((_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      id: `test_batch_${n}`,
      trigger: 'immediate' as const,
      title: `一括テスト ${n}！`,
      description: '一括獲得UIの動作確認用トロフィー',
      icon: 'Trophy',
      isSecret: false,
      unlockedAt: null,
      metadata: { batch: true, index: i + 1 },
      condition: (state: any) => Boolean(state?.__testBatch10),
    } satisfies Trophy;
  }),
];


