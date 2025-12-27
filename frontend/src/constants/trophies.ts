import type { Trophy } from '../types/trophy';

/**
 * トロフィーマスター（動作確認用のテストデータ）
 * NOTE: conditionは関数のため永続化されません（獲得状態は別途localStorageに保存）。
 */
export const TROPHIES: Trophy[] = [
  {
    id: 'timer_mash_10',
    trigger: 'immediate',
    title: 'タイム・イズ・マネー',
    description: 'タイマーボタンを10回連続でクリックした。',
    comment:
      'バグ探しは仕事だけで十分や。そのボタン連打速度は完全に「異常」。発生した時間は全て「異常仕損費」として処理しとくで。',
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
    description: 'リマインダーを10回連続でクリックした。',
    comment: 'その連打、重要性の基準値を超えてるで',
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
    comment: '今のは本番じゃない。心を落ち着けろ。',
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
    comment: '「提出した気がする」じゃなくて、提出したんだ。えらい。',
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
    comment: '週次の締めができる人は、人生の締めも上手い（たぶん）。',
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
    comment: '休憩も勉強のうち。…って誰かが言ってた。知らんけど。',
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
    comment: '継続は力。メンタルも、ついでに強化。',
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
      comment: `テストは${i + 1}回目からが本番。気合い入れていけ。`,
      icon: 'Trophy',
      isSecret: false,
      unlockedAt: null,
      metadata: { batch: true, index: i + 1 },
      condition: (state: any) => Boolean(state?.__testBatch10),
    } satisfies Trophy;
  }),
];


