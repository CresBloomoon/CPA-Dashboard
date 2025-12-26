import { describe, expect, it } from 'vitest';
import type { TimerDefaults, TimerRanges } from '../types';
import { deserializeTimerState, serializeTimerState } from '../persistence';

const defaults: TimerDefaults = { focusMinutes: 25, breakMinutes: 5, sets: 1, mode: 'pomodoro' };
const ranges: TimerRanges = {
  sets: { min: 1, max: 10 },
  manualHours: { min: 0, max: 24 },
  manualMinutes: { min: 0, max: 59 },
};

describe('timer persistence', () => {
  it('serializes running state with startedAtMs, else null', () => {
    const s = deserializeTimerState({}, 0, defaults, ranges);
    const running = { ...s, isRunning: true, startTime: 12345 };
    expect(serializeTimerState(running).startTime).toBe(12345);
    expect(serializeTimerState({ ...running, isRunning: false }).startTime).toBeNull();
  });

  it('deserializes invalid input into defaults', () => {
    const s = deserializeTimerState(null, 0, defaults, ranges);
    expect(s.mode).toBe('pomodoro');
    expect(s.pomodoroRemainingSeconds).toBe(25 * 60);
  });

  it('rehydrates running stopwatch elapsed', () => {
    const raw = { mode: 'stopwatch', isRunning: true, startTime: 1_000, elapsedTime: 0 };
    const s = deserializeTimerState(raw, 4_500, defaults, ranges);
    expect(s.mode).toBe('stopwatch');
    expect(s.isRunning).toBe(true);
    expect(s.elapsedTime).toBe(3);
  });

  it('rehydrates running pomodoro within phase', () => {
    const raw = {
      mode: 'pomodoro',
      isRunning: true,
      startTime: 0,
      pomodoroPhase: 'focus',
      pomodoroFocusMinutes: 1,
      pomodoroBreakMinutes: 1,
      pomodoroRemainingSeconds: 60,
    };
    const s = deserializeTimerState(raw, 30_000, defaults, ranges);
    expect(s.isRunning).toBe(true);
    expect(s.pomodoroPhase).toBe('focus');
    expect(s.pomodoroRemainingSeconds).toBe(30);
  });

  it('rehydrates running pomodoro that already finished into next phase awaiting start', () => {
    const raw = {
      mode: 'pomodoro',
      isRunning: true,
      startTime: 0,
      pomodoroPhase: 'focus',
      pomodoroFocusMinutes: 1,
      pomodoroBreakMinutes: 2,
      pomodoroRemainingSeconds: 60,
    };
    const s = deserializeTimerState(raw, 70_000, defaults, ranges);
    expect(s.isRunning).toBe(false);
    expect(s.pomodoroPhase).toBe('break');
    expect(s.pomodoroRemainingSeconds).toBe(120);
  });
});


