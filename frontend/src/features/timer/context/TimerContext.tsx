import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { TIMER_SETTINGS } from '../../../config/appConfig';

interface TimerState {
  elapsedTime: number; // 秒単位
  isRunning: boolean;
  selectedSubject: string;
  mode: 'pomodoro' | 'stopwatch' | 'manual';
  pomodoroPhase: 'focus' | 'break';
  pomodoroFocusMinutes: number;
  pomodoroBreakMinutes: number;
  pomodoroSets: number;
  /** 現在のセット数（1から開始） */
  pomodoroCurrentSet: number;
  /** 現在フェーズ（focus/break）の残り秒 */
  pomodoroRemainingSeconds: number;
  manualHours: number;
  manualMinutes: number;
  startTime: number | null; // タイマー開始時のタイムスタンプ
}

interface TimerContextType {
  timerState: TimerState;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  setSelectedSubject: (subject: string) => void;
  setMode: (mode: 'pomodoro' | 'stopwatch' | 'manual') => void;
  setManualHours: (hours: number) => void;
  setManualMinutes: (minutes: number) => void;
  setPomodoroFocusMinutes: (minutes: number) => void;
  setPomodoroBreakMinutes: (minutes: number) => void;
  setPomodoroSets: (sets: number) => void;
  saveRecord: (onRecorded: () => void) => Promise<{ success: boolean; message: string }>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const STORAGE_KEY = 'studyTimerState';


// localStorageから状態を復元
const loadTimerState = (): TimerState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      const focusMinutes =
        typeof state.pomodoroFocusMinutes === 'number' && state.pomodoroFocusMinutes >= 0
          ? state.pomodoroFocusMinutes
          : TIMER_SETTINGS.POMODORO.DEFAULT.FOCUS_MINUTES;
      const breakMinutes =
        typeof state.pomodoroBreakMinutes === 'number' && state.pomodoroBreakMinutes >= 0
          ? state.pomodoroBreakMinutes
          : TIMER_SETTINGS.POMODORO.DEFAULT.BREAK_MINUTES;
      const sets =
        typeof state.pomodoroSets === 'number' && state.pomodoroSets >= TIMER_SETTINGS.POMODORO.RANGE.SETS.MIN && state.pomodoroSets <= TIMER_SETTINGS.POMODORO.RANGE.SETS.MAX
          ? state.pomodoroSets
          : TIMER_SETTINGS.POMODORO.DEFAULT.SETS;
      const currentSet =
        typeof state.pomodoroCurrentSet === 'number' && state.pomodoroCurrentSet >= 1 && state.pomodoroCurrentSet <= sets
          ? state.pomodoroCurrentSet
          : 1;
      const focusSeconds = focusMinutes * 60;
      const breakSeconds = breakMinutes * 60;
      const phase: 'focus' | 'break' = state.pomodoroPhase === 'break' ? 'break' : 'focus';
      const remainingSecondsRaw =
        typeof state.pomodoroRemainingSeconds === 'number' ? state.pomodoroRemainingSeconds : focusSeconds;

      // 実行中だった場合、経過時間を再計算
      if (state.isRunning && state.startTime && state.startTime > 0) {
        const now = Date.now();
        const totalElapsed = Math.floor((now - state.startTime) / 1000);
        // pomodoroの場合は残り時間を再計算（focus→break への繰り上げも考慮）
        if (state.mode === 'pomodoro') {
          // ※このアプリではフェーズを自動継続しない（00:00到達で停止し、次フェーズの開始を待つ）
          const elapsed = totalElapsed;
          const remaining = Math.max(remainingSecondsRaw - elapsed, 0);

          // まだ同じフェーズ内で走っている
          if (elapsed < remainingSecondsRaw && remaining > 0) {
            return {
              ...state,
              pomodoroPhase: phase,
              pomodoroFocusMinutes: focusMinutes,
              pomodoroBreakMinutes: breakMinutes,
              pomodoroSets: sets,
              pomodoroCurrentSet: currentSet,
              pomodoroRemainingSeconds: remaining,
              elapsedTime: 0,
              isRunning: true,
              startTime: state.startTime,
            };
          }

          // フェーズが終わっていた（＝00:00到達）。次フェーズに切り替えた状態で停止して待機させる
          const nextPhase: 'focus' | 'break' = phase === 'focus' ? 'break' : 'focus';
          const nextSeconds = nextPhase === 'break' ? breakSeconds : focusSeconds;
          return {
            ...state,
            pomodoroPhase: nextPhase,
            pomodoroFocusMinutes: focusMinutes,
            pomodoroBreakMinutes: breakMinutes,
            pomodoroSets: sets,
            pomodoroCurrentSet: currentSet,
            pomodoroRemainingSeconds: nextSeconds,
            elapsedTime: 0,
            isRunning: false,
            startTime: null,
          };
        }
        return {
          ...state,
          elapsedTime: totalElapsed,
          startTime: state.startTime,
        };
      }
      return {
        ...state,
        startTime: null,
        pomodoroPhase: phase,
        pomodoroFocusMinutes: focusMinutes,
        pomodoroBreakMinutes: breakMinutes,
        pomodoroSets: sets,
        pomodoroCurrentSet: currentSet,
        pomodoroRemainingSeconds: remainingSecondsRaw,
      };
    }
  } catch (error) {
    console.error('Error loading timer state:', error);
  }
  return {
    elapsedTime: 0,
    isRunning: false,
    selectedSubject: '',
    mode: 'pomodoro',
    pomodoroPhase: 'focus',
    pomodoroFocusMinutes: TIMER_SETTINGS.POMODORO.DEFAULT.FOCUS_MINUTES,
    pomodoroBreakMinutes: TIMER_SETTINGS.POMODORO.DEFAULT.BREAK_MINUTES,
    pomodoroSets: TIMER_SETTINGS.POMODORO.DEFAULT.SETS,
    pomodoroCurrentSet: 1,
    pomodoroRemainingSeconds: TIMER_SETTINGS.POMODORO.DEFAULT.FOCUS_MINUTES * 60,
    manualHours: 0,
    manualMinutes: 0,
    startTime: null,
  };
};

// localStorageに状態を保存
const saveTimerState = (state: TimerState) => {
  try {
    const stateToSave = {
      ...state,
      startTime: state.isRunning && state.startTime ? state.startTime : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Error saving timer state:', error);
  }
};

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timerState, setTimerState] = useState<TimerState>(loadTimerState);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // タイマーの実行処理
  useEffect(() => {
    if (timerState.isRunning && timerState.mode === 'stopwatch') {
      // タイマーが開始されたとき、startTimeRefを設定
      if (!startTimeRef.current || startTimeRef.current === 0) {
        startTimeRef.current = Date.now() - timerState.elapsedTime * 1000;
        setTimerState(prev => ({ ...prev, startTime: startTimeRef.current }));
      }

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        setTimerState(prev => ({ ...prev, elapsedTime: elapsed }));
      }, TIMER_SETTINGS.ENGINE.TICK_INTERVAL_MS);
    } else if (timerState.isRunning && timerState.mode === 'pomodoro') {
      // pomodoro: 残り時間を減らす（現在フェーズの開始時刻から再計算）
      const focusSeconds = timerState.pomodoroFocusMinutes * 60;
      const breakSeconds = timerState.pomodoroBreakMinutes * 60;
      const phaseTotalSeconds = timerState.pomodoroPhase === 'break' ? breakSeconds : focusSeconds;

      if (!startTimeRef.current || startTimeRef.current === 0) {
        const elapsedAlready = Math.max(phaseTotalSeconds - (timerState.pomodoroRemainingSeconds || phaseTotalSeconds), 0);
        startTimeRef.current = Date.now() - elapsedAlready * 1000;
        setTimerState(prev => ({ ...prev, startTime: startTimeRef.current }));
      }

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        const remaining = Math.max(phaseTotalSeconds - elapsed, 0);

        if (remaining <= 0) {
          // focus終了 → breakへ切り替え、停止して待つ
          if (timerState.pomodoroPhase === 'focus') {
            setTimerState(prev => ({
              ...prev,
              isRunning: false,
              pomodoroPhase: 'break',
              pomodoroRemainingSeconds: breakSeconds,
              startTime: null,
            }));
            startTimeRef.current = 0;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          }

          // break終了 → セット数をカウントアップし、停止して次回はfocusから（待機）
          if (timerState.pomodoroPhase === 'break') {
            setTimerState(prev => ({
              ...prev,
              isRunning: false,
              pomodoroPhase: 'focus',
              pomodoroRemainingSeconds: focusSeconds,
              pomodoroCurrentSet: Math.min(prev.pomodoroCurrentSet + 1, prev.pomodoroSets),
              startTime: null,
            }));
            startTimeRef.current = 0;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          }
          startTimeRef.current = 0;
          setTimerState(prev => ({
            ...prev,
            isRunning: false,
            startTime: null,
            pomodoroPhase: 'focus',
            pomodoroRemainingSeconds: focusSeconds,
          }));
          return;
        }

        setTimerState(prev => ({
          ...prev,
          pomodoroRemainingSeconds: remaining,
        }));
      }, TIMER_SETTINGS.ENGINE.TICK_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!timerState.isRunning) {
        startTimeRef.current = 0;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    timerState.isRunning,
    timerState.mode,
    // pomodoro phase/setting changes should re-arm the interval (but not every tick)
    timerState.pomodoroPhase,
    timerState.pomodoroFocusMinutes,
    timerState.pomodoroBreakMinutes,
  ]);

  // 状態が変更されたらlocalStorageに保存
  useEffect(() => {
    saveTimerState(timerState);
  }, [timerState]);

  // コンポーネントがアンマウントされる前に状態を保存
  useEffect(() => {
    return () => {
      if (timerState.isRunning && startTimeRef.current > 0) {
        const stateToSave = {
          ...timerState,
          startTime: startTimeRef.current,
        };
        saveTimerState(stateToSave);
      }
    };
  }, []);

  const startTimer = () => {
    if (!timerState.selectedSubject) {
      return;
    }
    if (timerState.mode === 'manual') {
      return;
    }
    if (timerState.mode === 'stopwatch') {
      startTimeRef.current = Date.now() - timerState.elapsedTime * 1000;
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        startTime: startTimeRef.current,
      }));
    } else if (timerState.mode === 'pomodoro') {
      const focusSeconds = timerState.pomodoroFocusMinutes * 60;
      const breakSeconds = timerState.pomodoroBreakMinutes * 60;
      const phaseTotalSeconds = timerState.pomodoroPhase === 'break' ? breakSeconds : focusSeconds;
          const remaining =
            timerState.pomodoroRemainingSeconds > 0 ? timerState.pomodoroRemainingSeconds : phaseTotalSeconds;
      const elapsedAlready = phaseTotalSeconds - remaining;
      startTimeRef.current = Date.now() - elapsedAlready * 1000;
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        startTime: startTimeRef.current,
        pomodoroRemainingSeconds: remaining,
      }));
    }
  };

  const stopTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      startTime: null,
    }));
    startTimeRef.current = 0;
  };

  const resetTimer = () => {
    setTimerState(prev => ({
      ...prev,
      elapsedTime: 0,
      isRunning: false,
      startTime: null,
      pomodoroPhase: 'focus',
      pomodoroCurrentSet: 1,
      pomodoroRemainingSeconds: prev.mode === 'pomodoro' ? prev.pomodoroFocusMinutes * 60 : prev.pomodoroRemainingSeconds,
    }));
    startTimeRef.current = 0;
  };

  const setSelectedSubject = (subject: string) => {
    setTimerState(prev => ({ ...prev, selectedSubject: subject }));
  };

  const setMode = (mode: 'pomodoro' | 'stopwatch' | 'manual') => {
    setTimerState(prev => ({
      ...prev,
      mode,
      isRunning: false,
      elapsedTime: 0,
      startTime: null,
      pomodoroPhase: 'focus',
      pomodoroCurrentSet: 1,
      pomodoroRemainingSeconds: mode === 'pomodoro' ? prev.pomodoroFocusMinutes * 60 : prev.pomodoroRemainingSeconds,
    }));
    startTimeRef.current = 0;
  };

  const setManualHours = (hours: number) => {
    setTimerState(prev => ({ ...prev, manualHours: hours }));
  };

  const setManualMinutes = (minutes: number) => {
    setTimerState(prev => ({ ...prev, manualMinutes: minutes }));
  };

  const setPomodoroFocusMinutes = (minutes: number) => {
    setTimerState(prev => ({
      ...prev,
      pomodoroFocusMinutes: minutes,
      pomodoroPhase: 'focus',
      isRunning: false,
      startTime: null,
      pomodoroRemainingSeconds: minutes * 60,
    }));
    startTimeRef.current = 0;
  };

  const setPomodoroBreakMinutes = (minutes: number) => {
    setTimerState(prev => ({
      ...prev,
      pomodoroBreakMinutes: minutes,
      // 変更時はfocusへ戻して再計算
      pomodoroPhase: 'focus',
      isRunning: false,
      startTime: null,
      pomodoroRemainingSeconds: prev.pomodoroFocusMinutes * 60,
    }));
    startTimeRef.current = 0;
  };

  const setPomodoroSets = (sets: number) => {
    setTimerState(prev => ({
      ...prev,
      pomodoroSets: sets,
      // セット数を変更したとき、現在のセット数が新しいセット数を超えている場合はリセット
      pomodoroCurrentSet: prev.pomodoroCurrentSet > sets ? 1 : prev.pomodoroCurrentSet,
    }));
  };

  // 学習時間を記録する関数
  const saveRecord = async (onRecorded: () => void): Promise<{ success: boolean; message: string }> => {
    if (!timerState.selectedSubject) {
      return { success: false, message: '科目を選択してください' };
    }

    // 実行中の場合、タイマーを停止
    if (timerState.isRunning) {
      stopTimer();
    }

    let hours = 0;
    if (timerState.mode === 'stopwatch') {
      if (timerState.elapsedTime === 0) {
        return { success: false, message: '記録する時間がありません' };
      }
      hours = timerState.elapsedTime / 3600;
    } else if (timerState.mode === 'pomodoro') {
      const focusSeconds = timerState.pomodoroFocusMinutes * 60;
      const elapsedSeconds = timerState.pomodoroPhase === 'break'
        ? focusSeconds
        : Math.max(focusSeconds - timerState.pomodoroRemainingSeconds, 0);
      if (elapsedSeconds === 0) {
        return { success: false, message: '記録する時間がありません' };
      }
      hours = elapsedSeconds / 3600;
    } else {
      hours = timerState.manualHours + timerState.manualMinutes / 60;
    }

    if (hours === 0) {
      return { success: false, message: '記録する時間がありません' };
    }

    try {
      // 動的インポートでAPIを読み込む（循環依存を避けるため）
      const { studyProgressApi } = await import('../../../api/api');
      const typeModule = await import('../../../api/types');
      
      const allProgress = await studyProgressApi.getAll();
      const existingProgress = allProgress.find(
        (p) => p.subject === timerState.selectedSubject && p.topic === '学習時間'
      );

      const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      if (existingProgress) {
        const updatedHours = existingProgress.study_hours + hours;
        await studyProgressApi.update(existingProgress.id, {
          study_hours: updatedHours,
        });
      } else {
        const newProgress: typeModule.StudyProgressCreate = {
          subject: timerState.selectedSubject,
          topic: '学習時間',
          progress_percent: 0,
          study_hours: hours,
          notes: timerState.mode === 'stopwatch' 
            ? `ストップウォッチで記録: ${formatTime(timerState.elapsedTime)}` 
            : timerState.mode === 'pomodoro'
              ? `ポモドーロで記録: ${formatTime(
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
      
      // 親コンポーネントの更新を呼び出し
      onRecorded();

      return { success: true, message: '学習時間を記録しました' };
    } catch (error) {
      console.error('Error recording time:', error);
      return { success: false, message: '記録に失敗しました' };
    }
  };

  return (
    <TimerContext.Provider
      value={{
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
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

