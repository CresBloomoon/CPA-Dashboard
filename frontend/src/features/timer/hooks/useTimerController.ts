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

function getTimerDefaults(): TimerDefaults {
  return {
    focusMinutes: TIMER_SETTINGS.POMODORO.DEFAULT.FOCUS_MINUTES,
    breakMinutes: TIMER_SETTINGS.POMODORO.DEFAULT.BREAK_MINUTES,
    sets: TIMER_SETTINGS.POMODORO.DEFAULT.SETS,
    mode: 'pomodoro',
  };
}

function getTimerRanges(): TimerRanges {
  return {
    sets: { min: TIMER_SETTINGS.POMODORO.RANGE.SETS.MIN, max: TIMER_SETTINGS.POMODORO.RANGE.SETS.MAX },
    manualHours: { min: 0, max: 24 },
    manualMinutes: { min: 0, max: 59 },
  };
}

function loadFromStorage(defaults: TimerDefaults, ranges: TimerRanges): TimerState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialTimerState(defaults, ranges);
    const raw = JSON.parse(saved);
    return deserializeTimerState(raw, Date.now(), defaults, ranges);
  } catch {
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
      const { studyProgressApi } = await import('../../../api/api');
      const typeModule = await import('../../../api/types');

      const allProgress = await studyProgressApi.getAll();
      const existingProgress = allProgress.find((p) => p.subject === timerState.selectedSubject && p.topic === '学習時間');

      if (existingProgress) {
        const updatedHours = existingProgress.study_hours + hours;
        await studyProgressApi.update(existingProgress.id, { study_hours: updatedHours });
      } else {
        const focusSeconds = timerState.pomodoroFocusMinutes * 60;
        const newProgress: typeModule.StudyProgressCreate = {
          subject: timerState.selectedSubject,
          topic: '学習時間',
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


