import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import type { StudyProgress, Subject, Todo } from '../../../api/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';
import { ChevronDown } from 'lucide-react';
import type { ReportData, UpdateReportData } from '../types/reportWizard';
import { ReportStep1 } from './steps/ReportStep1';
import { ReportStep2 } from './steps/ReportStep2';
import { ReportStep3 } from './steps/ReportStep3';
import { ReportStep4 } from './steps/ReportStep4';
import type { SubjectHoursRow } from './steps/ReportStep1';

export default function ReportWizard({
  reportStartDay: _reportStartDay,
  periodStart,
  periodEnd,
  progressList,
  todos,
  subjectsWithColors,
  onClose,
  onCopied,
}: {
  reportStartDay: number;
  periodStart: Date;
  periodEnd: Date;
  progressList: StudyProgress[];
  todos: Todo[];
  subjectsWithColors: Subject[];
  onClose: () => void;
  onCopied: (periodId: string) => void;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const periodId = useMemo(
    () => `${format(periodStart, 'yyyy-MM-dd')}__${format(periodEnd, 'yyyy-MM-dd')}`,
    [periodStart, periodEnd]
  );

  const [step, setStep] = useState(0); // 0..N-1
  const [toast, setToast] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const [isCopyGlow, setIsCopyGlow] = useState(false);

  const copySuccessTimeoutRef = useRef<number | null>(null);
  const copyGlowTimeoutRef = useRef<number | null>(null);
  const copyCloseTimeoutRef = useRef<number | null>(null);

  const primaryFooterButtonRef = useRef<HTMLButtonElement | null>(null);
  const focusPrimaryFooterButton = () => {
    primaryFooterButtonRef.current?.focus();
  };

  const [reportData, setReportData] = useState<ReportData>({
    reflection: '',
    scores: [{ name: '', score: '', fullScore: '' }],
    issues: '',
    solutions: '',
    nextWeekPlan: '',
    questions: '',
  });

  // ダッシュボード側の集計ロジック（yyyy-MM-ddのキー比較）と揃える
  const periodStartKey = useMemo(() => format(periodStart, 'yyyy-MM-dd'), [periodStart]);
  const periodEndKey = useMemo(() => format(periodEnd, 'yyyy-MM-dd'), [periodEnd]);

  const updateData: UpdateReportData = (patch) => {
    setReportData((prev: ReportData) => ({ ...prev, ...patch }));
  };

  const lastWeekHoursDebug = useMemo(() => {
    let matched = 0;
    let sum = 0;
    for (const p of progressList) {
      const key = format(parseISO(p.created_at), 'yyyy-MM-dd');
      if (key >= periodStartKey && key <= periodEndKey) {
        matched += 1;
        sum += p.study_hours;
      }
    }
    return { matched, sum };
  }, [progressList, periodStartKey, periodEndKey]);

  const lastWeekTotalHours = lastWeekHoursDebug.sum;

  const subjectHours = useMemo<SubjectHoursRow[]>(() => {
    // 表示順：subjectsWithColorsにある科目→その他
    const order = subjectsWithColors.map((s) => s.name);
    const sums = new Map<string, number>();
    for (const p of progressList) {
      const key = format(parseISO(p.created_at), 'yyyy-MM-dd');
      if (key < periodStartKey || key > periodEndKey) continue;
      const subj = (p.subject || '').trim() || '未分類';
      sums.set(subj, (sums.get(subj) ?? 0) + p.study_hours);
    }

    const result: SubjectHoursRow[] = [];
    for (const s of order) {
      const v = sums.get(s);
      if (v && v > 0) result.push({ subject: s, hours: v });
      sums.delete(s);
    }
    Array.from(sums.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
      .forEach(([subject, hours]) => {
        if (hours > 0) result.push({ subject, hours });
      });
    return result;
  }, [progressList, subjectsWithColors, periodStartKey, periodEndKey]);

  const completedTodosBySubject = useMemo(() => {
    const subjectOrder = subjectsWithColors.map((s) => s.name);
    const map = new Map<string, string[]>();

    const getCompletedDateKey = (t: Todo): string =>
      format(parseISO(t.updated_at || t.created_at), 'yyyy-MM-dd');

    todos.forEach((t) => {
      if (!t.completed) return;
      const key = getCompletedDateKey(t);
      if (key < periodStartKey || key > periodEndKey) return;
      const subject = t.subject?.trim() || '未分類';
      if (!map.has(subject)) map.set(subject, []);
      map.get(subject)!.push(t.title);
    });

    // 表示順：subjectsWithColorsにある科目→その他（未分類含む）
    const ordered: Array<[string, string[]]> = [];
    subjectOrder.forEach((s) => {
      const list = map.get(s);
      if (list && list.length > 0) ordered.push([s, list]);
      map.delete(s);
    });
    Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
      .forEach((e) => ordered.push(e));

    return ordered;
  }, [todos, subjectsWithColors, periodStartKey, periodEndKey]);

  const IND1 = '　';
  const IND2 = '　　';

  const bulletize = (text: string, indent: string): string => {
    const trimmed = (text || '').trim();
    if (!trimmed) return `${indent}・（未入力）`;
    const lines = trimmed.split(/\r?\n/);
    return [ `${indent}・${lines[0]}`, ...lines.slice(1).map((l) => `${indent}　${l}`) ].join('\n');
  };

  const todoListText = useMemo(() => {
    if (completedTodosBySubject.length === 0) return `${IND1}（該当期間に完了したリマインダはありません）`;
    return completedTodosBySubject
      .map(([subject, items]: [string, string[]]) => {
        const lines = items.map((t) => `${IND1}・${t}`).join('\n');
        return `${IND1}（${subject}）\n${lines}`;
      })
      .join('\n\n');
  }, [completedTodosBySubject]);

  // 表示幅（monospace想定）: 全角=2, 半角=1 でざっくり計算（半角カナは1）
  const getDisplayWidth = (s: string): number => {
    let width = 0;
    for (const ch of s) {
      const code = ch.codePointAt(0) ?? 0;
      // 半角カナ
      if (code >= 0xff61 && code <= 0xff9f) {
        width += 1;
        continue;
      }
      // ASCII
      if (code <= 0x7f) {
        width += 1;
        continue;
      }
      // その他は全角扱い
      width += 2;
    }
    return width;
  };

  const scoresText = useMemo(() => {
    type LocalScoreRow = ReportData['scores'][number];
    const rows = reportData.scores
      .map((r: LocalScoreRow) => ({
        name: r.name.trim(),
        score: r.score.trim(),
        fullScore: r.fullScore.trim(),
      }))
      .filter((r: { name: string; score: string; fullScore: string }) => r.name || r.score || r.fullScore);
    if (rows.length === 0) return `${IND1}（未入力）`;

    const labels = rows.map((r: { name: string }) => r.name || '（答練名未入力）');
    // 目安: 全角15文字分（=30カラム）を最低幅として、最大の答練名に合わせて拡張
    const baseWidth = 30;
    const targetWidth = Math.max(baseWidth, ...labels.map(getDisplayWidth));

    return rows
      .map((r: { score: string; fullScore: string }, idx: number) => {
        const label = labels[idx];
        const pad = ' '.repeat(Math.max(0, targetWidth - getDisplayWidth(label)));
        const s = r.score || '-';
        const f = r.fullScore || '-';
        // コロン位置を揃える（プレビューはfont-mono）
        return `${IND1}・${label}${pad}： ${s}/${f}点`;
      })
      .join('\n');
  }, [reportData.scores]);

  const outputText = useMemo(() => {
    return [
      '■先週実施したこと',
      todoListText,
      '',
      '■先週解いた答練の点数',
      scoresText,
      '',
      '■先週の勉強時間、振り返り',
      `${IND1}（勉強時間）`,
      bulletize(`${lastWeekTotalHours.toFixed(1)}時間`, IND2),
      `${IND1}（振り返り）`,
      bulletize(reportData.reflection, IND2),
      '',
      '■現状課題と課題に対する解決策（アクションプラン）',
      `${IND1}（課題）`,
      bulletize(reportData.issues, IND2),
      `${IND1}（解決策）`,
      bulletize(reportData.solutions, IND2),
      '',
      '■今週実施すること',
      bulletize(reportData.nextWeekPlan, IND1),
      '',
      '■相談したいこと',
      bulletize(reportData.questions, IND1),
    ].join('\n');
  }, [todoListText, scoresText, lastWeekTotalHours, reportData]);

  const steps = useMemo(() => {
    return [
      {
        id: 'step-1',
        render: () => (
          <ReportStep1
            theme={theme}
            colors={colors}
            reportData={reportData}
            updateData={updateData}
            lastWeekTotalHours={lastWeekTotalHours}
            subjectHours={subjectHours}
            todoListText={todoListText}
            periodStartKey={periodStartKey}
            periodEndKey={periodEndKey}
            matchedCount={lastWeekHoursDebug.matched}
            onTabToNext={focusPrimaryFooterButton}
          />
        ),
      },
      {
        id: 'step-2',
        render: () => (
          <ReportStep2 theme={theme} colors={colors} reportData={reportData} updateData={updateData} onTabToNext={focusPrimaryFooterButton} />
        ),
      },
      {
        id: 'step-3',
        render: () => (
          <ReportStep3 theme={theme} colors={colors} reportData={reportData} updateData={updateData} onTabToNext={focusPrimaryFooterButton} />
        ),
      },
      {
        id: 'step-4',
        render: () => <ReportStep4 theme={theme} colors={colors} reportData={reportData} updateData={updateData} />,
      },
    ] as const;
  }, [
    theme,
    colors,
    reportData,
    updateData,
    lastWeekTotalHours,
    subjectHours,
    todoListText,
    periodStartKey,
    periodEndKey,
    lastWeekHoursDebug.matched,
  ]);

  const isFinalStep = step === steps.length - 1;

  useEffect(() => {
    // 最終ステップは Enter 一発で確定できるよう、主要ボタンにフォーカス
    if (isFinalStep) window.setTimeout(() => primaryFooterButtonRef.current?.focus(), 0);
  }, [isFinalStep]);

  const progressPct = ((step + 1) / steps.length) * 100;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1500);
  };

  const handleCopyInternal = async (opts?: { closeAfter?: boolean }) => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(outputText);
      onCopied(periodId);

      setIsCopySuccess(true);
      setIsCopyGlow(true);
      if (copySuccessTimeoutRef.current) window.clearTimeout(copySuccessTimeoutRef.current);
      if (copyGlowTimeoutRef.current) window.clearTimeout(copyGlowTimeoutRef.current);
      if (copyCloseTimeoutRef.current) window.clearTimeout(copyCloseTimeoutRef.current);
      copyGlowTimeoutRef.current = window.setTimeout(() => setIsCopyGlow(false), 550);
      copySuccessTimeoutRef.current = window.setTimeout(() => setIsCopySuccess(false), 2000);
      if (opts?.closeAfter) {
        // 成功の余韻を少し見せてから閉じる
        copyCloseTimeoutRef.current = window.setTimeout(() => onClose(), 650);
      }
    } catch (e) {
      console.error('[ReportWizard] Failed to copy:', e);
      showToast('コピーに失敗しました（ブラウザ権限を確認してください）');
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopy = async () => handleCopyInternal({ closeAfter: false });
  const handleCopyAndClose = async () => handleCopyInternal({ closeAfter: true });

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* backdrop */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: theme === 'modern' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)' }}
          onClick={onClose}
        />

        <motion.div
          className="relative w-full max-w-6xl h-[90vh] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            backgroundColor: theme === 'modern' ? 'rgba(30, 41, 59, 0.85)' : colors.card,
            backdropFilter: theme === 'modern' ? 'blur(14px)' : 'none',
            border: theme === 'modern' ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${colors.border}`,
          }}
        >
          {/* header */}
          <div className="p-8 border-b" style={{ borderColor: theme === 'modern' ? 'rgba(255,255,255,0.10)' : colors.border }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                  監査報告書ウィザード
                </h2>
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  対象期間: {format(periodStart, 'yyyy/MM/dd')}〜{format(periodEnd, 'yyyy/MM/dd')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="p-2 rounded-lg transition-colors"
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.cardHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ×
              </button>
            </div>

            {/* progress bar */}
            <div className="mt-4">
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme === 'modern' ? 'rgba(255,255,255,0.08)' : colors.border }}>
                <motion.div
                  className="h-full"
                  initial={false}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  style={{ backgroundColor: colors.accent }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: colors.textTertiary }}>
                Step {step + 1} / {steps.length}
              </p>
            </div>
          </div>

          {/* body */}
          <div className="p-8 flex-1 overflow-y-auto">
            <div
              className={`grid grid-cols-1 gap-8 ${isFinalStep ? 'md:grid-cols-[0.80fr_1.20fr]' : 'md:grid-cols-[1.05fr_0.95fr]'}`}
            >
              {/* 左：入力（ステップごと） */}
              <div className="min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={steps[step]?.id ?? `step-${step}`}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    {steps[step]?.render()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 右：リアルタイムプレビュー（成果物） */}
              <div className="min-w-0 md:sticky md:top-6 self-start">
                <div
                  className="rounded-2xl border shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
                  style={{
                    borderColor: isFinalStep
                      ? (theme === 'modern' ? 'rgba(34, 197, 94, 0.30)' : colors.border)
                      : (theme === 'modern' ? 'rgba(255,255,255,0.12)' : colors.border),
                    backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.65)' : colors.backgroundSecondary,
                  }}
                >
                  <div className="px-4 py-3 border-b flex items-center justify-between gap-3"
                    style={{ borderColor: theme === 'modern' ? 'rgba(255,255,255,0.10)' : colors.border }}
                  >
                    <div>
                      <p className="text-xs" style={{ color: colors.textSecondary }}>
                        リアルタイムプレビュー
                      </p>
                      <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                        生成される報告書
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      onClick={handleCopy}
                      disabled={isCopying}
                      tabIndex={-1}
                      className="px-3 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      animate={{
                        scale: isCopyGlow ? 1.06 : 1,
                        backgroundColor: isCopyGlow ? 'rgba(34, 197, 94, 0.92)' : colors.accent,
                        boxShadow: isCopyGlow ? '0 0 18px rgba(34, 197, 94, 0.35)' : 'none',
                      }}
                      transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                      style={{ color: colors.textInverse }}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isCopying ? 'copying' : isCopySuccess ? 'success' : 'idle'}
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                          className="inline-block"
                        >
                          {isCopying ? 'コピー中...' : isCopySuccess ? 'コピー完了！ ✅' : 'コピー'}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                  </div>

                  <div className="p-4">
                    <div
                      className="rounded-xl border px-4 py-3 overflow-auto"
                      style={{
                        borderColor: theme === 'modern' ? 'rgba(255,255,255,0.10)' : colors.border,
                        backgroundColor: theme === 'modern' ? 'rgba(2, 6, 23, 0.45)' : colors.card,
                        color: colors.textPrimary,
                        maxHeight: isFinalStep ? '74vh' : '68vh',
                      }}
                    >
                      <pre className={`${isFinalStep ? 'text-sm' : 'text-xs'} font-mono whitespace-pre-wrap leading-relaxed`}>{outputText}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="p-8 border-t flex items-center justify-between gap-3" style={{ borderColor: theme === 'modern' ? 'rgba(255,255,255,0.10)' : colors.border }}>
            <div className="flex items-center gap-2">
              {step > 0 ? (
                <button
                  type="button"
                  aria-label="前へ"
                  onClick={() => setStep((s: number) => Math.max(0, s - 1))}
                  className="p-2 rounded-lg transition-colors"
                  style={{ backgroundColor: colors.buttonDisabled, color: colors.textInverse }}
                >
                  <ChevronDown size={18} className="rotate-90" />
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isFinalStep ? (
                <button
                  type="button"
                  aria-label="次へ"
                  onClick={() => setStep((s: number) => Math.min(steps.length - 1, s + 1))}
                  ref={primaryFooterButtonRef}
                  className="p-2 rounded-lg transition-colors"
                  style={{ backgroundColor: colors.accent, color: colors.textInverse }}
                >
                  <ChevronDown size={18} className="-rotate-90" />
                </button>
              ) : (
                <motion.button
                  type="button"
                  onClick={handleCopyAndClose}
                  disabled={isCopying}
                  ref={primaryFooterButtonRef}
                  className="px-5 py-3 rounded-xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  animate={{
                    scale: isCopyGlow ? 1.02 : 1,
                    backgroundColor: isCopyGlow ? 'rgba(34, 197, 94, 0.92)' : colors.accent,
                    boxShadow: isCopyGlow ? '0 0 22px rgba(34, 197, 94, 0.35)' : '0 16px 40px rgba(0,0,0,0.45)',
                  }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                  style={{ color: colors.textInverse, minWidth: 220 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={isCopying ? 'copying' : isCopySuccess ? 'success' : 'idle-final'}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                      className="inline-block"
                    >
                      {isCopying ? 'コピー中...' : isCopySuccess ? 'コピー完了！ ✅' : '確定して終了'}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              )}
            </div>
          </div>

          {toast && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg"
              style={{ backgroundColor: theme === 'modern' ? 'rgba(239,68,68,0.90)' : '#ef4444', color: '#fff' }}
            >
              {toast}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


