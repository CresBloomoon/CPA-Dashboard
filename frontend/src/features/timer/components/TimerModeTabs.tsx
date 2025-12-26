import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ANIMATION_THEME } from '../../../config/appConfig';

type TimerMode = 'pomodoro' | 'stopwatch' | 'manual';

interface TimerModeTabsProps {
  mode: TimerMode;
  disabled?: boolean;
  onChange: (mode: TimerMode) => void;
}

const tabs: Array<{ id: TimerMode; label: string }> = [
  { id: 'pomodoro', label: 'ポモドーロ' },
  { id: 'stopwatch', label: 'ストップウォッチ' },
  { id: 'manual', label: '手動入力' },
];

export default function TimerModeTabs({ mode, disabled = false, onChange }: TimerModeTabsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<TimerMode, HTMLButtonElement | null>>({
    pomodoro: null,
    stopwatch: null,
    manual: null,
  });

  const [indicator, setIndicator] = useState<{ x: number; width: number; ready: boolean }>({
    x: 0,
    width: 0,
    ready: false,
  });

  const updateIndicator = () => {
    const container = containerRef.current;
    const activeEl = tabRefs.current[mode];
    if (!container || !activeEl) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    setIndicator({
      x: activeRect.left - containerRect.left,
      width: activeRect.width,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    updateIndicator();

    const ro = new ResizeObserver(() => updateIndicator());
    if (containerRef.current) ro.observe(containerRef.current);
    const activeEl = tabRefs.current[mode];
    if (activeEl) ro.observe(activeEl);

    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, disabled]);

  const focusMode = (next: TimerMode) => {
    tabRefs.current[next]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, current: TimerMode) => {
    if (disabled) return;
    const idx = tabs.findIndex(t => t.id === current);
    if (idx < 0) return;

    const moveFocus = (nextIdx: number) => {
      const next = tabs[(nextIdx + tabs.length) % tabs.length]?.id;
      if (!next) return;
      e.preventDefault();
      focusMode(next);
    };

    switch (e.key) {
      case 'ArrowLeft':
        moveFocus(idx - 1);
        break;
      case 'ArrowRight':
        moveFocus(idx + 1);
        break;
      case 'Home':
        e.preventDefault();
        focusMode(tabs[0].id);
        break;
      case 'End':
        e.preventDefault();
        focusMode(tabs[tabs.length - 1].id);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onChange(current);
        break;
      default:
        break;
    }
  };

  const indicatorTransition = useMemo(
    () => ANIMATION_THEME.SPRINGS.TIMER_MODE_TABS,
    []
  );

  return (
    <div className="flex justify-center mb-8">
      {/* インジケーターがアニメ中に外へはみ出さないよう、親でクリップする */}
      <div
        ref={containerRef}
        className="relative inline-flex rounded-full bg-slate-800/50 p-1 overflow-hidden backdrop-blur-md ring-1 ring-sky-200/15 shadow-[0_10px_30px_rgba(0,0,0,0.40)]"
      >
        {indicator.ready && (
          <>
            {/* 背景ピル（白20%） */}
            <motion.div
              aria-hidden="true"
              className="absolute top-1 bottom-1 rounded-full bg-white/10"
              style={{ left: 0, opacity: 0.18 }}
              initial={false}
              animate={{ x: indicator.x, width: indicator.width }}
              transition={indicatorTransition}
            />
            {/* 白枠（フォーカス/選択インジケーター） */}
            <motion.div
              aria-hidden="true"
              className="absolute top-1 bottom-1 rounded-full ring-2 ring-sky-100/70 pointer-events-none"
              style={{ left: 0, opacity: 0.65 }}
              initial={false}
              animate={{ x: indicator.x, width: indicator.width }}
              transition={indicatorTransition}
            />
          </>
        )}

        {tabs.map((t) => {
          const isActive = mode === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              disabled={disabled}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => handleKeyDown(e, t.id)}
              className={`relative z-10 px-5 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none ${
                isActive ? 'text-slate-200' : 'text-slate-300/70 hover:text-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}


