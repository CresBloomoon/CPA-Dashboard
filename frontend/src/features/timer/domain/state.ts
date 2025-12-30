import type { PomodoroPhase, TimerMode, TimerDefaults, TimerRanges, TimerState } from './types';
import { getNextPomodoroPhase, getPomodoroPhaseTotalSeconds, toSeconds } from './pomodoro';
import { clampInt } from './manual';

/**
 * タイマーの初期状態を作成する（新規コンテナ生成時またはlocalStorageが空の時）。
 * 
 * ⚠️ 重要: `defaults`パラメータは `useTimerController.ts` の `getTimerDefaults()` から渡されます。
 * - デフォルト値は `appConfig.ts` の `TIMER_SETTINGS.POMODORO.DEFAULT` を参照しています。
 * - ハードコードされた値（25, 5, 3等）をここに書かないでください。
 * - 値を変更する場合は `appConfig.ts` の `TIMER_SETTINGS.POMODORO.DEFAULT` を変更してください。
 */
export function createInitialTimerState(defaults: TimerDefaults, ranges: TimerRanges): TimerState {
  const sets = clampInt(defaults.sets, ranges.sets.min, ranges.sets.max);
  const focusMinutes = Math.max(0, Math.floor(defaults.focusMinutes));
  const breakMinutes = Math.max(0, Math.floor(defaults.breakMinutes));
  return {
    elapsedTime: 0,
    isRunning: false,
    selectedSubject: '',
    mode: defaults.mode,
    pomodoroPhase: 'focus',
    pomodoroFocusMinutes: focusMinutes,
    pomodoroBreakMinutes: breakMinutes,
    pomodoroSets: sets,
    pomodoroCurrentSet: 1,
    pomodoroRemainingSeconds: toSeconds(focusMinutes),
    manualHours: 0,
    manualMinutes: 0,
    startTime: null,
  };
}

export function computeStopwatchElapsedSeconds(startedAtMs: number, nowMs: number): number {
  const elapsed = Math.floor((nowMs - startedAtMs) / 1000);
  return Math.max(elapsed, 0);
}

export function computePomodoroRemainingSeconds(phaseTotalSeconds: number, startedAtMs: number, nowMs: number): number {
  const elapsed = Math.floor((nowMs - startedAtMs) / 1000);
  return Math.max(phaseTotalSeconds - elapsed, 0);
}

export function startTimer(state: TimerState, nowMs: number): TimerState {
  if (state.isRunning) return state;
  if (state.mode === 'manual') return state;

  if (state.mode === 'stopwatch') {
    const startTime = nowMs - state.elapsedTime * 1000;
    return { ...state, isRunning: true, startTime };
  }

  // pomodoro
  const phaseTotalSeconds = getPomodoroPhaseTotalSeconds(state);
  const remaining = state.pomodoroRemainingSeconds > 0 ? state.pomodoroRemainingSeconds : phaseTotalSeconds;
  const elapsedAlready = Math.max(phaseTotalSeconds - remaining, 0);
  const startTime = nowMs - elapsedAlready * 1000;
  return { ...state, isRunning: true, startTime };
}

export function stopTimer(state: TimerState): TimerState {
  if (!state.isRunning) return state;
  return { ...state, isRunning: false, startTime: null };
}

export function resetTimer(state: TimerState): TimerState {
  const base: TimerState = {
    ...state,
    elapsedTime: 0,
    isRunning: false,
    startTime: null,
  };
  if (state.mode === 'pomodoro') {
    return {
      ...base,
      pomodoroPhase: 'focus',
      pomodoroCurrentSet: 1,
      pomodoroRemainingSeconds: toSeconds(state.pomodoroFocusMinutes),
    };
  }
  if (state.mode === 'stopwatch') {
    return base;
  }
  // manual
  return { ...base, manualHours: 0, manualMinutes: 0 };
}

export function setMode(state: TimerState, mode: TimerMode): TimerState {
  // 切替時は停止し、基本状態へ寄せる（既存挙動に合わせる）
  const next: TimerState = {
    ...state,
    mode,
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    pomodoroPhase: 'focus',
    pomodoroCurrentSet: 1,
  };
  if (mode === 'pomodoro') {
    return { ...next, pomodoroRemainingSeconds: toSeconds(next.pomodoroFocusMinutes) };
  }
  if (mode === 'stopwatch') {
    return next;
  }
  return next;
}

export function setPomodoroFocusMinutes(state: TimerState, minutes: number): TimerState {
  const m = Math.max(0, Math.floor(minutes));
  return {
    ...state,
    pomodoroFocusMinutes: m,
    pomodoroPhase: 'focus',
    isRunning: false,
    startTime: null,
    pomodoroRemainingSeconds: toSeconds(m),
    pomodoroCurrentSet: 1,
  };
}

export function setPomodoroBreakMinutes(state: TimerState, minutes: number): TimerState {
  const m = Math.max(0, Math.floor(minutes));
  return {
    ...state,
    pomodoroBreakMinutes: m,
    pomodoroPhase: 'focus',
    isRunning: false,
    startTime: null,
    pomodoroRemainingSeconds: toSeconds(state.pomodoroFocusMinutes),
    pomodoroCurrentSet: 1,
  };
}

export function setPomodoroSets(state: TimerState, sets: number, ranges: TimerRanges): TimerState {
  const nextSets = clampInt(sets, ranges.sets.min, ranges.sets.max);
  return {
    ...state,
    pomodoroSets: nextSets,
    pomodoroCurrentSet: Math.min(Math.max(1, state.pomodoroCurrentSet), nextSets),
  };
}

export function setManualHours(state: TimerState, hours: number, ranges: TimerRanges): TimerState {
  return { ...state, manualHours: clampInt(hours, ranges.manualHours.min, ranges.manualHours.max) };
}

export function setManualMinutes(state: TimerState, minutes: number, ranges: TimerRanges): TimerState {
  return { ...state, manualMinutes: clampInt(minutes, ranges.manualMinutes.min, ranges.manualMinutes.max) };
}

export function tick(state: TimerState, nowMs: number): TimerState {
  if (!state.isRunning) return state;
  if (state.startTime === null) return state;

  if (state.mode === 'stopwatch') {
    return { ...state, elapsedTime: computeStopwatchElapsedSeconds(state.startTime, nowMs) };
  }

  if (state.mode !== 'pomodoro') return state;

  const phaseTotalSeconds = getPomodoroPhaseTotalSeconds(state);
  const remaining = computePomodoroRemainingSeconds(phaseTotalSeconds, state.startTime, nowMs);

  if (remaining > 0) {
    return { ...state, pomodoroRemainingSeconds: remaining };
  }

  // 00:00到達：停止して「次フェーズの満タン状態」で待機（既存仕様）
  const nextPhase: PomodoroPhase = getNextPomodoroPhase(state.pomodoroPhase);
  const nextRemaining = nextPhase === 'break' ? toSeconds(state.pomodoroBreakMinutes) : toSeconds(state.pomodoroFocusMinutes);

  const currentSetAfter =
    state.pomodoroPhase === 'break' ? Math.min(state.pomodoroCurrentSet + 1, state.pomodoroSets) : state.pomodoroCurrentSet;

  return {
    ...state,
    isRunning: false,
    startTime: null,
    pomodoroPhase: nextPhase,
    pomodoroRemainingSeconds: nextRemaining,
    pomodoroCurrentSet: currentSetAfter,
  };
}

export function isPomodoroAwaitingPhaseStart(state: TimerState): boolean {
  if (state.mode !== 'pomodoro') return false;
  if (state.isRunning) return false;

  // 「開始済み」判定：breakにいる or focus残りが減っている or 2セット目以降
  const focusFull = toSeconds(state.pomodoroFocusMinutes);
  const breakFull = toSeconds(state.pomodoroBreakMinutes);
  const hasStarted =
    state.pomodoroPhase === 'break' ||
    state.pomodoroRemainingSeconds < focusFull ||
    state.pomodoroCurrentSet > 1;
  if (!hasStarted) return false;

  if (state.pomodoroPhase === 'break') return state.pomodoroRemainingSeconds === breakFull;
  return state.pomodoroRemainingSeconds === focusFull;
}


