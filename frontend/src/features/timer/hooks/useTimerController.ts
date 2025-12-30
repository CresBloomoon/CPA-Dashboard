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
} from '../domain';

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
}

export function useTimerController(): UseTimerControllerResult {
  const defaults = useMemo(getTimerDefaults, []);
  const ranges = useMemo(getTimerRanges, []);

  const [timerState, setTimerState] = useState<TimerState>(() => loadFromStorage(defaults, ranges));
  const intervalRef = useRef<number | null>(null);

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
  };
}


