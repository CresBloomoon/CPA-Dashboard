export type TimerMode = 'pomodoro' | 'stopwatch' | 'manual';
export type PomodoroPhase = 'focus' | 'break';

/**
 * UIやフレームワークに依存しないタイマー状態。
 * - 時間系は「秒」または「ms（epoch）」を明示して扱う
 */
export interface TimerState {
  /** ストップウォッチの経過秒 reveals */
  elapsedTime: number;
  isRunning: boolean;
  selectedSubject: string;
  mode: TimerMode;

  pomodoroPhase: PomodoroPhase;
  pomodoroFocusMinutes: number;
  pomodoroBreakMinutes: number;
  pomodoroSets: number;
  pomodoroCurrentSet: number;
  pomodoroRemainingSeconds: number;

  manualHours: number;
  manualMinutes: number;

  /** 実行中のみms epochで保持（停止時はnull） */
  startTime: number | null;
}

export interface TimerDefaults {
  focusMinutes: number;
  breakMinutes: number;
  sets: number;
  mode: TimerMode;
}

export interface TimerRanges {
  sets: { min: number; max: number };
  focus?: { min: number; max: number };
  break?: { min: number; max: number };
  manualHours: { min: number; max: number };
  manualMinutes: { min: number; max: number };
}


