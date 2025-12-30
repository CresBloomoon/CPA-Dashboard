import type { Trophy } from '../types/trophy';

export type SubjectTrophyIconType = 'bronze' | 'silver' | 'gold' | 'platinum';

export type SubjectTrophyMaster = {
  id: string;
  subject: string;
  threshold: number; // hours
  title: string;
  iconType: SubjectTrophyIconType;
};

const SUBJECT_TROPHY_SUBJECTS: readonly string[] = [
  '財務会計論',
  '管理会計論',
  '企業法',
  '監査論',
  '租税法',
  '経営学',
  '経済学',
  '民法',
  '統計学',
] as const;

const SUBJECT_SLUG: Record<(typeof SUBJECT_TROPHY_SUBJECTS)[number], string> = {
  財務会計論: 'zaikei',
  管理会計論: 'kanri',
  企業法: 'kigyou',
  監査論: 'kansa',
  租税法: 'sozei',
  経営学: 'keiei',
  経済学: 'keizai',
  民法: 'minpou',
  統計学: 'toukei',
};

const THRESHOLDS_HOURS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
const TITLE_SUFFIX_BY_STEP: readonly string[] = [
  'の第一歩',
  'の基礎固め',
  'が軌道に乗った',
  'が加速した',
  'が安定した',
  'が習慣になった',
  'が強みになった',
  'が武器になった',
  'が仕上がってきた',
  'を極めた',
];

function iconTypeForThreshold(threshold: number): SubjectTrophyIconType {
  if (threshold >= 100) return 'platinum';
  if (threshold >= 70) return 'gold';
  if (threshold >= 40) return 'silver';
  return 'bronze';
}

/** 科目別・累積学習時間トロフィー（10h..100h） */
export const SUBJECT_TROPHIES: readonly SubjectTrophyMaster[] = SUBJECT_TROPHY_SUBJECTS.flatMap((subject) => {
  const slug = SUBJECT_SLUG[subject];
  return THRESHOLDS_HOURS.map((threshold, idx) => {
    const suffix = TITLE_SUFFIX_BY_STEP[idx] ?? '達成';
    return {
      id: `${slug}-${threshold}`,
      subject,
      threshold,
      title: `${subject}${suffix}`,
      iconType: iconTypeForThreshold(threshold),
    };
  });
});

/**
 * トロフィーマスター（動作確認用のテストデータ）
 * NOTE: conditionは関数のため永続化されません（獲得状態は別途localStorageに保存）。
 */
export const TROPHIES: Trophy[] = [
  {
    id: 'timer_mash_10',
    trigger: 'immediate',
    shouldUnlock: () => false,
    title: 'タイム・イズ・マネー',
    description: 'タイマーボタンを10回連続でクリックした。',
    comment:
      'そのボタン連打速度は完全に「異常」。発生した時間は全て「異常仕損費」として処理しとくで。',
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
    shouldUnlock: () => false,
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
    shouldUnlock: () => false,
    title: 'テスト解除！',
    description: '即時系テストトロフィー',
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
    shouldUnlock: () => false,
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
    shouldUnlock: () => false,
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
    shouldUnlock: () => false,
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
    shouldUnlock: () => false,
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
  {
    id: 'midnight_special_audit',
    trigger: 'immediate',
    eventId: 'TIMER_START',
    shouldUnlock: () => {
      const h = new Date().getHours();
      return h === 2 || h === 3 || h === 4;
    },
    title: '深夜の特別採用手続',
    description: '深夜2時〜5時の間に学習を開始した。',
    comment: 'まだ起きてたん？ 集中力の実在性に疑義ありや。直ちに「睡眠」という手続を実施して。',
    icon: 'Moon',
    isSecret: true,
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
      shouldUnlock: () => false,
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


