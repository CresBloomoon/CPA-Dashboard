import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  adjustMinutes: (current: number, deltaSteps: number, min: number, max: number) => number;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-slate-200/80 w-14 flex-shrink-0 whitespace-nowrap">{label}</div>
      <div
        className="flex-1 rounded-xl bg-slate-800/45 ring-1 ring-sky-200/12 backdrop-blur-md px-4 py-3 select-none cursor-ns-resize hover:bg-slate-800/55 transition-colors"
        onWheel={(e) => {
          e.preventDefault();
          const direction = e.deltaY > 0 ? -1 : 1;
          const next = adjustMinutes(value, direction, min, max);
          onChange(next);
        }}
      >
        <div className="flex items-baseline justify-center gap-2">
          <div className="text-2xl font-semibold text-slate-200 tabular-nums">
            {String(value).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-200/60">{unit}</div>
        </div>
      </div>
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

  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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
  // 手動入力モード用の状態
  const [isHoveringManualHours, setIsHoveringManualHours] = useState(false);
  const [isHoveringManualMinutes, setIsHoveringManualMinutes] = useState(false);

  // 科目名から色を取得（未定義ならグレーにフォールバック）
  const getSubjectColor = (subjectName?: string): string | undefined =>
    resolveSubjectColor(subjectName, subjectsWithColors, SUBJECT_COLOR_FALLBACK);

  // DB初期化後でもUIがズレないよう、LocalStorage由来の旧科目名を正規化する
  useEffect(() => {
    const selected = timerState.selectedSubject;
    if (!selected) return;
    const validNames = (subjectsWithColors.length > 0 ? subjectsWithColors.map((s) => s.name) : subjects).filter(Boolean);
    if (validNames.includes(selected)) return;

    const mapped = SUBJECT_NAME_ALIASES[selected] || '';
    if (mapped && validNames.includes(mapped)) {
      setSelectedSubject(mapped);
      return;
    }
    // どれにも一致しない場合は未選択に戻す（色/名称の不整合を回避）
    setSelectedSubject('');
  }, [subjects, subjectsWithColors, timerState.selectedSubject, setSelectedSubject]);

  // 時間を記録
  const handleRecord = async () => {
    setIsRecording(true);
    const result = await saveRecord(onRecorded);
    setIsRecording(false);
    
    // トースト通知を表示
    setToastMessage(result.message);
    setTimeout(() => {
      setToastMessage(null);
    }, TIMER_SETTINGS.FEEDBACK.TOAST_DURATION_MS);
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
  const remainingLen = useMemo(() => ringCircumference * pomodoroRemainingRatio, [ringCircumference, pomodoroRemainingRatio]);
  // 先端ハイライトは「塊」に見えやすいので短め＆控えめに
  const tipLen = useMemo(() => Math.min(Math.max(ringCircumference * 0.03, 8), 16), [ringCircumference]); // 先端だけ明るい部分


  const handleToggle = () => {
    if (!timerState.selectedSubject) return;
    if (!circleIsInteractive) return;
    // 設定ポップアップ表示中でも、開始操作は許可（押したらフェードアウトさせる）
    if (isPomodoroSettingsOpen) {
      setIsHoveringTimeText(false);
      closeSettingsImmediate();
    }
    if (timerState.isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  };

  // タイマーサークルのクリックフィードバック
  const circleClickFeedback = useClickFeedback(handleToggle, !circleIsInteractive);

  // 科目選択ボタンのクリックフィードバック
  const subjectSelectFeedback = useClickFeedback(
    () => setIsSubjectDropdownOpen((prev) => !prev),
    timerState.isRunning
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

  // 記録ボタンのクリックフィードバック
  const recordButtonFeedback = useClickFeedback(handleRecord, isRecordButtonDisabled);



  // ポモドーロ設定UI：実行開始時は閉じる
  useEffect(() => {
    if (timerState.isRunning) setIsPomodoroSettingsOpen(false);
  }, [timerState.isRunning]);


  const adjustMinutes = (current: number, deltaSteps: number, min: number, max: number) => {
    return adjustPomodoroMinutes(current, deltaSteps, TIMER_SETTINGS.POMODORO.STEP_MINUTES, min, max);
  };

  const openSettingsWithDelay = () => {
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
              disabled={timerState.isRunning}
              onKeyDown={subjectSelectFeedback.handleKeyDown}
              onKeyUp={subjectSelectFeedback.handleKeyUp}
              onBlur={subjectSelectFeedback.handleBlur}
              onPointerDown={subjectSelectFeedback.handlePointerDown}
              onPointerUp={subjectSelectFeedback.handlePointerUp}
              onPointerLeave={subjectSelectFeedback.handlePointerLeave}
              className={`w-full px-4 py-3 rounded-full text-slate-200/90 bg-slate-800/50 hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-2 backdrop-blur-md ring-1 ring-sky-200/15 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ${
                timerState.isRunning ? 'opacity-50 cursor-not-allowed' : ''
              } ${subjectSelectFeedback.activeClass}`}
            >
              {timerState.selectedSubject && subjectColor && (
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: subjectColor }}
                />
              )}
              <span className="text-sm">
                {timerState.selectedSubject || '科目を選択'}
              </span>
            </button>
            
            <AnimatePresence>
              {isSubjectDropdownOpen && !timerState.isRunning && (
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
                  disabled={timerState.isRunning}
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
              circleIsInteractive ? 'cursor-pointer hover:shadow-[0_8px_14px_rgba(0,0,0,0.40),0_22px_82px_rgba(0,0,0,0.45),0_0_0_1px_rgba(186,230,253,0.26)] hover:bg-slate-900/40' : 'cursor-default opacity-80'
            } ${circleClickFeedback.activeClass}`}
          >
            {/* フラットな質感（球体ハイライトは入れない） */}
            {/* 影をくっきり見せるための追加ドロップシャドウ（背景から浮かせる） */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: '0 8px 14px rgba(0,0,0,0.32), 0 22px 70px rgba(0,0,0,0.36)' }}
            />

            {/* 稼働中の柔らかいグロウ（呼吸）: ポモドーロのみ */}
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
                    strokeDasharray={`${remainingLen} ${ringCircumference}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transition={{ ease: 'linear', duration: 1 }}
                  />
                  {/* 先端ハイライト（明るい短い弧）
                      満タン(25:00)の初期状態では「左上だけ濃い」が出やすいので表示しない */}
                  {remainingLen < ringCircumference - 0.5 && (
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={`url(#${ringGradientId})`}
                      strokeWidth="3.15"
                      strokeDasharray={`${Math.min(tipLen, remainingLen)} ${ringCircumference}`}
                      animate={{
                        // 先端位置へ移動（右回り）
                        strokeDashoffset: -(Math.max(remainingLen - tipLen, 0)),
                      }}
                      strokeLinecap="round"
                      transition={{ ease: 'linear', duration: 1 }}
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
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: ANIMATION_THEME.DURATIONS_S.POMODORO_RING_INTRO,
                ease: ANIMATION_THEME.EASINGS.OUT_BACK,
              }}
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
                  // 手動入力モード：時間と分で分けてホバー可能
                  <div className="relative z-10 pointer-events-auto flex items-center gap-1">
                    {/* 時間部分 */}
                    <div
                      className="relative"
                      onMouseEnter={() => {
                        if (timerState.isRunning) return;
                        setIsHoveringManualHours(true);
                      }}
                      onMouseLeave={() => {
                        setIsHoveringManualHours(false);
                      }}
                      onWheel={(e) => {
                        if (timerState.isRunning) return;
                        e.preventDefault();
                        const direction = e.deltaY > 0 ? -1 : 1;
                        const next = adjustByStep(timerState.manualHours, direction, 0, 24);
                        setManualHours(next);
                      }}
                    >
                      {/* ホバー演出：細い角丸枠＋わずかな暗転 */}
                      <AnimatePresence>
                        {isHoveringManualHours && (
                          <motion.div
                            key="manual-hours-hover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: ANIMATION_THEME.DURATIONS_S.HOVER_FEEDBACK, ease: 'easeOut' }}
                            className="absolute inset-[-8px] rounded-xl bg-black/15 ring-1 ring-white/20"
                          />
                        )}
                      </AnimatePresence>
                      {/* 上下矢印アイコン */}
                      <AnimatePresence>
                        {isHoveringManualHours && (
                          <motion.div
                            key="manual-hours-arrows"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: ANIMATION_THEME.DURATIONS_S.HOVER_FEEDBACK, ease: 'easeOut' }}
                            className="absolute -top-6 left-0 right-0 flex flex-col items-center justify-center gap-0.5"
                          >
                            <ChevronUp size={14} className="text-slate-200/70" />
                            <ChevronDown size={14} className="text-slate-200/70" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className={UI_VISUALS.TIMER_DISPLAY.DIGITS.CLASS}>
                        {String(timerState.manualHours).padStart(2, '0')}
                      </div>
                    </div>
                    {/* コロン */}
                    <div className={UI_VISUALS.TIMER_DISPLAY.DIGITS.CLASS}>
                      :
                    </div>
                    {/* 分部分 */}
                    <div
                      className="relative"
                      onMouseEnter={() => {
                        if (timerState.isRunning) return;
                        setIsHoveringManualMinutes(true);
                      }}
                      onMouseLeave={() => {
                        setIsHoveringManualMinutes(false);
                      }}
                      onWheel={(e) => {
                        if (timerState.isRunning) return;
                        e.preventDefault();
                        const direction = e.deltaY > 0 ? -1 : 1;
                        const next = adjustByStep(timerState.manualMinutes, direction, 0, 59);
                        setManualMinutes(next);
                      }}
                    >
                      {/* ホバー演出：細い角丸枠＋わずかな暗転 */}
                      <AnimatePresence>
                        {isHoveringManualMinutes && (
                          <motion.div
                            key="manual-minutes-hover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: ANIMATION_THEME.DURATIONS_S.HOVER_FEEDBACK, ease: 'easeOut' }}
                            className="absolute inset-[-8px] rounded-xl bg-black/15 ring-1 ring-white/20"
                          />
                        )}
                      </AnimatePresence>
                      {/* 上下矢印アイコン */}
                      <AnimatePresence>
                        {isHoveringManualMinutes && (
                          <motion.div
                            key="manual-minutes-arrows"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: ANIMATION_THEME.DURATIONS_S.HOVER_FEEDBACK, ease: 'easeOut' }}
                            className="absolute -top-6 left-0 right-0 flex flex-col items-center justify-center gap-0.5"
                          >
                            <ChevronUp size={14} className="text-slate-200/70" />
                            <ChevronDown size={14} className="text-slate-200/70" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className={UI_VISUALS.TIMER_DISPLAY.DIGITS.CLASS}>
                        {String(timerState.manualMinutes).padStart(2, '0')}
                      </div>
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
                      <div className={`relative ${UI_VISUALS.TIMER_DISPLAY.AWAITING_PHASE.CLASS}`}>
                        {circleDisplayTime}
                      </div>
                    ) : (
                      // 手動入力モードと同じスタイルで統一（各部分を分けて表示）
                      <div className={`relative ${UI_VISUALS.TIMER_DISPLAY.DIGITS.CLASS} flex items-center gap-1`}>
                        {(() => {
                          // circleDisplayTimeを分割（MM:SS または HH:MM:SS）
                          const parts = circleDisplayTime.split(':');
                          if (parts.length === 2) {
                            // MM:SS形式
                            return (
                              <>
                                <span>{parts[0]}</span>
                                <span>:</span>
                                <span>{parts[1]}</span>
                              </>
                            );
                          } else if (parts.length === 3) {
                            // HH:MM:SS形式
                            return (
                              <>
                                <span>{parts[0]}</span>
                                <span>:</span>
                                <span>{parts[1]}</span>
                                <span>:</span>
                                <span>{parts[2]}</span>
                              </>
                            );
                          }
                          // フォーマットが異なる場合はそのまま表示
                          return <span>{circleDisplayTime}</span>;
                        })()}
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
                        label="集中"
                        value={timerState.pomodoroFocusMinutes}
                        min={TIMER_SETTINGS.POMODORO.RANGE.FOCUS.MIN_MINUTES}
                        max={TIMER_SETTINGS.POMODORO.RANGE.FOCUS.MAX_MINUTES}
                        onChange={(next) => setPomodoroFocusMinutes(next)}
                        adjustMinutes={adjustMinutes}
                      />
                      <div className="h-3" />
                      <DurationRow
                        label="休憩"
                        value={timerState.pomodoroBreakMinutes}
                        min={TIMER_SETTINGS.POMODORO.RANGE.BREAK.MIN_MINUTES}
                        max={TIMER_SETTINGS.POMODORO.RANGE.BREAK.MAX_MINUTES}
                        onChange={(next) => setPomodoroBreakMinutes(next)}
                        adjustMinutes={adjustMinutes}
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
            onKeyDown={recordButtonFeedback.handleKeyDown}
            onKeyUp={recordButtonFeedback.handleKeyUp}
            onBlur={recordButtonFeedback.handleBlur}
            onPointerDown={recordButtonFeedback.handlePointerDown}
            onPointerUp={recordButtonFeedback.handlePointerUp}
            onPointerLeave={recordButtonFeedback.handlePointerLeave}
            className={`w-full px-6 py-3 bg-slate-800/45 hover:bg-slate-800/55 text-slate-200 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative backdrop-blur-md ring-1 ring-sky-200/15 shadow-[0_16px_40px_rgba(0,0,0,0.50)] ${recordButtonFeedback.activeClass}`}
          >
            {isRecording ? '記録中...' : toastMessage && toastMessage.includes('記録しました') ? '完了！' : '記録'}
          </button>
        </motion.div>

        {/* トースト通知 */}
        {toastMessage && (
          <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${
            toastMessage.includes('記録しました') 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}

