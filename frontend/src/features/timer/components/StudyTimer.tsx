import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import type { Subject } from '../../../api/types';
import { ANIMATION_THEME, TIMER_SETTINGS, UI_VISUALS } from '../../../config/appConfig';
import { SUBJECT_COLOR_FALLBACK, SUBJECT_NAME_ALIASES } from '../../../config/subjects';
import { useTimer } from '../hooks/TimerContext';
import { useClickFeedback } from '../hooks/useClickFeedback';
import { getSubjectColor as resolveSubjectColor } from '../../../utils/todoHelpers';
import {
  adjustByStep,
  adjustPomodoroMinutes,
  canEditPomodoroSettings,
  computePomodoroElapsedFocusSeconds,
  computePomodoroRemainingRatio,
  formatClockFromSeconds,
  getPomodoroPhaseTotalSeconds,
  isPomodoroAwaitingPhaseStart,
} from '../domain';
import TimerModeTabs from './TimerModeTabs';
import { useTrophySystemContext } from '../../../contexts/TrophySystemContext';

interface StudyTimerProps {
  onRecorded: () => void;
  subjects: string[];
  subjectsWithColors?: Subject[];
}

function DurationRow({
  label,
  value,
  min,
  max,
  onChange,
  adjustMinutes,
  unit = '分',
  disabled = false,
  autoFocus = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  adjustMinutes: (current: number, deltaSteps: number, min: number, max: number) => number;
  unit?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const throttleTimerRef = useRef<number | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const adjustMinutesRef = useRef(adjustMinutes);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // 最新の値を保持
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    adjustMinutesRef.current = adjustMinutes;
  }, [value, onChange, adjustMinutes]);

  // 「集中」を中央に置いた際の操作性向上：開いた直後は集中行にフォーカス
  useEffect(() => {
    if (!autoFocus || disabled) return;
    // NOTE: DOM focus を当てると、マウスホバーアウト後も「フォーカス強調」が残り
    // ホバーが解除されないように見えるため、初期ハイライト（短時間）だけに留める。
    setIsFocusWithin(true);
    const t = window.setTimeout(() => setIsFocusWithin(false), 350);
    return () => window.clearTimeout(t);
  }, [autoFocus, disabled]);

  // キーボード操作ハンドラ
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const next = adjustMinutesRef.current(valueRef.current, 1, min, max);
      onChangeRef.current(next);
      setIsFocusWithin(true);
      setTimeout(() => setIsFocusWithin(false), 100);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      const next = adjustMinutesRef.current(valueRef.current, -1, min, max);
      onChangeRef.current(next);
      setIsFocusWithin(true);
      setTimeout(() => setIsFocusWithin(false), 100);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 操作中フラグを立てる
      setIsFocusWithin(true);
      
      // Throttle処理: 16ms（約60fps）ごとに更新
      if (throttleTimerRef.current !== null) return;
      
      throttleTimerRef.current = window.setTimeout(() => {
        throttleTimerRef.current = null;
        // 操作が終了したら少し遅延してフラグを下ろす
        setTimeout(() => setIsFocusWithin(false), 100);
      }, 16);

      const direction = e.deltaY > 0 ? -1 : 1;
      const next = adjustMinutesRef.current(valueRef.current, direction, min, max);
      onChangeRef.current(next);
    };

    // passive: false を明示的に指定して preventDefault を可能にする
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (throttleTimerRef.current !== null) {
        window.clearTimeout(throttleTimerRef.current);
      }
    };
  }, [min, max, disabled]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-slate-200/80 w-14 flex-shrink-0 whitespace-nowrap">{label}</div>
      <div
        ref={containerRef}
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={`${label}: ${value}${unit}`}
        className={`relative flex-1 min-w-[200px] h-24 rounded-xl bg-slate-900/40 ring-1 backdrop-blur-md transition-all duration-300 px-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:shadow-[0_0_15px_rgba(56,189,248,0.2)] ${
          isHovering || isFocusWithin || isFocused
            ? 'ring-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.2)] bg-white/5' 
            : 'ring-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-ns-resize'}`}
        onMouseEnter={() => !disabled && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onFocus={() => !disabled && setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
      >
        {/* Layer 1: 上矢印 (完全に中央固定) */}
        <AnimatePresence>
          {isHovering && !disabled && value < max && (
            <motion.div
              key="arrow-up"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-1 left-0 w-full flex justify-center pointer-events-none"
            >
              <ChevronUp size={20} className="text-white/80" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layer 2: 数値と単位 (右端・左端整列) */}
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex items-baseline justify-center">
            {/* 数字エリア (右寄せ、固定幅) */}
            <span className="text-3xl font-semibold text-white tabular-nums flex justify-end items-baseline min-w-[3ch]">
              {String(value).padStart(2, '0')}
            </span>
            {/* 単位エリア (左寄せ、固定ギャップ) */}
            <span className="text-xs text-slate-400 font-medium leading-none ml-2 flex justify-start items-baseline">{unit}</span>
          </div>
        </div>

        {/* Layer 3: 下矢印 (完全に中央固定) */}
        <AnimatePresence>
          {isHovering && !disabled && value > min && (
            <motion.div
              key="arrow-down"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-1 left-0 w-full flex justify-center pointer-events-none"
            >
              <ChevronDown size={20} className="text-white/80" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TimeUnitBox({
  value,
  label,
  min,
  max,
  onChange,
  adjust,
  disabled = false,
  isInteractive = true,
}: {
  value: number;
  label: string;
  min: number;
  max: number;
  onChange: (next: number) => void;
  adjust: (current: number, deltaSteps: number, min: number, max: number) => number;
  disabled?: boolean;
  isInteractive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const throttleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  // wheelイベントハンドラー（ホバーはCSSで維持し、スクロール中にチカつかせない）
  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled || !isInteractive) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (throttleTimerRef.current !== null) return;

      throttleTimerRef.current = window.setTimeout(() => {
        throttleTimerRef.current = null;
      }, 16);

      const direction = e.deltaY > 0 ? -1 : 1;
      const next = adjust(valueRef.current, direction, min, max);
      onChangeRef.current(next);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (throttleTimerRef.current !== null) {
        window.clearTimeout(throttleTimerRef.current);
      }
    };
  }, [adjust, disabled, isInteractive, min, max]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || !isInteractive) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      onChange(adjust(value, 1, min, max));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      onChange(adjust(value, -1, min, max));
    }
  };

  const canInc = !disabled && isInteractive && value < max;
  const canDec = !disabled && isInteractive && value > min;

  return (
    <div className="relative group">
      {/* 上矢印（CSS hoverで安定表示） */}
      {canInc && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <ChevronUp size={40} className="w-10 h-10 text-white/80" />
        </div>
      )}

      <div
        ref={containerRef}
        role="spinbutton"
        tabIndex={disabled || !isInteractive ? -1 : 0}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={`${label}: ${value}`}
        className={`relative w-24 h-32 rounded-xl cursor-ns-resize flex items-center justify-center outline-none transition-colors duration-150 ${
          disabled || !isInteractive ? 'opacity-50 cursor-not-allowed' : ''
        } border border-transparent bg-transparent
          group-hover:border-2 group-hover:border-sky-500/50 group-hover:bg-slate-900/60
          focus-visible:border-2 focus-visible:border-sky-500/50 focus-visible:bg-slate-900/60`}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-baseline gap-1">
          <span className="text-6xl font-medium text-white tabular-nums">{String(value).padStart(2, '0')}</span>
          <span className="text-base text-slate-400 font-medium">{label}</span>
        </div>
      </div>

      {/* 下矢印（CSS hoverで安定表示） */}
      {canDec && (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <ChevronDown size={40} className="w-10 h-10 text-white/80" />
        </div>
      )}
    </div>
  );
}

export default function StudyTimer({ onRecorded, subjects, subjectsWithColors = [] }: StudyTimerProps) {
  const {
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
  } = useTimer();
  const { handleTrophyEvent, pushToast } = useTrophySystemContext();

  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const gradientSeed = useId();
  const idleTimerRef = useRef<number | null>(null);
  const [isImmersiveHidden, setIsImmersiveHidden] = useState(false);
  const timerContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const [isPomodoroSettingsOpen, setIsPomodoroSettingsOpen] = useState(false);
  const settingsHoverTimerRef = useRef<number | null>(null);
  const [isHoveringTimeText, setIsHoveringTimeText] = useState(false);
  const popoverHoverRef = useRef(false);

  // 科目名から色を取得（未定義ならグレーにフォールバック）
  const getSubjectColor = (subjectName?: string): string | undefined =>
    resolveSubjectColor(subjectName, subjectsWithColors, SUBJECT_COLOR_FALLBACK);

  // DB初期化後でもUIがズレないよう、LocalStorage由来の旧科目名を正規化する
  useEffect(() => {
    const selected = timerState.selectedSubject;
    const validNames = (
      subjectsWithColors.length > 0
        ? subjectsWithColors.filter((s) => s.visible !== false).map((s) => s.name)
        : subjects
    ).filter(Boolean);
    
    // 科目が存在する場合
    if (validNames.length > 0) {
      // 選択されている科目が有効な場合、そのまま使用
      if (selected && validNames.includes(selected)) return;
      
      // エイリアスで解決を試みる
      if (selected) {
        const mapped = SUBJECT_NAME_ALIASES[selected] || '';
        if (mapped && validNames.includes(mapped)) {
          setSelectedSubject(mapped);
          return;
        }
      }
      
      // 未選択の場合は、最初の科目を自動選択
      if (!selected) {
        setSelectedSubject(validNames[0] || '');
        return;
      }
      
      // どれにも一致しない場合は最初の科目を選択
      setSelectedSubject(validNames[0] || '');
    } else {
      // 科目が存在しない場合は未選択に戻す
      if (selected) {
        setSelectedSubject('');
      }
    }
  }, [subjects, subjectsWithColors, timerState.selectedSubject, setSelectedSubject]);

  // 時間を記録
  const handleRecord = async () => {
    setIsRecording(true);
    const result = await saveRecord(onRecorded);
    setIsRecording(false);

    // 共通トースト（トロフィーと同じUI/アニメ）を表示
    // - 成功: 緑 / 文言は「記録完了！」のみ（2行目は空文字でレイアウトだけ維持）
    // - 失敗: 赤 / 文言は「保存失敗」のみ（2行目は空文字）
    if (result.success) {
      pushToast({ variant: 'success', message: '記録完了！', subMessage: '' });
    } else {
      pushToast({ variant: 'error', message: '保存失敗', subMessage: '' });
    }
  };

  // ドメインロジックを使用
  const pomodoroElapsedFocusSeconds = useMemo(
    () => computePomodoroElapsedFocusSeconds(timerState),
    [timerState]
  );

  const canEditSettings = useMemo(() => canEditPomodoroSettings(timerState), [timerState]);

  const pomodoroAwaitingStart = useMemo(() => isPomodoroAwaitingPhaseStart(timerState), [timerState]);

  const pomodoroPhaseTotalSeconds = useMemo(
    () => getPomodoroPhaseTotalSeconds(timerState),
    [timerState]
  );

  const pomodoroRemainingRatio = useMemo(
    () => computePomodoroRemainingRatio(timerState),
    [timerState]
  );


  // 科目カラーリングの「登場アニメ」を、秒更新（59:59→59:58…）で再発火させないためのキー
  const pomodoroRingIntroKey = useMemo(() => {
    if (timerState.mode !== 'pomodoro') return 'no-pomodoro';
    return `pomodoro-ring-${timerState.selectedSubject || 'default'}`;
  }, [timerState.mode, timerState.selectedSubject]);


  const circleIsInteractive = timerState.mode !== 'manual';
  const immersiveEligible =
    timerState.isRunning && (timerState.mode === 'pomodoro' || timerState.mode === 'stopwatch');
  const circleDisplayTime = timerState.mode === 'pomodoro'
    ? pomodoroAwaitingStart
      ? timerState.pomodoroPhase === 'break'
        ? 'REST'
        : 'FOCUS'
      : formatClockFromSeconds(timerState.pomodoroRemainingSeconds ?? pomodoroPhaseTotalSeconds)
    : timerState.mode === 'stopwatch'
      ? formatClockFromSeconds(timerState.elapsedTime)
      : `${String(timerState.manualHours).padStart(2, '0')}:${String(timerState.manualMinutes).padStart(2, '0')}`;

  const subjectColor = getSubjectColor(timerState.selectedSubject);
  // 学習時間画面は「シックでミニマル」寄せ：差し色は落ち着いたスレートブルーに固定
  const ringGradientId = `pomodoro-ring-${gradientSeed}`;

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const raw = hex.trim().replace('#', '');
    const normalized = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    if (normalized.length !== 6) return null;
    const n = Number.parseInt(normalized, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };

  const subjectRgb = useMemo(() => {
    return subjectColor ? hexToRgb(subjectColor) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectColor]);

  // デフォルトはブルー基調（科目カラー未選択時）
  const subjectStroke = subjectColor || '#38BDF8'; // sky-400 (electric/sky blue)
  const subjectGlow = subjectRgb
    ? `rgba(${subjectRgb.r}, ${subjectRgb.g}, ${subjectRgb.b}, 0.18)`
    : 'rgba(56, 189, 248, 0.18)';
  const subjectGlowSoft = subjectRgb
    ? `rgba(${subjectRgb.r}, ${subjectRgb.g}, ${subjectRgb.b}, 0.10)`
    : 'rgba(56, 189, 248, 0.10)';


  const ringRadius = 45;
  const ringCircumference = useMemo(() => 2 * Math.PI * ringRadius, []);
  const remainingLen = useMemo(() => {
    const ratio = typeof pomodoroRemainingRatio === 'number' && !isNaN(pomodoroRemainingRatio) 
      ? pomodoroRemainingRatio 
      : 0;
    return ringCircumference * ratio;
  }, [ringCircumference, pomodoroRemainingRatio]);
  // 先端ハイライトは「塊」に見えやすいので短め＆控えめに
  const tipLen = useMemo(() => Math.min(Math.max(ringCircumference * 0.03, 8), 16), [ringCircumference]); // 先端だけ明るい部分


  const handleToggle = () => {
    // 手動入力モードではタイマーサークルのクリックは無効（手動入力は数字部分で操作）
    if (timerState.mode === 'manual') return;
    if (subjects.length === 0) return;
    if (!timerState.selectedSubject) return;
    if (!circleIsInteractive) return;
    // 設定ポップアップ表示中でも、開始操作は許可（押したらフェードアウトさせる）
    if (isPomodoroSettingsOpen) {
      setIsHoveringTimeText(false);
      closeSettingsImmediate();
    }

    // トロフィー：イベント発生を通知（コンボ管理はデータ層で処理）
    handleTrophyEvent('timer_mash_10');

    if (timerState.isRunning) {
      stopTimer();
    } else {
      // トロフィー：学習開始イベント（判定はマスターデータ側で実施）
      handleTrophyEvent('TIMER_START');
      startTimer();
    }
  };

  // タイマーサークルのクリックフィードバック
  // 手動入力モードでは常にdisabled（クリック不可）
  const circleClickFeedback = useClickFeedback(handleToggle, timerState.mode === 'manual' || !circleIsInteractive || subjects.length === 0);

  // 科目選択ボタンのクリックフィードバック
  const subjectSelectFeedback = useClickFeedback(
    () => {
      if (subjects.length > 0) {
        setIsSubjectDropdownOpen((prev) => !prev);
      }
    },
    timerState.isRunning || subjects.length === 0
  );

  // 記録ボタンのdisabled条件
  const isRecordButtonDisabled = useMemo(() => 
    isRecording ||
    timerState.isRunning ||
    !timerState.selectedSubject ||
    (timerState.mode === 'stopwatch' && timerState.elapsedTime === 0) ||
    (timerState.mode === 'pomodoro' && pomodoroElapsedFocusSeconds === 0) ||
    (timerState.mode === 'manual' && timerState.manualHours === 0 && timerState.manualMinutes === 0),
    [isRecording, timerState.isRunning, timerState.selectedSubject, timerState.mode, timerState.elapsedTime, timerState.manualHours, timerState.manualMinutes, pomodoroElapsedFocusSeconds]
  );

  // 記録ボタンはシンプルに：表示切り替えや成功演出は行わない



  // ポモドーロ設定UI：実行開始時は閉じる
  useEffect(() => {
    if (timerState.isRunning) setIsPomodoroSettingsOpen(false);
  }, [timerState.isRunning]);



  const adjustMinutes = (current: number, deltaSteps: number, min: number, max: number) => {
    return adjustPomodoroMinutes(current, deltaSteps, TIMER_SETTINGS.POMODORO.STEP_MINUTES, min, max);
  };

  const openSettingsWithDelay = () => {
    if (subjects.length === 0) return;
    if (settingsHoverTimerRef.current) window.clearTimeout(settingsHoverTimerRef.current);
    settingsHoverTimerRef.current = window.setTimeout(() => {
      setIsPomodoroSettingsOpen(true);
    }, TIMER_SETTINGS.POMODORO.SETTINGS_POPOVER.HOVER_OPEN_DELAY_MS);
  };

  const closeSettingsImmediate = () => {
    if (settingsHoverTimerRef.current) {
      window.clearTimeout(settingsHoverTimerRef.current);
      settingsHoverTimerRef.current = null;
    }
    setIsPomodoroSettingsOpen(false);
  };

  const closeSettingsIfAllowed = () => {
    // Popoverにマウスがある間は閉じない
    if (popoverHoverRef.current) return;
    closeSettingsImmediate();
  };

  useEffect(() => {
    return () => {
      if (settingsHoverTimerRef.current) window.clearTimeout(settingsHoverTimerRef.current);
    };
  }, []);

  // 没入モード（UI自動非表示）: 稼働中かつ3秒無操作（mousemove）で、サークル以外をフェードアウト
  useEffect(() => {
    // 対象外なら常に表示
    if (!immersiveEligible) {
      setIsImmersiveHidden(false);
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    const armHideTimer = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        setIsImmersiveHidden(true);
      }, TIMER_SETTINGS.IMMERSIVE.IDLE_HIDE_MS);
    };

    const onMouseMove = () => {
      // 動いた瞬間に即再表示
      setIsImmersiveHidden(false);
      armHideTimer();
    };

    // 最初にタイマーをセット
    armHideTimer();
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [immersiveEligible]);

  const fadeTransition = isImmersiveHidden
    ? { duration: ANIMATION_THEME.IMMERSIVE.FADE_OUT_S, ease: 'easeInOut' as const }
    : { duration: ANIMATION_THEME.IMMERSIVE.FADE_IN_S, ease: 'easeOut' as const };
  
  // メインカウントの表示制御（手動入力モードでは常に表示）
  const shouldShowMainCount = !isImmersiveHidden || timerState.mode === 'manual' || !timerState.isRunning;

  const toggleFullscreen = async () => {
    const el = timerContainerRef.current;
    if (!el) return;

    // If already in fullscreen (any element), exit; else request on this container
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  };

  // Fullscreen state sync (Esc key / external exit)
  useEffect(() => {
    const onFsChange = () => {
      const el = timerContainerRef.current;
      const active = !!document.fullscreenElement && document.fullscreenElement === el;
      setIsFullscreen(active);
      if (active) {
        setShowFullscreenHint(true);
        window.setTimeout(
          () => setShowFullscreenHint(false),
          TIMER_SETTINGS.FEEDBACK.FULLSCREEN_HINT_DURATION_MS
        );
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keybinding: "f" toggles fullscreen (ignore when typing)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget =
        !!target?.isContentEditable ||
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select';
      if (isTypingTarget) return;

      e.preventDefault();
      void toggleFullscreen();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // While fullscreen, lock body scroll to remove scrollbars
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  return (
    <div
      ref={timerContainerRef}
      className={`relative w-full overflow-hidden flex items-center justify-center bg-[#0F172A] ${
        isFullscreen ? 'h-screen w-screen p-0 rounded-none' : 'min-h-[680px] rounded-3xl p-8'
      }`}
    >
      {/* 学習時間タブのみ：ネイビー基調の背景 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(56,189,248,0.22),transparent_58%),radial-gradient(circle_at_75%_70%,rgba(96,165,250,0.16),transparent_62%),linear-gradient(135deg,#152243,#2C3C57)]" />

      {/* ポモドーロ終了パルス（最背面の上に重ねる / Fullscreenでもinset-0で全面） */}

      {/* Fullscreenでもコンテンツ幅は固定（w-full要素が横いっぱいに伸びないように） */}
      <div className={`relative z-10 w-full max-w-md ${isFullscreen ? 'px-6 py-10' : ''}`}>
        {/* Fullscreen hint */}
        {showFullscreenHint && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: ANIMATION_THEME.DURATIONS_S.FULLSCREEN_HINT, ease: 'easeOut' }}
            className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs text-slate-200/90 bg-slate-900/60 ring-1 ring-sky-200/15 backdrop-blur-md"
          >
            Fキーで全画面解除
          </motion.div>
        )}

        {/* 没入モード対象UI（サークル以外）：稼働中3秒無操作でフェードアウト */}
        <motion.div
          animate={{ opacity: isImmersiveHidden ? 0 : 1 }}
          transition={fadeTransition}
          style={{ pointerEvents: isImmersiveHidden ? 'none' : 'auto' }}
        >
          {/* タイトル（上部の「学習時間」は不要のため削除） */}

          {/* モード選択タブ（ポモドーロ / ストップウォッチ / 手動入力） */}
          <TimerModeTabs
            mode={timerState.mode}
            disabled={timerState.isRunning}
            onChange={(mode) => {
              setMode(mode);
              resetTimer();
            }}
          />

          {/* 科目選択（ドロップダウン） */}
          <div className="mb-8 relative">
            <button
              type="button"
              disabled={timerState.isRunning || subjects.length === 0}
              onKeyDown={subjectSelectFeedback.handleKeyDown}
              onKeyUp={subjectSelectFeedback.handleKeyUp}
              onBlur={subjectSelectFeedback.handleBlur}
              onPointerDown={subjectSelectFeedback.handlePointerDown}
              onPointerUp={subjectSelectFeedback.handlePointerUp}
              onPointerLeave={subjectSelectFeedback.handlePointerLeave}
              className={`w-full px-4 py-3 rounded-full text-slate-200/90 bg-slate-800/50 hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-2 backdrop-blur-md ring-1 ring-sky-200/15 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ${
                timerState.isRunning || subjects.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              } ${subjectSelectFeedback.activeClass}`}
            >
              {timerState.selectedSubject && subjectColor && (
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: subjectColor }}
                />
              )}
              <span className="text-sm">
                {subjects.length === 0 ? '科目が未登録です' : (timerState.selectedSubject || '科目を選択中...')}
              </span>
            </button>
            
            {/* 科目0件時の誘導メッセージ */}
            {subjects.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: ANIMATION_THEME.DURATIONS_S.FADE, ease: 'easeOut' }}
                className="absolute z-20 w-full mt-2 bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-sky-200/70 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-slate-200/80 font-medium text-sm mb-2">科目を登録してください</p>
                    <p className="text-slate-300/60 text-xs mb-3">タイマーを使用するには、まず科目を登録する必要があります。</p>
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          const settingsButton = document.querySelector('[title="設定"]') as HTMLButtonElement;
                          if (settingsButton) settingsButton.click();
                        }}
                        className="group px-4 py-2 bg-slate-800/40 hover:bg-slate-800/60 text-slate-200/80 hover:text-slate-200 rounded-full text-sm font-medium transition-all duration-200 border border-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(186,230,253,0.15)]"
                      >
                        設定画面で科目を登録する
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <AnimatePresence>
              {isSubjectDropdownOpen && !timerState.isRunning && subjects.length > 0 && (
                <>
                  <motion.div
                    className="fixed inset-0 z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: ANIMATION_THEME.DURATIONS_S.FADE }}
                    onClick={() => setIsSubjectDropdownOpen(false)}
                  />
                  <motion.div
                    className="absolute z-20 w-full mt-2 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl max-h-60 overflow-auto ring-1 ring-sky-200/15 subject-dropdown-scroll"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={ANIMATION_THEME.SPRINGS.TIMER_MODE_TABS}
                  >
                    {subjects.map((subject) => {
                      const color = getSubjectColor(subject);
                      return (
                        <motion.button
                          key={subject}
                          type="button"
                          onClick={() => {
                            setSelectedSubject(subject);
                            setIsSubjectDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 relative overflow-hidden ${
                            timerState.selectedSubject === subject ? 'bg-white/10' : ''
                          }`}
                          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                          transition={{ duration: ANIMATION_THEME.DURATIONS_S.HOVER_FEEDBACK }}
                        >
                          {color && (
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                          )}
                          <span className="text-slate-200 relative z-10">{subject}</span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 円形タイマー */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* リセットボタン（ストップウォッチのみ、サークルの左下） */}
          <AnimatePresence>
            {timerState.mode === 'stopwatch' && (
              <motion.div
                key="reset-button"
                className="absolute left-4 bottom-0"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: isImmersiveHidden ? 0 : 1, 
                  opacity: isImmersiveHidden ? 0 : 1 
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  duration: ANIMATION_THEME.DURATIONS_S.POPOVER
                }}
                style={{ pointerEvents: isImmersiveHidden ? 'none' : 'auto' }}
              >
                <button
                  onClick={resetTimer}
                  disabled={timerState.isRunning || subjects.length === 0}
                  aria-label="リセット"
                  title="リセット"
                  className="relative group w-12 h-12 inline-flex items-center justify-center bg-slate-800/50 hover:bg-slate-800/60 text-slate-200/60 hover:text-slate-200/90 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md ring-1 ring-sky-200/15 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
                >
                  {/* hover時だけ、科目カラーを極薄に発光 */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ boxShadow: `0 0 22px ${subjectGlowSoft}` }}
                  />
                  <RotateCcw size={20} className="relative z-10" aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div 
            role={circleIsInteractive ? 'button' : 'img'}
            tabIndex={circleIsInteractive ? 0 : -1}
            aria-label={
              circleIsInteractive
                ? (timerState.isRunning ? 'タイマーを停止' : 'タイマーを開始')
                : '手動入力'
            }
            onKeyDown={circleClickFeedback.handleKeyDown}
            onKeyUp={circleClickFeedback.handleKeyUp}
            onBlur={circleClickFeedback.handleBlur}
            onPointerDown={circleClickFeedback.handlePointerDown}
            onPointerUp={circleClickFeedback.handlePointerUp}
            onPointerLeave={circleClickFeedback.handlePointerLeave}
            className={`relative w-80 h-80 rounded-full bg-slate-900/35 ring-1 ring-sky-200/22 shadow-[0_6px_12px_rgba(0,0,0,0.38),0_18px_70px_rgba(0,0,0,0.42),0_0_0_1px_rgba(186,230,253,0.22)] focus:outline-none focus:ring-2 focus:ring-sky-200/25 backdrop-blur-md ${
              timerState.mode === 'manual' 
                ? 'cursor-default' // 手動入力モードではカーソルを通常に（クリック不可でも視覚的に無効化しない）
                : (circleIsInteractive && subjects.length > 0 ? 'cursor-pointer hover:shadow-[0_8px_14px_rgba(0,0,0,0.40),0_22px_82px_rgba(0,0,0,0.45),0_0_0_1px_rgba(186,230,253,0.26)] hover:bg-slate-900/40' : 'cursor-not-allowed opacity-50')
            } ${circleClickFeedback.activeClass}`}
          >
            {/* フラットな質感（球体ハイライトは入れない） */}
            {/* 影をくっきり見せるための追加ドロップシャドウ（背景から浮かせる） */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: '0 8px 14px rgba(0,0,0,0.32), 0 22px 70px rgba(0,0,0,0.36)' }}
            />

            {/* 稼働中の柔らかいグロウ（呼吸）: ポモドーロ動作中 */}
            {timerState.mode === 'pomodoro' && timerState.isRunning && (
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 rounded-full pointer-events-none"
                initial={false}
                animate={{ opacity: [0.10, 0.22, 0.10], scale: [1.0, ANIMATION_THEME.SCALES.GLOW.BREATH_MAX, 1.0] }}
                transition={{ duration: ANIMATION_THEME.LOOPS.GLOW_BREATH_S, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  boxShadow:
                    // 科目カラー優先 + 背景ブルーに馴染む薄いグロウ
                    `0 0 0 1px rgba(186,230,253,0.10), 0 0 36px rgba(56,189,248,0.12), 0 0 42px ${subjectGlow}, 0 0 88px ${subjectGlowSoft}`,
                }}
              />
            )}

            {/* 手動入力モード: 常時薄いグロウ */}
            {timerState.mode === 'manual' && (
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  boxShadow:
                    // 科目カラーの薄いグロウ（静止時）
                    `0 0 0 1px rgba(186,230,253,0.08), 0 0 32px rgba(56,189,248,0.08), 0 0 36px ${subjectGlowSoft}`,
                }}
              />
            )}




            {/* プログレスリング（ポモドーロのみ / 残り時間が減るほどリングが減る） */}
            {timerState.mode === 'pomodoro' && (
              // 回転はwrapper側で行う（motion側のtransform上書きを避ける）
              <div className="absolute inset-0 -rotate-90">
                <motion.svg
                  key={pomodoroRingIntroKey}
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  style={{ transformOrigin: '50% 50%' }}
                  initial={{ scale: ANIMATION_THEME.SCALES.POMODORO.RING_INTRO_START, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    duration: ANIMATION_THEME.DURATIONS_S.POMODORO_RING_INTRO,
                    ease: ANIMATION_THEME.EASINGS.OUT_BACK,
                  }}
                >
                  <defs>
                    {/* 先端だけ明るく、末端は背景に溶ける（2層リングで表現） */}
                    <linearGradient id={ringGradientId} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={subjectStroke} stopOpacity="0.18" />
                      <stop offset="70%" stopColor={subjectStroke} stopOpacity="0.32" />
                      <stop offset="100%" stopColor={subjectStroke} stopOpacity="0.70" />
                    </linearGradient>
                    {/* 科目カラーに基づいた淡い発光フィルター */}
                    <filter id={`glow-${ringGradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="blur" in2="SourceGraphic" operator="out" result="glow" />
                      <feFlood floodColor={subjectStroke} floodOpacity="0.5" result="color" />
                      <feComposite in="color" in2="glow" operator="in" result="softGlow" />
                      <feMerge>
                        <feMergeNode in="softGlow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    // ここを少し濃くして「リング」が背景に溶けないようにする
                    stroke="rgba(186, 230, 253, 0.20)"
                    strokeWidth="3.2"
                  />
                  {/* ベース（淡く）: 残り時間に応じて短くなる */}
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={subjectStroke}
                    strokeWidth="3.2"
                    strokeOpacity="0.62"
                    strokeDasharray={`${remainingLen || 0} ${ringCircumference || 0}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transition={{ ease: 'linear', duration: 1 }}
                    filter={`url(#glow-${ringGradientId})`}
                  />
                  {/* 先端ハイライト（明るい短い弧）
                      満タン(25:00)の初期状態では「左上だけ濃い」が出やすいので表示しない */}
                  {remainingLen < ringCircumference - 0.5 && !isNaN(remainingLen) && !isNaN(tipLen) && (
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={`url(#${ringGradientId})`}
                      strokeWidth="3.15"
                      strokeDasharray={`${Math.min(tipLen || 0, remainingLen || 0)} ${ringCircumference || 0}`}
                      initial={{
                        strokeDashoffset: -(Math.max((remainingLen || 0) - (tipLen || 0), 0)),
                      }}
                      animate={{
                        // 先端位置へ移動（右回り）
                        strokeDashoffset: -(Math.max((remainingLen || 0) - (tipLen || 0), 0)),
                      }}
                      strokeLinecap="round"
                      transition={{ ease: 'linear', duration: 1 }}
                      filter={`url(#glow-${ringGradientId})`}
                    />
                  )}
                </motion.svg>
              </div>
            )}
            
            {/* セット進行状況表示（ポモドーロのみ / サークル上部） */}
            {timerState.mode === 'pomodoro' && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none">
                <motion.div
                  key={`pomodoro-set-${timerState.pomodoroCurrentSet}-${timerState.pomodoroSets}`}
                  className="text-xs text-slate-200/50 tabular-nums"
                  initial={{ scale: ANIMATION_THEME.SCALES.POMODORO.CONTENT_INTRO_START, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    duration: ANIMATION_THEME.DURATIONS_S.POMODORO_RING_INTRO,
                    ease: ANIMATION_THEME.EASINGS.OUT_BACK,
                  }}
                >
                  {timerState.pomodoroCurrentSet}/{timerState.pomodoroSets}
                </motion.div>
              </div>
            )}

            {/* 中央の時間表示（数字のみ hover トリガー） */}
            <motion.div
              key={timerState.mode === 'manual' 
                ? `manual-content-${timerState.mode}`
                : `pomodoro-content-${pomodoroRingIntroKey}`}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ transformOrigin: '50% 50%' }}
              initial={{ scale: ANIMATION_THEME.SCALES.POMODORO.CONTENT_INTRO_START, opacity: 0 }}
              animate={{ scale: 1, opacity: shouldShowMainCount ? 1 : 0 }}
              transition={shouldShowMainCount
                ? {
                    duration: ANIMATION_THEME.DURATIONS_S.POMODORO_RING_INTRO,
                    ease: ANIMATION_THEME.EASINGS.OUT_BACK,
                  }
                : fadeTransition}
            >
              <div className="relative flex items-center justify-center">
                {/* ステータス背景アイコン（再生/一時停止） */}
                {timerState.mode !== 'manual' && (
                  <motion.div
                    // mode="wait"のexit待ちが「遅延」に見えるので排除：即差し替え + ごく短い入るアニメだけ
                    key={timerState.isRunning ? 'pause' : 'play'}
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.985 }}
                    // 背景質感は維持しつつ、少しだけ視認性を上げる
                    animate={{ opacity: 0.1, scale: 1 }}
                    transition={{ duration: ANIMATION_THEME.DURATIONS_S.CENTER_ICON_SWAP, ease: 'easeOut' }}
                    // 科目カラーではなく、UI全体と同じ「白い透明感」に寄せる
                    style={{ color: subjectStroke }}
                  >
                    {timerState.isRunning ? (
                      // 一時停止（Pause）: 角ばった標準的な形
                      <svg className="w-44 h-44" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      // 再生（Play）: 角ばった標準的な形
                      <svg className="w-44 h-44" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </motion.div>
                )}

                {/* 数字はモダンに：monoを外しつつ tabular-nums で揃える */}
                {timerState.mode === 'manual' ? (
                  // 手動入力モード：ホバーはCSSで維持（スクロール中のチカつき防止）
                  <div className="relative z-10 pointer-events-auto">
                    <div className="flex items-center justify-center gap-3">
                      <TimeUnitBox
                        value={timerState.manualHours}
                        label="時"
                        min={0}
                        max={23}
                        onChange={setManualHours}
                        adjust={adjustByStep}
                        disabled={timerState.isRunning}
                        isInteractive={timerState.mode === 'manual' && !timerState.isRunning}
                      />
                      <span className="text-6xl font-medium text-white">:</span>
                      <TimeUnitBox
                        value={timerState.manualMinutes}
                        label="分"
                        min={0}
                        max={59}
                        onChange={setManualMinutes}
                        adjust={adjustByStep}
                        disabled={timerState.isRunning}
                        isInteractive={timerState.mode === 'manual' && !timerState.isRunning}
                      />
                    </div>
                  </div>
                ) : (
                  // ポモドーロ/ストップウォッチモード
                  <div
                    className="relative z-10 pointer-events-auto"
                    onMouseEnter={() => {
                      if (timerState.mode !== 'pomodoro') return;
                      if (timerState.isRunning) return;
                      if (!canEditSettings) return;
                      setIsHoveringTimeText(true);
                      openSettingsWithDelay();
                    }}
                    onMouseLeave={() => {
                      setIsHoveringTimeText(false);
                      // 少しだけ自然に（Popoverに移動する猶予）
                      window.setTimeout(
                        () => closeSettingsIfAllowed(),
                        TIMER_SETTINGS.POMODORO.SETTINGS_POPOVER.CLOSE_GRACE_MS
                      );
                    }}
                  >
                    {/* ホバー演出：細い角丸枠＋わずかな暗転（0.2sフェード） */}
                    <AnimatePresence>
                      {canEditSettings && isHoveringTimeText && (
                        <motion.div
                          key="time-hover"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: ANIMATION_THEME.DURATIONS_S.HOVER_FEEDBACK, ease: 'easeOut' }}
                          className="absolute inset-[-10px] rounded-2xl bg-black/15 ring-1 ring-white/20"
                        />
                      )}
                    </AnimatePresence>

                    {pomodoroAwaitingStart ? (
                      <div 
                        className={`relative ${UI_VISUALS.TIMER_DISPLAY.AWAITING_PHASE.CLASS}`}
                        style={{
                          color: 'rgb(255, 255, 255)', // pure white
                        }}
                      >
                        {circleDisplayTime}
                      </div>
                    ) : (
                      // ストップウォッチ/ポモドーロモードの数字表示
                      <div 
                        className={`relative ${UI_VISUALS.TIMER_DISPLAY.DIGITS.CLASS} flex items-center gap-1`}
                        style={{
                          // ストップウォッチはGlowを削除（フラットな白文字）、ポモドーロは維持
                          filter: timerState.mode === 'stopwatch' ? 'none' : undefined,
                          textShadow: timerState.mode === 'stopwatch' ? 'none' : undefined,
                        }}
                      >
                        {circleDisplayTime}
                      </div>
                    )}

                  </div>
                )}
              </div>
            </motion.div>

            {/* ポモドーロ設定 Popover：サークル中央（数字に重なる位置）に表示 */}
            <AnimatePresence>
              {canEditSettings && isPomodoroSettingsOpen && (
                <>
                  {/* 背景の数字がうっすら残るように、控えめなガラスオーバーレイ */}
                  <motion.div
                    key="pomodoro-settings-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: ANIMATION_THEME.DURATIONS_S.FADE, ease: 'easeOut' }}
                    // overlayは見た目だけ（クリックは下のサークルに透過させる）
                    className="absolute inset-0 z-20 rounded-full bg-slate-950/35 backdrop-blur-[2px] pointer-events-none"
                  />

                  {/* NOTE: motion は transform を上書きするため、センタリング(translate)は wrapper で行う */}
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto"
                    onMouseEnter={() => {
                      popoverHoverRef.current = true;
                      if (settingsHoverTimerRef.current) window.clearTimeout(settingsHoverTimerRef.current);
                    }}
                    onMouseLeave={() => {
                      popoverHoverRef.current = false;
                      closeSettingsIfAllowed();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <motion.div
                      key="pomodoro-settings-centered"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: ANIMATION_THEME.DURATIONS_S.POPOVER, ease: 'easeOut' }}
                      className="rounded-2xl bg-slate-900/70 ring-1 ring-sky-200/18 backdrop-blur-md p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
                      style={{ width: UI_VISUALS.POPOVER.POMODORO_SETTINGS_WIDTH_PX }}
                    >
                      <DurationRow
                        label="休憩"
                        value={timerState.pomodoroBreakMinutes}
                        min={TIMER_SETTINGS.POMODORO.RANGE.BREAK.MIN_MINUTES}
                        max={TIMER_SETTINGS.POMODORO.RANGE.BREAK.MAX_MINUTES}
                        onChange={(next) => setPomodoroBreakMinutes(next)}
                        adjustMinutes={adjustMinutes}
                        disabled={subjects.length === 0}
                      />
                      <div className="h-3" />
                      <DurationRow
                        label="集中"
                        value={timerState.pomodoroFocusMinutes}
                        min={TIMER_SETTINGS.POMODORO.RANGE.FOCUS.MIN_MINUTES}
                        max={TIMER_SETTINGS.POMODORO.RANGE.FOCUS.MAX_MINUTES}
                        onChange={(next) => setPomodoroFocusMinutes(next)}
                        adjustMinutes={adjustMinutes}
                        disabled={subjects.length === 0}
                        autoFocus
                      />
                      <div className="h-3" />
                      <DurationRow
                        label="セット数"
                        value={timerState.pomodoroSets}
                        min={TIMER_SETTINGS.POMODORO.RANGE.SETS.MIN}
                        max={TIMER_SETTINGS.POMODORO.RANGE.SETS.MAX}
                        onChange={(next) => setPomodoroSets(next)}
                        adjustMinutes={adjustMinutes}
                        unit="セット"
                        disabled={subjects.length === 0}
                      />
                    </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>


          </div>
        </div>

        {/* 記録ボタン（没入モード対象） */}
        <motion.div
          animate={{ opacity: isImmersiveHidden ? 0 : 1 }}
          transition={fadeTransition}
          style={{ pointerEvents: isImmersiveHidden ? 'none' : 'auto' }}
        >
          <button
            disabled={isRecordButtonDisabled}
            onClick={handleRecord}
            className="w-full px-6 py-3 rounded-full font-medium text-slate-200/90 bg-slate-800/50 hover:bg-slate-800/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative backdrop-blur-md ring-1 ring-sky-200/15 shadow-[0_16px_40px_rgba(0,0,0,0.50)]"
          >
            <span className="flex items-center justify-center">記録</span>
          </button>
        </motion.div>

      </div>
    </div>
  );
}

