import type { TimerDefaults, TimerRanges, TimerState } from './types';
import { clampInt } from './manual';
import { getNextPomodoroPhase, toSeconds } from './pomodoro';
import { computePomodoroRemainingSeconds, computeStopwatchElapsedSeconds } from './state';

export type SerializedTimerState = Omit<TimerState, 'elapsedTime' | 'startTime'> & {
  elapsedTime: number;
  startTime: number | null;
};

export function serializeTimerState(state: TimerState): SerializedTimerState {
  return {
    ...state,
    startTime: state.isRunning && state.startTime !== null ? state.startTime : null,
  };
}

/**
 * localStorageから復元されたタイマー状態をデシリアライズする。
 * 
 * ⚠️ 重要: `defaults`パラメータは `useTimerController.ts` の `getTimerDefaults()` から渡されます。
 * - デフォルト値は `appConfig.ts` の `TIMER_SETTINGS.POMODORO.DEFAULT` を参照しています。
 * - localStorageに値が保存されていない場合（新規コンテナ生成時）は、この`defaults`が使用されます。
 * - ハードコードされた値（25, 5, 3等）をここに書かないでください。
 */
export function deserializeTimerState(
  raw: unknown,
  nowMs: number,
  defaults: TimerDefaults,
  ranges: TimerRanges
): TimerState {
  const base: TimerState = {
    elapsedTime: 0,
    isRunning: false,
    selectedSubject: '',
    mode: defaults.mode,
    pomodoroPhase: 'focus',
    pomodoroFocusMinutes: Math.max(0, Math.floor(defaults.focusMinutes)),
    pomodoroBreakMinutes: Math.max(0, Math.floor(defaults.breakMinutes)),
    pomodoroSets: clampInt(defaults.sets, ranges.sets.min, ranges.sets.max),
    pomodoroCurrentSet: 1,
    pomodoroRemainingSeconds: toSeconds(defaults.focusMinutes),
    manualHours: 0,
    manualMinutes: 0,
    startTime: null,
  };

  if (!raw || typeof raw !== 'object') return base;
  const state = raw as Record<string, unknown>;

  // 値の検証と範囲チェック：不正な値の場合はデフォルト値にフォールバック
  const focusMin = ranges.focus?.min ?? 0;
  const focusMax = ranges.focus?.max ?? Infinity;
  const breakMin = ranges.break?.min ?? 0;
  const breakMax = ranges.break?.max ?? Infinity;
  
  const focusMinutes = typeof state.pomodoroFocusMinutes === 'number' && 
                       !Number.isNaN(state.pomodoroFocusMinutes) &&
                       Number.isFinite(state.pomodoroFocusMinutes) &&
                       state.pomodoroFocusMinutes >= focusMin &&
                       state.pomodoroFocusMinutes <= focusMax
    ? Math.floor(state.pomodoroFocusMinutes)
    : base.pomodoroFocusMinutes;
  const breakMinutes = typeof state.pomodoroBreakMinutes === 'number' && 
                       !Number.isNaN(state.pomodoroBreakMinutes) &&
                       Number.isFinite(state.pomodoroBreakMinutes) &&
                       state.pomodoroBreakMinutes >= breakMin &&
                       state.pomodoroBreakMinutes <= breakMax
    ? Math.floor(state.pomodoroBreakMinutes)
    : base.pomodoroBreakMinutes;
  const sets = typeof state.pomodoroSets === 'number'
    ? clampInt(state.pomodoroSets, ranges.sets.min, ranges.sets.max)
    : base.pomodoroSets;
  const currentSet = typeof state.pomodoroCurrentSet === 'number' ? clampInt(state.pomodoroCurrentSet, 1, sets) : 1;

  const phase = state.pomodoroPhase === 'break' ? 'break' : 'focus';
  const focusFull = toSeconds(focusMinutes);
  const breakFull = toSeconds(breakMinutes);

  const remainingRaw = typeof state.pomodoroRemainingSeconds === 'number'
    ? Math.max(0, Math.floor(state.pomodoroRemainingSeconds))
    : focusFull;

  const mode = state.mode === 'stopwatch' || state.mode === 'manual' || state.mode === 'pomodoro'
    ? state.mode
    : base.mode;

  const selectedSubject = typeof state.selectedSubject === 'string' ? state.selectedSubject : '';

  const manualHours = typeof state.manualHours === 'number' ? clampInt(state.manualHours, ranges.manualHours.min, ranges.manualHours.max) : 0;
  const manualMinutes = typeof state.manualMinutes === 'number' ? clampInt(state.manualMinutes, ranges.manualMinutes.min, ranges.manualMinutes.max) : 0;

  const isRunning = state.isRunning === true;
  const startTime = typeof state.startTime === 'number' && state.startTime >= 0 ? Math.floor(state.startTime) : null;

  // 実行中だった場合：経過を再計算して復元
  if (isRunning && startTime !== null) {
    if (mode === 'stopwatch') {
      return {
        ...base,
        mode,
        selectedSubject,
        isRunning: true,
        startTime,
        elapsedTime: computeStopwatchElapsedSeconds(startTime, nowMs),
        pomodoroFocusMinutes: focusMinutes,
        pomodoroBreakMinutes: breakMinutes,
        pomodoroSets: sets,
        pomodoroCurrentSet: currentSet,
        pomodoroPhase: phase,
        pomodoroRemainingSeconds: remainingRaw,
        manualHours,
        manualMinutes,
      };
    }

    if (mode === 'pomodoro') {
      const phaseFull = phase === 'break' ? breakFull : focusFull;
      const remaining = computePomodoroRemainingSeconds(phaseFull, startTime, nowMs);

      // まだ同じフェーズ内で走っている
      if (remaining > 0 && remaining <= remainingRaw) {
        return {
          ...base,
          mode,
          selectedSubject,
          isRunning: true,
          startTime,
          pomodoroPhase: phase,
          pomodoroFocusMinutes: focusMinutes,
          pomodoroBreakMinutes: breakMinutes,
          pomodoroSets: sets,
          pomodoroCurrentSet: currentSet,
          pomodoroRemainingSeconds: remaining,
          manualHours,
          manualMinutes,
        };
      }

      // フェーズが終わっていた（00:00到達）: 次フェーズへ切り替えた状態で停止して待機
      const nextPhase = getNextPomodoroPhase(phase);
      const nextSeconds = nextPhase === 'break' ? breakFull : focusFull;
      return {
        ...base,
        mode,
        selectedSubject,
        isRunning: false,
        startTime: null,
        pomodoroPhase: nextPhase,
        pomodoroFocusMinutes: focusMinutes,
        pomodoroBreakMinutes: breakMinutes,
        pomodoroSets: sets,
        pomodoroCurrentSet: currentSet,
        pomodoroRemainingSeconds: nextSeconds,
        manualHours,
        manualMinutes,
      };
    }
  }

  return {
    ...base,
    mode,
    selectedSubject,
    isRunning: false,
    startTime: null,
    pomodoroPhase: phase,
    pomodoroFocusMinutes: focusMinutes,
    pomodoroBreakMinutes: breakMinutes,
    pomodoroSets: sets,
    pomodoroCurrentSet: currentSet,
    pomodoroRemainingSeconds: remainingRaw,
    manualHours,
    manualMinutes,
  };
}


