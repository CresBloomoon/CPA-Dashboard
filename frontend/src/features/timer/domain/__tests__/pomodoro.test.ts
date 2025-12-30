import { describe, expect, it } from 'vitest';
import type { TimerState } from '../types';
import {
  adjustPomodoroMinutes,
  canEditPomodoroSettings,
  clampToStep,
  computePomodoroElapsedFocusSeconds,
  computePomodoroRemainingRatio,
  getNextPomodoroPhase,
  getPomodoroPhaseTotalSeconds,
  isPomodoroStarted,
  toSeconds,
} from '../pomodoro';

describe('pomodoro domain', () => {
  describe('toSeconds', () => {
    it('converts minutes to seconds', () => {
      expect(toSeconds(0)).toBe(0);
      expect(toSeconds(1)).toBe(60);
      expect(toSeconds(25)).toBe(1500);
      expect(toSeconds(60)).toBe(3600);
    });

    it('handles negative and invalid inputs', () => {
      expect(toSeconds(-1)).toBe(0);
      expect(toSeconds(1.5)).toBe(60);
      expect(toSeconds(1.9)).toBe(60);
      // @ts-expect-error testing runtime input
      expect(toSeconds(NaN)).toBe(0);
      // @ts-expect-error testing runtime input
      expect(toSeconds(Infinity)).toBe(0);
    });
  });

  describe('getPomodoroPhaseTotalSeconds', () => {
    it('returns focus seconds for focus phase', () => {
      const state = { pomodoroPhase: 'focus' as const, pomodoroFocusMinutes: 25, pomodoroBreakMinutes: 5 };
      expect(getPomodoroPhaseTotalSeconds(state)).toBe(1500);
    });

    it('returns break seconds for break phase', () => {
      const state = { pomodoroPhase: 'break' as const, pomodoroFocusMinutes: 25, pomodoroBreakMinutes: 5 };
      expect(getPomodoroPhaseTotalSeconds(state)).toBe(300);
    });
  });

  describe('getNextPomodoroPhase', () => {
    it('switches focus to break', () => {
      expect(getNextPomodoroPhase('focus')).toBe('break');
    });

    it('switches break to focus', () => {
      expect(getNextPomodoroPhase('break')).toBe('focus');
    });
  });

  describe('computePomodoroElapsedFocusSeconds', () => {
    it('returns 0 for non-pomodoro mode', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'stopwatch',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1000,
      };
      expect(computePomodoroElapsedFocusSeconds(state)).toBe(0);
    });

    it('returns full focus seconds for break phase', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'break',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 300,
      };
      expect(computePomodoroElapsedFocusSeconds(state)).toBe(1500);
    });

    it('calculates elapsed from remaining in focus phase', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1200,
      };
      expect(computePomodoroElapsedFocusSeconds(state)).toBe(300);
    });

    it('handles zero remaining correctly', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 0,
      };
      expect(computePomodoroElapsedFocusSeconds(state)).toBe(1500);
    });

    it('handles remaining equal to full (no elapsed)', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1500,
      };
      expect(computePomodoroElapsedFocusSeconds(state)).toBe(0);
    });
  });

  describe('isPomodoroStarted', () => {
    it('returns false for non-pomodoro mode', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'stopwatch',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1500,
        pomodoroCurrentSet: 1,
      };
      expect(isPomodoroStarted(state)).toBe(false);
    });

    it('returns true if in break phase', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'break',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 300,
        pomodoroCurrentSet: 1,
      };
      expect(isPomodoroStarted(state)).toBe(true);
    });

    it('returns true if remaining seconds decreased', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1200,
        pomodoroCurrentSet: 1,
      };
      expect(isPomodoroStarted(state)).toBe(true);
    });

    it('returns true if current set is greater than 1', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1500,
        pomodoroCurrentSet: 2,
      };
      expect(isPomodoroStarted(state)).toBe(true);
    });

    it('returns false for initial state', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1500,
        pomodoroCurrentSet: 1,
      };
      expect(isPomodoroStarted(state)).toBe(false);
    });
  });

  describe('canEditPomodoroSettings', () => {
    it('returns false for non-pomodoro mode', () => {
      const state: Pick<TimerState, 'mode' | 'isRunning' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'stopwatch',
        isRunning: false,
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1500,
        pomodoroCurrentSet: 1,
      };
      expect(canEditPomodoroSettings(state)).toBe(false);
    });

    it('returns false if running', () => {
      const state: Pick<TimerState, 'mode' | 'isRunning' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'pomodoro',
        isRunning: true,
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1500,
        pomodoroCurrentSet: 1,
      };
      expect(canEditPomodoroSettings(state)).toBe(false);
    });

    it('returns false if started (in break)', () => {
      const state: Pick<TimerState, 'mode' | 'isRunning' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'pomodoro',
        isRunning: false,
        pomodoroPhase: 'break',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 300,
        pomodoroCurrentSet: 1,
      };
      expect(canEditPomodoroSettings(state)).toBe(false);
    });

    it('returns false if started (time decreased)', () => {
      const state: Pick<TimerState, 'mode' | 'isRunning' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'pomodoro',
        isRunning: false,
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1200,
        pomodoroCurrentSet: 1,
      };
      expect(canEditPomodoroSettings(state)).toBe(false);
    });

    it('returns false if current set is greater than 1', () => {
      const state: Pick<TimerState, 'mode' | 'isRunning' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'pomodoro',
        isRunning: false,
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1500,
        pomodoroCurrentSet: 2,
      };
      expect(canEditPomodoroSettings(state)).toBe(false);
    });

    it('returns true for initial state', () => {
      const state: Pick<TimerState, 'mode' | 'isRunning' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroRemainingSeconds' | 'pomodoroCurrentSet'> = {
        mode: 'pomodoro',
        isRunning: false,
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroRemainingSeconds: 1500,
        pomodoroCurrentSet: 1,
      };
      expect(canEditPomodoroSettings(state)).toBe(true);
    });
  });

  describe('computePomodoroRemainingRatio', () => {
    it('returns 0 for non-pomodoro mode', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroBreakMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'stopwatch',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroBreakMinutes: 5,
        pomodoroRemainingSeconds: 1500,
      };
      expect(computePomodoroRemainingRatio(state)).toBe(0);
    });

    it('returns 1.0 for full remaining time', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroBreakMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroBreakMinutes: 5,
        pomodoroRemainingSeconds: 1500,
      };
      expect(computePomodoroRemainingRatio(state)).toBe(1.0);
    });

    it('returns 0.5 for half remaining time', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroBreakMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroBreakMinutes: 5,
        pomodoroRemainingSeconds: 750,
      };
      expect(computePomodoroRemainingRatio(state)).toBe(0.5);
    });

    it('returns 0.0 for zero remaining time', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroBreakMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroBreakMinutes: 5,
        pomodoroRemainingSeconds: 0,
      };
      expect(computePomodoroRemainingRatio(state)).toBe(0.0);
    });

    it('handles break phase correctly', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroBreakMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'break',
        pomodoroFocusMinutes: 25,
        pomodoroBreakMinutes: 5,
        pomodoroRemainingSeconds: 150,
      };
      expect(computePomodoroRemainingRatio(state)).toBe(0.5);
    });

    it('clamps ratio to 0-1 range', () => {
      const state: Pick<TimerState, 'mode' | 'pomodoroPhase' | 'pomodoroFocusMinutes' | 'pomodoroBreakMinutes' | 'pomodoroRemainingSeconds'> = {
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroBreakMinutes: 5,
        pomodoroRemainingSeconds: 2000, // over full
      };
      expect(computePomodoroRemainingRatio(state)).toBe(1.0);
    });
  });

  describe('clampToStep', () => {
    it('rounds to nearest step', () => {
      expect(clampToStep(25, 1, 1, 120)).toBe(25);
      expect(clampToStep(25.3, 1, 1, 120)).toBe(25);
      expect(clampToStep(25.7, 1, 1, 120)).toBe(26);
    });

    it('clamps to min and max', () => {
      expect(clampToStep(0, 1, 1, 120)).toBe(1);
      expect(clampToStep(200, 1, 1, 120)).toBe(120);
    });

    it('handles step correctly', () => {
      expect(clampToStep(27, 5, 1, 120)).toBe(25);
      expect(clampToStep(28, 5, 1, 120)).toBe(30);
    });
  });

  describe('adjustPomodoroMinutes', () => {
    it('increments by step', () => {
      expect(adjustPomodoroMinutes(25, 1, 1, 1, 120)).toBe(26);
      expect(adjustPomodoroMinutes(25, -1, 1, 1, 120)).toBe(24);
    });

    it('respects step size', () => {
      expect(adjustPomodoroMinutes(25, 1, 5, 1, 120)).toBe(30);
      expect(adjustPomodoroMinutes(25, -1, 5, 1, 120)).toBe(20);
    });

    it('clamps to boundaries', () => {
      expect(adjustPomodoroMinutes(1, -1, 1, 1, 120)).toBe(1);
      expect(adjustPomodoroMinutes(120, 1, 1, 1, 120)).toBe(120);
    });

    it('rounds to step after adjustment', () => {
      expect(adjustPomodoroMinutes(23, 1, 5, 1, 120)).toBe(25);
      expect(adjustPomodoroMinutes(27, 1, 5, 1, 120)).toBe(30);
    });
  });
});

