import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface TimerState {
  elapsedTime: number; // 秒単位
  isRunning: boolean;
  selectedSubject: string;
  mode: 'stopwatch' | 'manual';
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
  setMode: (mode: 'stopwatch' | 'manual') => void;
  setManualHours: (hours: number) => void;
  setManualMinutes: (minutes: number) => void;
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
      // 実行中だった場合、経過時間を再計算
      if (state.isRunning && state.startTime && state.startTime > 0) {
        const now = Date.now();
        const totalElapsed = Math.floor((now - state.startTime) / 1000);
        return {
          ...state,
          elapsedTime: totalElapsed,
          startTime: state.startTime,
        };
      }
      return {
        ...state,
        startTime: null,
      };
    }
  } catch (error) {
    console.error('Error loading timer state:', error);
  }
  return {
    elapsedTime: 0,
    isRunning: false,
    selectedSubject: '',
    mode: 'stopwatch',
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
      }, 1000);
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
  }, [timerState.isRunning, timerState.mode]);

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
    if (timerState.mode === 'stopwatch') {
      startTimeRef.current = Date.now() - timerState.elapsedTime * 1000;
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        startTime: startTimeRef.current,
      }));
    } else {
      setTimerState(prev => ({ ...prev, isRunning: true }));
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
    }));
    startTimeRef.current = 0;
    localStorage.removeItem(STORAGE_KEY);
  };

  const setSelectedSubject = (subject: string) => {
    setTimerState(prev => ({ ...prev, selectedSubject: subject }));
  };

  const setMode = (mode: 'stopwatch' | 'manual') => {
    setTimerState(prev => ({ ...prev, mode, isRunning: false, elapsedTime: 0, startTime: null }));
    startTimeRef.current = 0;
  };

  const setManualHours = (hours: number) => {
    setTimerState(prev => ({ ...prev, manualHours: hours }));
  };

  const setManualMinutes = (minutes: number) => {
    setTimerState(prev => ({ ...prev, manualMinutes: minutes }));
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

