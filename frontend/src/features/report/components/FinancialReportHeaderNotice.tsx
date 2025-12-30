import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { Info } from 'lucide-react';
import type { StudyProgress, Subject, Todo } from '../../../api/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';
import { useAccentMode } from '../../../contexts/AccentModeContext';
import ReportWizard from './ReportWizard';
import { ReportWelcomeModal } from './ReportWelcomeModal';

type Props = {
  reportStartDay: number;
  progressList: StudyProgress[];
  todos: Todo[];
  subjectsWithColors: Subject[];
};

export function FinancialReportHeaderNotice({ reportStartDay, progressList, todos, subjectsWithColors }: Props) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const { setAccentMode } = useAccentMode();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const closeTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const devAlwaysEnable = import.meta.env.DEV;

  const shouldShowEntry = useMemo(() => {
    const dow = new Date().getDay(); // 0=Sun..6=Sat
    const start = Math.max(0, Math.min(6, Math.floor(reportStartDay)));
    const grace = (start + 1) % 7;
    return dow === start || dow === grace;
  }, [reportStartDay]);

  const reportPeriod = useMemo(() => {
    if (devAlwaysEnable) {
      const periodStart = startOfDay(new Date(2025, 11, 21));
      const periodEnd = endOfDay(new Date(2025, 11, 27));
      const periodId = `${format(periodStart, 'yyyy-MM-dd')}__${format(periodEnd, 'yyyy-MM-dd')}`;
      return { periodStart, periodEnd, periodId };
    }

    const now = new Date();
    const start = Math.max(0, Math.min(6, Math.floor(reportStartDay)));
    const grace = (start + 1) % 7;
    const todayDow = now.getDay();
    const reportDay = todayDow === start ? now : (todayDow === grace ? subDays(now, 1) : now);
    const periodEnd = endOfDay(subDays(reportDay, 1));
    const periodStart = startOfDay(subDays(periodEnd, 6));
    const periodId = `${format(periodStart, 'yyyy-MM-dd')}__${format(periodEnd, 'yyyy-MM-dd')}`;
    return { periodStart, periodEnd, periodId };
  }, [devAlwaysEnable, reportStartDay]);

  const isReported = useMemo(() => {
    const last = localStorage.getItem('reportWizard:lastReportedPeriodId');
    return last === reportPeriod.periodId;
  }, [reportPeriod.periodId]);

  const isVisible = (devAlwaysEnable || shouldShowEntry) && (!isReported || devAlwaysEnable);
  const showIcon = isVisible;

  const closePopoverSoon = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setIsPopoverOpen(false), 120);
  };

  const openPopover = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setIsPopoverOpen(true);
  };

  useEffect(() => {
    if (!isPopoverOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setIsPopoverOpen(false);
    };
    window.addEventListener('mousedown', onDocMouseDown);
    return () => window.removeEventListener('mousedown', onDocMouseDown);
  }, [isPopoverOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Wizard中は誤操作を避けるためポップオーバーだけ閉じる
  useEffect(() => {
    if (isWizardOpen) setIsPopoverOpen(false);
  }, [isWizardOpen]);

  if (!showIcon) return null;

  const periodText = `【対象期間】 ${format(reportPeriod.periodStart, 'yyyy/M/d')} ~ ${format(reportPeriod.periodEnd, 'yyyy/M/d')}`;

  return (
    <>
      <div
        ref={rootRef}
        className="relative inline-flex items-center"
        onMouseEnter={openPopover}
        onMouseLeave={closePopoverSoon}
        onClick={(e: ReactMouseEvent) => {
          // 親の「ホームへ戻る」クリックを防ぐ
          e.stopPropagation();
        }}
      >
        <motion.button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsPopoverOpen((v) => !v);
          }}
          className="inline-flex items-center justify-center rounded-full w-10 h-10"
          style={{
            color: theme === 'modern' ? '#FFB800' : colors.accent,
          }}
          aria-label="財務報告の通知"
        >
          <motion.span
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <Info size={26} />
          </motion.span>
        </motion.button>

        <AnimatePresence>
          {isPopoverOpen && (
            <motion.div
              key="financial-report-header-popover"
              initial={{ opacity: 0, x: -8, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-[320px] max-w-[min(92vw,360px)] rounded-2xl border shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden z-[90]"
              style={{
                backgroundColor: theme === 'modern' ? 'rgba(8, 14, 28, 0.90)' : colors.card,
                backdropFilter: theme === 'modern' ? 'blur(14px)' : 'none',
                borderColor: theme === 'modern' ? 'rgba(255,255,255,0.14)' : colors.border,
              }}
              onMouseEnter={openPopover}
              onMouseLeave={closePopoverSoon}
              onClick={(e: ReactMouseEvent) => e.stopPropagation()}
              role="dialog"
              aria-label="財務報告の通知"
            >
              <div className="px-4 py-4">
                <p className="text-sm font-extrabold" style={{ color: colors.textPrimary }}>
                  財務報告の作成準備が整いました
                </p>
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  {periodText}
                </p>

                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-sm font-extrabold transition-colors"
                    style={{
                      backgroundColor: theme === 'modern' ? 'rgba(255,184,0,0.95)' : colors.accent,
                      color: theme === 'modern' ? '#111827' : '#ffffff',
                    }}
                    onClick={() => {
                      setAccentMode('report');
                      setIsPopoverOpen(false);
                      setIsWelcomeOpen(true);
                    }}
                  >
                    開始
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ReportWelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => {
          setIsWelcomeOpen(false);
          setAccentMode('normal');
        }}
        onStart={() => {
          setIsWelcomeOpen(false);
          setIsWizardOpen(true);
        }}
      />

      {isWizardOpen && (
        <ReportWizard
          reportStartDay={reportStartDay}
          periodStart={reportPeriod.periodStart}
          periodEnd={reportPeriod.periodEnd}
          progressList={progressList}
          todos={todos}
          subjectsWithColors={subjectsWithColors}
          onClose={() => {
            setIsWizardOpen(false);
            setAccentMode('normal');
          }}
          onCopied={(periodId) => {
            localStorage.setItem('reportWizard:lastReportedPeriodId', periodId);
            setIsWizardOpen(false);
            setAccentMode('normal');
          }}
        />
      )}
    </>
  );
}


