export const TROPHY_CONFIG = {
  MAX_VISIBLE: 10, // 最大同時表示数
  WAIT_MS: 1300, // 全表示完了後の待機時間
  STEP_MS: 1000, // 退場時の間隔（短くするとシュシュシュッと消える）
  ENTER_S: 0.3, // 入場アニメーションの秒数
  EXIT_S: 0.6, // 退場アニメーションの秒数
  STAGGER_S: 0, // 入場時の時差（0なら完全一斉）
} as const;


