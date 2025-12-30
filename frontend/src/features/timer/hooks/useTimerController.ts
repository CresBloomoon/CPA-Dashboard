import { useEffect, useMemo, useRef, useState } from 'react';
import { TIMER_SETTINGS } from '../../../config/appConfig';
import type { TimerDefaults, TimerRanges, TimerState } from '../domain';
import {
  createInitialTimerState,
  deserializeTimerState,
  formatClockFromSeconds,
  resetTimer as resetDomainTimer,
  serializeTimerState,
  setManualHours as setDomainManualHours,
  setManualMinutes as setDomainManualMinutes,
  setMode as setDomainMode,
  setPomodoroBreakMinutes as setDomainPomodoroBreakMinutes,
  setPomodoroFocusMinutes as setDomainPomodoroFocusMinutes,
  setPomodoroSets as setDomainPomodoroSets,
  startTimer as startDomainTimer,
  stopTimer as stopDomainTimer,
  tick as tickDomain,
  loadSyncState,
  saveSyncState,
  getOrCreateSession,
  type StudyTimeSyncState,
} from '../domain';

import { toLocalDateKey } from '../../../utils/dateKey';

const STORAGE_KEY = 'studyTimerState';

/**
 * タイマーのデフォルト値を取得する（新規コンテナ生成時の初期値）。
 * 
 * ⚠️ 重要: この関数は `TIMER_SETTINGS.POMODORO.DEFAULT` を参照する唯一の入口です。
 * - デフォルト値は `appConfig.ts` で一元管理されています。
 * - ハードコードされた値（25, 5, 3等）をここに書かないでください。
 * - 値を変更する場合は `appConfig.ts` の `TIMER_SETTINGS.POMODORO.DEFAULT` を変更してください。
 */
function getTimerDefaults(): TimerDefaults {
  return {
    focusMinutes: TIMER_SETTINGS.POMODORO.DEFAULT.FOCUS_MINUTES,
    breakMinutes: TIMER_SETTINGS.POMODORO.DEFAULT.BREAK_MINUTES,
    sets: TIMER_SETTINGS.POMODORO.DEFAULT.SETS,
    mode: 'stopwatch', // 初期状態（新規コンテナ生成時）はストップウォッチモード
  };
}

function getTimerRanges(): TimerRanges {
  return {
    sets: { min: TIMER_SETTINGS.POMODORO.RANGE.SETS.MIN, max: TIMER_SETTINGS.POMODORO.RANGE.SETS.MAX },
    focus: { min: TIMER_SETTINGS.POMODORO.RANGE.FOCUS.MIN_MINUTES, max: TIMER_SETTINGS.POMODORO.RANGE.FOCUS.MAX_MINUTES },
    break: { min: TIMER_SETTINGS.POMODORO.RANGE.BREAK.MIN_MINUTES, max: TIMER_SETTINGS.POMODORO.RANGE.BREAK.MAX_MINUTES },
    manualHours: { min: 0, max: 24 },
    manualMinutes: { min: 0, max: 59 },
  };
}

/**
 * localStorageからタイマー状態を読み込む。
 * 
 * ⚠️ 重要: データが存在しない、不正、または不完全な場合は、必ずデフォルト値（appConfig.tsから）を使用します。
 * - これにより、Dockerコンテナ新規起動時やブラウザのLocalStorageが古いデータを含む場合でも、
 *   確実に正しい初期値（集中25分、休憩5分、3セット）が適用されます。
 */
function loadFromStorage(defaults: TimerDefaults, ranges: TimerRanges): TimerState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // localStorageにデータがない場合は、デフォルト値で初期状態を作成
      return createInitialTimerState(defaults, ranges);
    }
    const raw = JSON.parse(saved);
    
    // データの検証: オブジェクトでない、または必須フィールドが欠けている場合はデフォルト値を使用
    if (!raw || typeof raw !== 'object') {
      return createInitialTimerState(defaults, ranges);
    }
    
    // デシリアライズ（内部で範囲チェックとフォールバックが行われる）
    const deserialized = deserializeTimerState(raw, Date.now(), defaults, ranges);
    
    // 最終的な検証: デシリアライズ後の値が範囲内であることを確認
    // （これは、localStorageに古い不正なデータが残っている場合の安全策）
    const focusMin = ranges.focus?.min ?? 0;
    const focusMax = ranges.focus?.max ?? Infinity;
    const breakMin = ranges.break?.min ?? 0;
    const breakMax = ranges.break?.max ?? Infinity;
    
    const isFocusValid = deserialized.pomodoroFocusMinutes >= focusMin && 
                         deserialized.pomodoroFocusMinutes <= focusMax &&
                         Number.isFinite(deserialized.pomodoroFocusMinutes);
    const isBreakValid = deserialized.pomodoroBreakMinutes >= breakMin && 
                         deserialized.pomodoroBreakMinutes <= breakMax &&
                         Number.isFinite(deserialized.pomodoroBreakMinutes);
    const isSetsValid = deserialized.pomodoroSets >= ranges.sets.min && 
                        deserialized.pomodoroSets <= ranges.sets.max &&
                        Number.isFinite(deserialized.pomodoroSets);
    
    // いずれかの値が不正な場合は、デフォルト値で初期状態を作成
    if (!isFocusValid || !isBreakValid || !isSetsValid) {
      console.warn('[TimerController] Invalid values in localStorage, using defaults');
      return createInitialTimerState(defaults, ranges);
    }
    
    return deserialized;
  } catch (error) {
    // パースエラーなど、何か問題があった場合はデフォルト値を使用
    console.warn('[TimerController] Error loading from localStorage, using defaults:', error);
    return createInitialTimerState(defaults, ranges);
  }
}

function saveToStorage(state: TimerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeTimerState(state)));
  } catch {
    // noop
  }
}

export interface UseTimerControllerResult {
  timerState: TimerState;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  setSelectedSubject: (subject: string) => void;
  setMode: (mode: TimerState['mode']) => void;
  setManualHours: (hours: number) => void;
  setManualMinutes: (minutes: number) => void;
  setPomodoroFocusMinutes: (minutes: number) => void;
  setPomodoroBreakMinutes: (minutes: number) => void;
  setPomodoroSets: (sets: number) => void;
  /**
   * 学習時間を記録（既存のAPI仕様維持）
   * - UI層からは「副作用の入口」として呼ぶだけ
   */
  saveRecord: (onRecorded: () => void) => Promise<{ success: boolean; message: string }>;

  /**
   * サーバ正の集計（今日/今週）
   * - 端末を跨いでも一致させるための参照値
   */
  studyTimeServerSummary?: { dateKey: string; todayTotalMs: number; weekTotalMs: number };

  /**
   * ローカル(studyTimerState)に溜まっていてサーバ未反映の分（ms）
   * - 表示上は今日/今週に加算して良い
   */
  unsyncedTodayMs: number;
}

function getElapsedSecondsForSync(state: TimerState): number {
  if (state.mode === 'stopwatch') return Math.max(0, Math.floor(state.elapsedTime));
  if (state.mode === 'pomodoro') {
    const focusSeconds = Math.max(0, Math.floor(state.pomodoroFocusMinutes * 60));
    const elapsedSeconds =
      state.pomodoroPhase === 'break' ? focusSeconds : Math.max(focusSeconds - Math.floor(state.pomodoroRemainingSeconds), 0);
    return Math.max(0, elapsedSeconds);
  }
  // manualは同期対象外（記録ボタンでStudyProgressへ反映される）
  return 0;
}

export function useTimerController(): UseTimerControllerResult {
  const defaults = useMemo(getTimerDefaults, []);
  const ranges = useMemo(getTimerRanges, []);

  const [timerState, setTimerState] = useState<TimerState>(() => loadFromStorage(defaults, ranges));
  const intervalRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<number | null>(null);
  const prevIsRunningRef = useRef<boolean>(false);

  const [syncState, setSyncState] = useState<StudyTimeSyncState>(() => loadSyncState(new Date()));
  const [studyTimeServerSummary, setStudyTimeServerSummary] = useState<
    { dateKey: string; todayTotalMs: number; weekTotalMs: number } | undefined
  >(undefined);

  // 最新状態をイベント/intervalから参照する（依存配列で毎秒張り替えない）
  const latestTimerStateRef = useRef<TimerState>(timerState);
  const latestSyncStateRef = useRef<StudyTimeSyncState>(syncState);
  useEffect(() => {
    latestTimerStateRef.current = timerState;
  }, [timerState]);
  useEffect(() => {
    latestSyncStateRef.current = syncState;
  }, [syncState]);

  // tick（副作用）はhook側で管理し、状態遷移はdomainに委譲
  useEffect(() => {
    if (!timerState.isRunning || (timerState.mode !== 'stopwatch' && timerState.mode !== 'pomodoro')) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      setTimerState((prev) => tickDomain(prev, now));
    }, TIMER_SETTINGS.ENGINE.TICK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.mode, timerState.pomodoroPhase, timerState.pomodoroFocusMinutes, timerState.pomodoroBreakMinutes]);

  // 永続化
  useEffect(() => {
    saveToStorage(timerState);
  }, [timerState]);

  // 同期状態（studyTimerStateとは別キーで保存。studyTimerStateの構造は一切変更しない）
  useEffect(() => {
    saveSyncState(syncState);
  }, [syncState]);

  const computeUnsyncedTodayMs = (state: TimerState, sync: StudyTimeSyncState): number => {
    const subject = state.selectedSubject;
    if (!subject) return 0;
    const totalMs = getElapsedSecondsForSync(state) * 1000;
    const session = sync.sessions?.[subject];
    const lastSynced = session?.lastSyncedTotalMs ?? 0;
    return Math.max(0, totalMs - lastSynced);
  };

  const unsyncedTodayMs = useMemo(() => computeUnsyncedTodayMs(timerState, syncState), [timerState, syncState]);

  const syncToServer = async (reason: string, state: TimerState, sync: StudyTimeSyncState) => {
    const subject = state.selectedSubject;
    if (!subject) return;
    if (state.mode === 'manual') return;

    const dateKey = toLocalDateKey(new Date());
    const totalMs = getElapsedSecondsForSync(state) * 1000;
    if (totalMs <= 0) return;

    // 日付が変わっていたら同期状態だけリセット（studyTimerStateは維持）
    let nextState = sync;
    if (sync.dateKey !== dateKey) {
      nextState = { dateKey, sessions: {} };
    }

    const nowMs = Date.now();
    const { next, session } = getOrCreateSession(nextState, subject, nowMs);
    nextState = next;

    // クライアント側の冪等ガード（サーバ側でも冪等だが、無駄撃ちを減らす）
    if (totalMs <= (session.lastSyncedTotalMs ?? 0)) {
      if (nextState !== sync) setSyncState(nextState);
      return;
    }

    try {
      const { studyTimeApi } = await import('../../../api/api');
      const resp = await studyTimeApi.sync({
        user_id: 'default',
        date_key: dateKey,
        subject,
        client_session_id: session.clientSessionId,
        total_ms: totalMs,
      });

      // 同期状態更新
      const updatedSession = {
        ...session,
        lastSyncedTotalMs: Math.max(session.lastSyncedTotalMs ?? 0, totalMs),
        lastSyncAtMs: nowMs,
      };
      const updatedState: StudyTimeSyncState = {
        ...nextState,
        dateKey,
        sessions: { ...nextState.sessions, [subject]: updatedSession },
      };
      setSyncState(updatedState);

      // サーバ集計を反映（SummaryCardsの「progressListがまだ空」の時に使う）
      setStudyTimeServerSummary({
        dateKey,
        todayTotalMs: resp.server_today_total_ms,
        weekTotalMs: resp.server_week_total_ms,
      });
    } catch (e) {
      console.warn('[StudyTimeSync] sync failed', reason, e);
      // 失敗してもstudyTimerStateは維持されるので、次回同期で追いつく
    }
  };

  const syncToServerLatest = (reason: string) => syncToServer(reason, latestTimerStateRef.current, latestSyncStateRef.current);

  // 起動時にサーバ正の集計を取得（progressListが空の間に0表示にならないため）
  useEffect(() => {
    const dateKey = toLocalDateKey(new Date());
    (async () => {
      try {
        const { studyTimeApi } = await import('../../../api/api');
        const summary = await studyTimeApi.summary(dateKey, 'default');
        setStudyTimeServerSummary({ dateKey, todayTotalMs: summary.today_total_ms, weekTotalMs: summary.week_total_ms });
      } catch (e) {
        // noop
      }
    })();
  }, []);

  // 一定間隔（60秒）で同期（毎秒は禁止）
  useEffect(() => {
    if (!timerState.isRunning) {
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }
    if (!timerState.selectedSubject) return;
    if (timerState.mode !== 'stopwatch' && timerState.mode !== 'pomodoro') return;

    if (syncIntervalRef.current) window.clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = window.setInterval(() => {
      syncToServerLatest('interval');
    }, 60_000);

    return () => {
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.mode, timerState.selectedSubject]);

  // 停止時に同期（タブ移動・リロードでも継続する仕様は維持）
  useEffect(() => {
    const wasRunning = prevIsRunningRef.current;
    const isRunning = timerState.isRunning;
    prevIsRunningRef.current = isRunning;
    if (wasRunning && !isRunning) {
      syncToServerLatest('stop');
    }
  }, [timerState.isRunning]);

  // ページ離脱前/非表示前に同期
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        syncToServerLatest('visibilitychange');
      }
    };
    const onBeforeUnload = () => {
      // 非同期完了は保証されないが、可能な限り投げる
      syncToServerLatest('beforeunload');
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  const startTimer = () => {
    if (!timerState.selectedSubject) return;
    if (timerState.mode === 'manual') return;
    setTimerState((prev) => startDomainTimer(prev, Date.now()));
  };

  const stopTimer = () => {
    setTimerState((prev) => stopDomainTimer(prev));
  };

  const resetTimer = () => {
    setTimerState((prev) => resetDomainTimer(prev));
  };

  const setSelectedSubject = (subject: string) => {
    setTimerState((prev) => ({ ...prev, selectedSubject: subject }));
  };

  const setMode = (mode: TimerState['mode']) => {
    setTimerState((prev) => setDomainMode(prev, mode));
  };

  const setManualHours = (hours: number) => {
    setTimerState((prev) => setDomainManualHours(prev, hours, ranges));
  };

  const setManualMinutes = (minutes: number) => {
    setTimerState((prev) => setDomainManualMinutes(prev, minutes, ranges));
  };

  const setPomodoroFocusMinutes = (minutes: number) => {
    setTimerState((prev) => setDomainPomodoroFocusMinutes(prev, minutes));
  };

  const setPomodoroBreakMinutes = (minutes: number) => {
    setTimerState((prev) => setDomainPomodoroBreakMinutes(prev, minutes));
  };

  const setPomodoroSets = (sets: number) => {
    setTimerState((prev) => setDomainPomodoroSets(prev, sets, ranges));
  };

  const saveRecord = async (onRecorded: () => void): Promise<{ success: boolean; message: string }> => {
    if (!timerState.selectedSubject) {
      return { success: false, message: '科目を選択してください' };
    }

    // 実行中の場合、タイマーを停止（UI/UX維持）
    if (timerState.isRunning) stopTimer();

    let hours = 0;
    if (timerState.mode === 'stopwatch') {
      if (timerState.elapsedTime === 0) return { success: false, message: '記録する時間がありません' };
      hours = timerState.elapsedTime / 3600;
    } else if (timerState.mode === 'pomodoro') {
      const focusSeconds = timerState.pomodoroFocusMinutes * 60;
      const elapsedSeconds =
        timerState.pomodoroPhase === 'break' ? focusSeconds : Math.max(focusSeconds - timerState.pomodoroRemainingSeconds, 0);
      if (elapsedSeconds === 0) return { success: false, message: '記録する時間がありません' };
      hours = elapsedSeconds / 3600;
    } else {
      hours = timerState.manualHours + timerState.manualMinutes / 60;
    }

    if (hours === 0) return { success: false, message: '記録する時間がありません' };

    try {
      const todayJst = new Date().toLocaleDateString('sv-SE');
      const { studyProgressApi } = await import('../../../api/api');
      const typeModule = await import('../../../api/types');

      const allProgress = await studyProgressApi.getAll();
      const existingProgress = allProgress.find((p) =>
        p.subject === timerState.selectedSubject &&
      　p.topic === '学習時間' &&
        p.date == todayJst
      );

      if (existingProgress) {
        const updatedHours = existingProgress.study_hours + hours;
        await studyProgressApi.update(existingProgress.id, { study_hours: updatedHours });
      } else {
        const focusSeconds = timerState.pomodoroFocusMinutes * 60;
        const newProgress: typeModule.StudyProgressCreate = {
          subject: timerState.selectedSubject,
          topic: '学習時間',
          date: todayJst, // ★ここを追加！ステップ1で作った変数を入れる
          progress_percent: 0,
          study_hours: hours,
          notes:
            timerState.mode === 'stopwatch'
              ? `ストップウォッチで記録: ${formatClockFromSeconds(timerState.elapsedTime)}`
              : timerState.mode === 'pomodoro'
                ? `ポモドーロで記録: ${formatClockFromSeconds(
                    timerState.pomodoroPhase === 'break'
                      ? focusSeconds
                      : Math.max(focusSeconds - timerState.pomodoroRemainingSeconds, 0)
                  )}`
                : `手動記録: ${timerState.manualHours > 0 ? `${timerState.manualHours}時間` : ''}${timerState.manualMinutes}分`,
        };
        await studyProgressApi.create(newProgress);
      }

      // 保存後にタイマーをリセット
      resetTimer();
      setManualHours(0);
      setManualMinutes(0);
      onRecorded();
      return { success: true, message: '学習時間を記録しました' };
    } catch (error: any) {
      console.error('[useTimerController] Error saving record:', error);
      const message = error.userMessage || '記録に失敗しました';
      return { success: false, message };
    }
  };

  return {
    timerState,
    startTimer,
    stopTimer,
    resetTimer,
    setSelectedSubject,
    setMode,
    setManualHours,
    setManualMinutes,
    setPomodoroFocusMinutes,
    setPomodoroBreakMinutes,
    setPomodoroSets,
    saveRecord,
    studyTimeServerSummary,
    unsyncedTodayMs,
  };
}


