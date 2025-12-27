import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Trophy, TrophyPersistedById, TrophyTrigger } from '../types/trophy';

const STORAGE_KEY = 'trophySystem:v1';

function safeParsePersisted(raw: string | null): TrophyPersistedById {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as TrophyPersistedById;
    return {};
  } catch {
    return {};
  }
}

function nowIso() {
  return new Date().toISOString();
}

function uniqAppend(prev: string[], next: string[]) {
  const set = new Set(prev);
  const out = [...prev];
  for (const id of next) {
    if (!set.has(id)) {
      set.add(id);
      out.push(id);
    }
  }
  return out;
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
export function useTrophySystem({ trophies, storageKey = STORAGE_KEY, allowRepeatUnlock = false }: Options) {
  const [persistedById, setPersistedById] = useState<TrophyPersistedById>(() =>
    safeParsePersisted(typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey))
  );
  const [queue, setQueue] = useState<string[]>([]);
  // UI演出用キュー（「一括表示→順次消滅」等に使用）
  const [fxQueue, setFxQueue] = useState<string[]>([]);

  // 多重実行ガード（同時unlockの競合を避ける）
  const isProcessingRef = useRef(false);

  // コンボ管理用の状態（トロフィーIDごとに最後のイベント時刻とカウントを保持）
  const comboStateRef = useRef<Record<string, { lastEventMs: number | null; count: number }>>({});

  // 永続化：獲得情報のみ保存（conditionは保存できない）
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(persistedById));
    } catch (e) {
      // 失敗してもアプリ動作は継続
      console.warn('[TrophySystem] Failed to persist trophies:', e);
    }
  }, [persistedById, storageKey]);

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

  const unlockedIds = useMemo(() => new Set(Object.keys(persistedById)), [persistedById]);

  const unlockTrophy = useCallback(
    (id: string, patch?: { metadata?: Record<string, any>; unlockedAt?: string }) => {
      // NOTE:
      // Reactのバッチ更新下では setState の updater が即時に評価される保証がないため、
      // 「didUnlock」のような外部フラグに依存すると複数同時unlock時に通知(fxQueue)が落ちることがある。
      // ここでは“この呼び出しでunlockを試みるべきか”を先に判定し、fxQueue への積み込みも確実に行う。
      const alreadyUnlockedSnapshot = Boolean(persistedById[id]?.unlockedAt);
      if (alreadyUnlockedSnapshot && !allowRepeatUnlock) return;

      setPersistedById((prev: TrophyPersistedById) => {
        // 既に獲得済みならidempotent（競合・連続呼び出しの最終ガード）
        const alreadyUnlocked = Boolean(prev[id]?.unlockedAt);
        if (alreadyUnlocked && !allowRepeatUnlock) return prev;
        const nextUnlockedAt = patch?.unlockedAt ?? nowIso();
        const nextMeta = {
          ...(prev[id]?.metadata ?? {}),
          ...(patch?.metadata ?? {}),
        };
        return {
          ...prev,
          [id]: {
            unlockedAt: nextUnlockedAt,
            metadata: nextMeta,
          },
        };
      });

      // 直接unlockされたトロフィーも通知UIに流す（重複はuniqAppendで吸収）
      setFxQueue((prev: string[]) => uniqAppend(prev, [id]));
    },
    [allowRepeatUnlock, persistedById]
  );

  const enqueueUnlocks = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setQueue((prev: string[]) => uniqAppend(prev, ids));
  }, []);

  const enqueueFx = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setFxQueue((prev: string[]) => uniqAppend(prev, ids));
  }, []);

  const dequeueFx = useCallback((count: number) => {
    if (count <= 0) return;
    setFxQueue((prev: string[]) => prev.slice(count));
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
        if (!allowRepeatUnlock && unlockedIds.has(t.id)) return false;
        try {
          return Boolean(t.condition(appState));
        } catch {
          return false;
        }
      });

      const ids = candidates.map((t) => t.id);
      // 演出は「一括表示」したいので、先にfxQueueへ積む
      enqueueFx(ids);
      // 実データ更新は従来通りキューで順次unlock
      enqueueUnlocks(ids);
      return candidates.map((t) => t.id);
    },
    [allowRepeatUnlock, enqueueFx, enqueueUnlocks, trophies, unlockedIds]
  );

  // キューを順次処理（複数同時でも順番に確実に更新）
  useEffect(() => {
    if (!queue.length) return;
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    const id = queue[0];

    // unlock→dequeueを同期的に行う（state更新は関数型なので競合しにくい）
    unlockTrophy(id);
    setQueue((prev: string[]) => prev.slice(1));

    // 次のtickで解除（連続処理を許可）
    const t = window.setTimeout(() => {
      isProcessingRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
  }, [queue, unlockTrophy]);

  /**
   * トロフィーイベントハンドラ（コンボ管理付き）
   * - トロフィーIDを受け取り、そのトロフィーのメタデータからcomboThresholdとcomboWindowMsを取得
   * - コンボウィンドウ内ならカウントを増やす、そうでなければリセット
   * - 閾値に達したらunlockTrophyを呼び出す
   */
  const handleTrophyEvent = useCallback(
    (trophyId: string) => {
      const trophy = trophiesWithStatus.find((t) => t.id === trophyId);
      if (!trophy) return;

      // 既に獲得済みなら処理しない
      if (trophy.unlockedAt && !allowRepeatUnlock) return;

      // メタデータからコンボ設定を取得
      const comboThreshold = trophy.metadata?.comboThreshold as number | undefined;
      const comboWindowMs = trophy.metadata?.comboWindowMs as number | undefined;

      // コンボ設定がない場合は、即座にunlock（従来の動作）
      if (comboThreshold === undefined || comboWindowMs === undefined) {
        unlockTrophy(trophyId);
        return;
      }

      // コンボ管理
      const nowMs = Date.now();
      const state = comboStateRef.current[trophyId] ?? { lastEventMs: null, count: 0 };
      const last = state.lastEventMs;

      if (last != null && nowMs - last <= comboWindowMs) {
        // コンボウィンドウ内：カウントを増やす
        state.count += 1;
      } else {
        // コンボウィンドウ外：リセット
        state.count = 1;
      }
      state.lastEventMs = nowMs;
      comboStateRef.current[trophyId] = state;

      // 閾値に達したらunlock
      if (state.count >= comboThreshold) {
        unlockTrophy(trophyId, {
          metadata: {
            count: state.count,
            windowMs: comboWindowMs,
          },
        });
        // リセット
        state.count = 0;
        state.lastEventMs = null;
      }
    },
    [trophiesWithStatus, allowRepeatUnlock, unlockTrophy]
  );

  const resetTrophies = useCallback(() => {
    setPersistedById({});
    setQueue([]);
    setFxQueue([]);
    comboStateRef.current = {};
  }, []);

  return {
    /** マスター＋獲得状態をマージした一覧 */
    trophies: trophiesWithStatus,
    /** 獲得情報（永続化される領域） */
    persistedById,
    /** 演出用キュー（UI側で利用可能） */
    queue,
    fxQueue,
    dequeueFx,
    unlockTrophy,
    checkTrophies,
    handleTrophyEvent,
    resetTrophies,
  };
}


