export type TrophyTrigger = 'audit_report' | 'immediate';

export type Trophy = {
  /** 識別子 */
  id: string;
  /** 獲得タイミング */
  trigger: TrophyTrigger;
  /** UIイベント等の論理イベントID（イベント駆動で判定したい場合に使用） */
  eventId?: string;
  /** 体言止めの名前 */
  title: string;
  /** 獲得理由の説明文 */
  description: string;
  /** まーくんへの一言（一覧で表示する小ネタ） */
  comment?: string;
  /** アイコン名（UI側で解決） */
  icon: string;
  /** 獲得前は隠す */
  isSecret: boolean;
  /** 獲得日時（ISO文字列） */
  unlockedAt: string | null;
  /** 進捗やカウント等の汎用保存領域 */
  metadata: Record<string, any>;
  /**
   * イベント駆動の解放判定（永続化対象外）
   * - UI側の条件分岐を避けるため、ドメイン知識をマスターデータ側へ集約する
   */
  shouldUnlock?: (context?: any) => boolean;
  /** 全状態を受け取って判定する関数（永続化対象外） */
  condition: (state: any) => boolean;
};

/** localStorageに保存する“獲得情報のみ” */
export type TrophyPersisted = Pick<Trophy, 'unlockedAt' | 'metadata'>;

export type TrophyPersistedById = Record<string, TrophyPersisted>;


