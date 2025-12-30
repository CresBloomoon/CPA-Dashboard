import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Trophy, TrophyPersistedById, TrophyTrigger } from '../types/trophy';

const STORAGE_KEY_V1 = 'trophySystem:v1';
const STORAGE_KEY_V2 = 'trophySystem:v2';

function safeParsePersisted(raw: string | null): TrophyPersistedById {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    // 旧データ（level/currentValue等）が混ざっていても、安全に「unlockedAt/metadata」だけ抽出する
    const out: TrophyPersistedById = {};
    for (const [id, v] of Object.entries(parsed as Record<string, any>)) {
      if (!id) continue;
      const unlockedAt = typeof v?.unlockedAt === 'string' ? v.unlockedAt : null;
      const metadata = v?.metadata && typeof v.metadata === 'object' ? v.metadata : {};
      // 未獲得は保存しない運用なので、unlockedAtが無いならスキップ
      if (!unlockedAt) continue;
      out[id] = { unlockedAt, metadata };
    }
    return out;
  } catch {
    return {};
  }
}

function nowIso() {
  return new Date().toISOString();
}

type Options = {
  /** マスター定義（condition含む） */
  trophies: Trophy[];
  /** localStorageキー（必要なら差し替え） */
  storageKey?: string;
  /**
   * テスト用：既に獲得済みでも「再アンロック」できるようにする
   * - unlockedAt を更新
   * - 通知（fxQueue）も再発火
   */
  allowRepeatUnlock?: boolean;
};

/**
 * 汎用トロフィーシステム（ロジックのみ）
 * - 獲得状態（unlockedAt/metadata）をlocalStorageへ永続化
 * - checkTrophies(appState) で条件成立した未獲得トロフィーをキューへ積み、順次unlock
 */
export function useTrophySystem({ trophies, storageKey = STORAGE_KEY_V2, allowRepeatUnlock = false }: Options) {
  const effectiveKey = storageKey || STORAGE_KEY_V2;
  const [persistedById, setPersistedById] = useState<TrophyPersistedById>(() => {
    if (typeof window === 'undefined') return {};
    const rawV2 = window.localStorage.getItem(effectiveKey);
    if (rawV2) return safeParsePersisted(rawV2);
    const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
    return safeParsePersisted(rawV1);
  });

  // UI演出用キュー（獲得トースト）
  const [fxQueue, setFxQueue] = useState<Array<{ id: string; kind: 'unlock' }>>([]);

  // コンボ管理用の状態（トロフィーIDごとに最後のイベント時刻とカウントを保持）
  const comboStateRef = useRef<Record<string, { lastEventMs: number | null; count: number }>>({});

  // 永続化：獲得情報のみ保存（conditionは保存できない）
  useEffect(() => {
    try {
      window.localStorage.setItem(effectiveKey, JSON.stringify(persistedById));
    } catch (e) {
      // 失敗してもアプリ動作は継続
      console.warn('[TrophySystem] Failed to persist trophies:', e);
    }
  }, [persistedById, effectiveKey]);

  const trophiesWithStatus: Trophy[] = useMemo(() => {
    return trophies.map((t) => {
      const p = persistedById[t.id];
      return {
        ...t,
        unlockedAt: p?.unlockedAt ?? t.unlockedAt ?? null,
        metadata: p?.metadata ?? t.metadata ?? {},
      };
    });
  }, [persistedById, trophies]);

  const unlockTrophy = useCallback(
    (id: string, patch?: { metadata?: Record<string, any>; unlockedAt?: string }) => {
      const master = trophies.find((t) => t.id === id);
      if (!master) return;

      const already = Boolean(persistedById[id]?.unlockedAt ?? master.unlockedAt);
      if (already && !allowRepeatUnlock) return;

      const unlockedAt = patch?.unlockedAt ?? nowIso();
      const nextMeta = {
        ...(master.metadata ?? {}),
        ...(persistedById[id]?.metadata ?? {}),
        ...(patch?.metadata ?? {}),
      };

      setPersistedById((prev) => ({
        ...prev,
        [id]: {
          unlockedAt,
          metadata: nextMeta,
        },
      }));
      setFxQueue((prev) => [...prev, { id, kind: 'unlock' as const }]);
    },
    [allowRepeatUnlock, persistedById, trophies]
  );

  const dequeueFx = useCallback((count: number) => {
    if (count <= 0) return;
    setFxQueue((prev) => prev.slice(count));
  }, []);

  /**
   * 判定エンジン：
   * - appState（任意の全状態）を受け取り、未獲得でconditionがtrueのものを抽出
   * - 抽出IDをキューへ積む（重複排除）
   * - 以降は処理ループが順次unlockする
   */
  const checkTrophies = useCallback(
    (appState: any, opts?: { trigger?: TrophyTrigger }) => {
      const candidates = trophies.filter((t) => {
        if (opts?.trigger && t.trigger !== opts.trigger) return false;
        const isUnlocked = Boolean(persistedById[t.id]?.unlockedAt ?? t.unlockedAt);
        if (isUnlocked && !allowRepeatUnlock) return false;
        try {
          return Boolean(t.condition(appState));
        } catch {
          return false;
        }
      });
      for (const t of candidates) unlockTrophy(t.id);
      return candidates.map((t) => t.id);
    },
    [allowRepeatUnlock, persistedById, trophies, unlockTrophy]
  );

  /**
   * トロフィーイベントハンドラ（ドメイン知識はマスターデータへ）
   * - eventId が「トロフィーID」の場合：従来通りコンボ管理（metadataのcomboThreshold/comboWindowMs）
   * - eventId が「論理イベントID」の場合：eventIdに紐づくトロフィーのshouldUnlockを走査して解放
   */
  const handleTrophyEvent = useCallback(
    (eventId: string, context?: any) => {
      // 1) trophyId 直指定（既存呼び出し互換：timer_mash_10 等）
      const byId = trophiesWithStatus.find((t) => t.id === eventId);
      if (byId) {
        // メタデータからコンボ設定を取得
        const comboThreshold = byId.metadata?.comboThreshold as number | undefined;
        const comboWindowMs = byId.metadata?.comboWindowMs as number | undefined;

        // コンボ設定がない場合は、即座にMAX（従来の動作）
        if (comboThreshold === undefined || comboWindowMs === undefined) {
          unlockTrophy(eventId);
          return;
        }

        // コンボ管理
        const nowMs = Date.now();
        const state = comboStateRef.current[eventId] ?? { lastEventMs: null, count: 0 };
        const last = state.lastEventMs;

        if (last != null && nowMs - last <= comboWindowMs) {
          state.count += 1;
        } else {
          state.count = 1;
        }
        state.lastEventMs = nowMs;
        comboStateRef.current[eventId] = state;

        // 連打系は閾値到達で獲得
        if (state.count >= comboThreshold) {
          unlockTrophy(eventId, { metadata: { bestCombo: state.count, windowMs: comboWindowMs } });
        }
        return;
      }

      // 2) 論理イベントID（例: TIMER_START）
      const candidates = trophiesWithStatus.filter((t) => t.eventId === eventId);
      if (!candidates.length) return;

      for (const t of candidates) {
        try {
          const ok = typeof t.shouldUnlock === 'function' ? Boolean(t.shouldUnlock(context)) : false;
          if (ok) unlockTrophy(t.id);
        } catch {
          // no-op
        }
      }
    },
    [trophiesWithStatus, unlockTrophy]
  );

  const resetTrophies = useCallback(() => {
    setPersistedById({});
    setFxQueue([]);
    comboStateRef.current = {};
  }, []);

  return {
    /** マスター＋獲得状態をマージした一覧 */
    trophies: trophiesWithStatus,
    /** 獲得情報（永続化される領域） */
    persistedById,
    /** 演出用キュー（UI側で利用可能） */
    fxQueue,
    dequeueFx,
    unlockTrophy,
    checkTrophies,
    handleTrophyEvent,
    resetTrophies,
  };
}


