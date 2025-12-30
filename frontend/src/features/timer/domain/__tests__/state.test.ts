import { describe, expect, it } from 'vitest';
import type { TimerDefaults, TimerRanges } from '../types';
import {
  createInitialTimerState,
  isPomodoroAwaitingPhaseStart,
  resetTimer,
  setManualHours,
  setManualMinutes,
  setMode,
  setPomodoroBreakMinutes,
  setPomodoroFocusMinutes,
  setPomodoroSets,
  startTimer,
  stopTimer,
  tick,
} from '../state';

const defaults: TimerDefaults = { focusMinutes: 25, breakMinutes: 5, sets: 2, mode: 'pomodoro' };
const ranges: TimerRanges = {
  sets: { min: 1, max: 10 },
  manualHours: { min: 0, max: 24 },
  manualMinutes: { min: 0, max: 59 },
};

describe('timer domain state', () => {
  it('creates initial state', () => {
    const s = createInitialTimerState(defaults, ranges);
    expect(s.mode).toBe('pomodoro');
    expect(s.pomodoroPhase).toBe('focus');
    expect(s.pomodoroRemainingSeconds).toBe(25 * 60);
    expect(s.pomodoroSets).toBe(2);
  });

  it('start/stop stopwatch preserves elapsed', () => {
    let s = createInitialTimerState({ ...defaults, mode: 'stopwatch' }, ranges);
    s = startTimer(s, 10_000);
    expect(s.isRunning).toBe(true);
    s = tick(s, 13_500);
    expect(s.elapsedTime).toBe(3);
    s = stopTimer(s);
    expect(s.isRunning).toBe(false);
    const restarted = startTimer(s, 20_000);
    expect(restarted.startTime).toBe(20_000 - 3 * 1000);
  });

  it('pomodoro tick counts down and stops at 00:00 switching to break awaiting start', () => {
    let s = createInitialTimerState(defaults, ranges);
    s = startTimer(s, 0);
    // 25min -> end
    s = tick(s, 25 * 60 * 1000);
    expect(s.isRunning).toBe(false);
    expect(s.pomodoroPhase).toBe('break');
    expect(s.pomodoroRemainingSeconds).toBe(5 * 60);
    expect(isPomodoroAwaitingPhaseStart(s)).toBe(true);
  });

  it('pomodoro break completion increments set and switches to focus awaiting start', () => {
    let s = createInitialTimerState(defaults, ranges);
    // move to break awaiting start
    s = { ...s, pomodoroPhase: 'break', pomodoroRemainingSeconds: 5 * 60 };
    // mark as started by being in break, then start
    s = startTimer({ ...s, isRunning: false, startTime: null }, 0);
    s = tick(s, 5 * 60 * 1000);
    expect(s.isRunning).toBe(false);
    expect(s.pomodoroPhase).toBe('focus');
    expect(s.pomodoroCurrentSet).toBe(2);
    expect(isPomodoroAwaitingPhaseStart(s)).toBe(true);
  });

  it('setMode resets pomodoro state when switching to pomodoro', () => {
    let s = createInitialTimerState({ ...defaults, mode: 'stopwatch' }, ranges);
    s = startTimer(s, 0);
    s = tick(s, 2000);
    s = setMode(s, 'pomodoro');
    expect(s.mode).toBe('pomodoro');
    expect(s.isRunning).toBe(false);
    expect(s.pomodoroPhase).toBe('focus');
    expect(s.pomodoroCurrentSet).toBe(1);
    expect(s.pomodoroRemainingSeconds).toBe(s.pomodoroFocusMinutes * 60);
  });

  it('resetTimer matches existing behavior per mode', () => {
    let s = createInitialTimerState({ ...defaults, mode: 'stopwatch' }, ranges);
    s = startTimer(s, 0);
    s = tick(s, 3000);
    s = resetTimer(s);
    expect(s.elapsedTime).toBe(0);
    expect(s.isRunning).toBe(false);

    let p = createInitialTimerState(defaults, ranges);
    p = startTimer(p, 0);
    p = tick(p, 1000);
    p = resetTimer(p);
    expect(p.pomodoroPhase).toBe('focus');
    expect(p.pomodoroCurrentSet).toBe(1);
    expect(p.pomodoroRemainingSeconds).toBe(p.pomodoroFocusMinutes * 60);
  });

  it('pomodoro settings setters stop and normalize state', () => {
    let s = createInitialTimerState(defaults, ranges);
    s = startTimer(s, 0);
    s = setPomodoroFocusMinutes(s, 30);
    expect(s.isRunning).toBe(false);
    expect(s.pomodoroPhase).toBe('focus');
    expect(s.pomodoroRemainingSeconds).toBe(30 * 60);
    s = setPomodoroBreakMinutes(s, 10);
    expect(s.pomodoroBreakMinutes).toBe(10);
    expect(s.pomodoroRemainingSeconds).toBe(30 * 60);
  });

  it('setPomodoroSets clamps and keeps currentSet within bounds', () => {
    let s = createInitialTimerState(defaults, ranges);
    s = { ...s, pomodoroCurrentSet: 5 };
    s = setPomodoroSets(s, 3, ranges);
    expect(s.pomodoroSets).toBe(3);
    expect(s.pomodoroCurrentSet).toBe(3);
  });

  it('setManualHours clamps value to range', () => {
    let s = createInitialTimerState(defaults, ranges);
    s = setManualHours(s, 5, ranges);
    expect(s.manualHours).toBe(5);
    s = setManualHours(s, -1, ranges);
    expect(s.manualHours).toBe(0);
    s = setManualHours(s, 30, ranges);
    expect(s.manualHours).toBe(24);
  });

  it('setManualMinutes clamps value to range', () => {
    let s = createInitialTimerState(defaults, ranges);
    s = setManualMinutes(s, 30, ranges);
    expect(s.manualMinutes).toBe(30);
    s = setManualMinutes(s, -1, ranges);
    expect(s.manualMinutes).toBe(0);
    s = setManualMinutes(s, 70, ranges);
    expect(s.manualMinutes).toBe(59);
  });

  it('tick does nothing when not running', () => {
    let s = createInitialTimerState(defaults, ranges);
    const next = tick(s, 1000);
    expect(next).toBe(s);
  });

  it('tick does nothing when startTime is null', () => {
    let s = createInitialTimerState(defaults, ranges);
    s = { ...s, isRunning: true, startTime: null };
    const next = tick(s, 1000);
    expect(next).toBe(s);
  });

  it('tick does nothing for manual mode', () => {
    let s = createInitialTimerState({ ...defaults, mode: 'manual' }, ranges);
    s = { ...s, isRunning: true, startTime: 1000 };
    const next = tick(s, 2000);
    expect(next).toBe(s);
  });

  it('isPomodoroAwaitingPhaseStart returns false for non-pomodoro mode', () => {
    let s = createInitialTimerState({ ...defaults, mode: 'stopwatch' }, ranges);
    expect(isPomodoroAwaitingPhaseStart(s)).toBe(false);
  });

  it('isPomodoroAwaitingPhaseStart returns false when running', () => {
    let s = createInitialTimerState(defaults, ranges);
    s = { ...s, isRunning: true, pomodoroPhase: 'break', pomodoroRemainingSeconds: 5 * 60 };
    expect(isPomodoroAwaitingPhaseStart(s)).toBe(false);
  });

  it('isPomodoroAwaitingPhaseStart returns false when not started', () => {
    let s = createInitialTimerState(defaults, ranges);
    expect(isPomodoroAwaitingPhaseStart(s)).toBe(false);
  });
});


