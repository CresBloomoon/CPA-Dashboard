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


