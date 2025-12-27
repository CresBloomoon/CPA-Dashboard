import type { PomodoroPhase, TimerState } from './types';

export function toSeconds(minutes: number): number {
  const m = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  return m * 60;
}

export function getPomodoroPhaseTotalSeconds(state: Pick<TimerState, 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroBreakMinutes'>): number {
  return state.pomodoroPhase === 'break' ? toSeconds(state.pomodoroBreakMinutes) : toSeconds(state.pomodoroFocusMinutes);
}

export function getNextPomodoroPhase(phase: PomodoroPhase): PomodoroPhase {
  return phase === 'focus' ? 'break' : 'focus';
}

/**
 * ポモドーロの集中時間の経過秒数を計算する。
 * - breakフェーズの場合は、集中時間の満タン秒数を返す
 * - focusフェーズの場合は、残り秒数から経過秒数を算出
 */
export function computePomodoroElapsedFocusSeconds(state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds'>): number {
  if (state.mode !== 'pomodoro') return 0;
  const focusFull = toSeconds(state.pomodoroFocusMinutes);
  if (state.pomodoroPhase === 'break') return focusFull;
  return Math.max(focusFull - (state.pomodoroRemainingSeconds ?? focusFull), 0);
}

/**
 * ポモドーロが開始済みかどうかを判定する。
 * - breakフェーズにいる
 * - focusフェーズの残り時間が減っている
 * - 2セット目以降である
 * いずれかの条件を満たす場合は開始済みとみなす。
 */
export function isPomodoroStarted(state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'>): boolean {
  if (state.mode !== 'pomodoro') return false;
  const focusFull = toSeconds(state.pomodoroFocusMinutes);
  return (
    state.pomodoroPhase === 'break' ||
    (state.pomodoroRemainingSeconds ?? focusFull) < focusFull ||
    state.pomodoroCurrentSet > 1
  );
}

/**
 * ポモドーロ設定を編集可能かどうかを判定する。
 * - ポモドーロモードである
 * - 実行中でない
 * - 開始前である
 * - 1セット目である
 */
export function canEditPomodoroSettings(state: Pick<TimerState, 'mode' | 'isRunning' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'>): boolean {
  if (state.mode !== 'pomodoro') return false;
  if (state.isRunning) return false;
  if (isPomodoroStarted(state)) return false;
  return state.pomodoroCurrentSet === 1;
}

/**
 * ポモドーロの残り時間の比率を計算する（0.0 〜 1.0）。
 * プログレスリングの表示に使用する。
 */
export function computePomodoroRemainingRatio(state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroBreakMinutes' | 'pomodoroRemainingSeconds'>): number {
  if (state.mode !== 'pomodoro') return 0;
  const phaseTotalSeconds = getPomodoroPhaseTotalSeconds(state);
  if (phaseTotalSeconds <= 0) return 0;
  const remaining = state.pomodoroRemainingSeconds ?? phaseTotalSeconds;
  return Math.min(Math.max(remaining / phaseTotalSeconds, 0), 1);
}

/**
 * 値をステップ単位に丸めて、指定範囲内にクランプする。
 * ポモドーロ設定の調整に使用する。
 */
export function clampToStep(value: number, stepMinutes: number, min: number, max: number): number {
  const stepped = Math.round(value / stepMinutes) * stepMinutes;
  return Math.min(max, Math.max(min, stepped));
}

/**
 * 現在の値をステップ単位で増減し、指定範囲内にクランプする。
 * ポモドーロ設定のホイール入力調整に使用する。
 */
export function adjustPomodoroMinutes(current: number, deltaSteps: number, stepMinutes: number, min: number, max: number): number {
  // 「現在値から次/前のステップへ進む」挙動に合わせる
  // 例: current=23, step=5, +1 => 25 / current=27, step=5, +1 => 30
  const baseIndex = deltaSteps >= 0
    ? Math.floor(current / stepMinutes)
    : Math.ceil(current / stepMinutes);
  const next = (baseIndex + deltaSteps) * stepMinutes;
  return Math.min(max, Math.max(min, next));
}


