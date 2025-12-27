import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import type { StudyProgress, Subject, Todo } from '../../../api/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';

type ScoreRow = {
  name: string;
  score: string; // 空文字を許容
  fullScore: string; // 空文字を許容
};

export type ReportData = {
  reflection: string;
  scores: ScoreRow[];
  issues: string;
  solutions: string;
  nextWeekPlan: string;
  questions: string;
};

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

  const [step, setStep] = useState(0); // 0..2
  const [toast, setToast] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const [isCopyGlow, setIsCopyGlow] = useState(false);

  const copySuccessTimeoutRef = useRef<number | null>(null);
  const copyGlowTimeoutRef = useRef<number | null>(null);

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

  const todoListText = useMemo(() => {
    if (completedTodosBySubject.length === 0) return '（該当期間に完了したリマインダはありません）';
    return completedTodosBySubject
      .map(([subject, items]) => {
        const lines = items.map((t) => `・${t}`).join('\n');
        return `【${subject}】\n${lines}`;
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
    const rows = reportData.scores
      .map((r) => ({
        name: r.name.trim(),
        score: r.score.trim(),
        fullScore: r.fullScore.trim(),
      }))
      .filter((r) => r.name || r.score || r.fullScore);
    if (rows.length === 0) return '（未入力）';

    const labels = rows.map((r) => r.name || '（答練名未入力）');
    // 目安: 全角15文字分（=30カラム）を最低幅として、最大の答練名に合わせて拡張
    const baseWidth = 30;
    const targetWidth = Math.max(baseWidth, ...labels.map(getDisplayWidth));

    return rows
      .map((r, idx) => {
        const label = labels[idx];
        const pad = ' '.repeat(Math.max(0, targetWidth - getDisplayWidth(label)));
        const s = r.score || '-';
        const f = r.fullScore || '-';
        // コロン位置を揃える（プレビューはfont-mono）
        return `・${label}${pad}： ${s}/${f}点`;
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
      '（勉強時間）',
      `・${lastWeekTotalHours.toFixed(1)}時間`,
      '（振り返り）',
      `・${reportData.reflection || '（未入力）'}`,
      '',
      '■現状課題と課題に対する解決策（アクションプラン）',
      '（課題）',
      reportData.issues || '（未入力）',
      '（解決策）',
      reportData.solutions || '（未入力）',
      '',
      '■今週実施すること',
      reportData.nextWeekPlan || '（未入力）',
      '',
      '■相談したいこと',
      reportData.questions || '（未入力）',
    ].join('\n');
  }, [todoListText, scoresText, lastWeekTotalHours, reportData]);

  const progressPct = ((step + 1) / 3) * 100;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1500);
  };

  const handleCopy = async () => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(outputText);
      onCopied(periodId);

      setIsCopySuccess(true);
      setIsCopyGlow(true);
      if (copySuccessTimeoutRef.current) window.clearTimeout(copySuccessTimeoutRef.current);
      if (copyGlowTimeoutRef.current) window.clearTimeout(copyGlowTimeoutRef.current);
      copyGlowTimeoutRef.current = window.setTimeout(() => setIsCopyGlow(false), 550);
      copySuccessTimeoutRef.current = window.setTimeout(() => setIsCopySuccess(false), 2000);
    } catch (e) {
      console.error('[ReportWizard] Failed to copy:', e);
      showToast('コピーに失敗しました（ブラウザ権限を確認してください）');
    } finally {
      setIsCopying(false);
    }
  };

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
                className="px-3 py-2 rounded-lg transition-colors"
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.cardHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                閉じる
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
                Step {step + 1} / 3
              </p>
            </div>
          </div>

          {/* body */}
          <div className="p-8 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] gap-8">
              {/* 左：入力（ステップごと） */}
              <div className="min-w-0">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <h3 className="text-base font-semibold mb-3" style={{ color: colors.textPrimary }}>
                        Step 1: 実績（自動抽出）
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                        <div className="rounded-xl p-4" style={{ backgroundColor: colors.backgroundSecondary }}>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            先週の総勉強時間
                          </p>
                          <p className="text-3xl font-bold mt-1" style={{ color: colors.textPrimary }}>
                            {lastWeekTotalHours.toFixed(1)} 時間
                          </p>
                        </div>
                        <div className="rounded-xl p-4" style={{ backgroundColor: colors.backgroundSecondary }}>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            完了したリマインダ（科目別）
                          </p>
                          <pre
                            className="text-xs mt-2 whitespace-pre-wrap max-h-28 overflow-auto"
                            style={{ color: colors.textPrimary }}
                          >
                            {todoListText}
                          </pre>
                        </div>
                      </div>

                      {/* Debug（開発用）: 集計対象期間 */}
                      <div className="mt-2 text-[10px] text-right" style={{ color: colors.textTertiary }}>
                        {periodStartKey}〜{periodEndKey} / matched: {lastWeekHoursDebug.matched}
                      </div>

                      <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                        先週の振り返り
                      </label>
                      <textarea
                        value={reportData.reflection}
                        onChange={(e) => setReportData((prev) => ({ ...prev, reflection: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab' && !e.shiftKey) {
                            e.preventDefault();
                            focusPrimaryFooterButton();
                          }
                        }}
                        rows={8}
                        className="w-full max-w-2xl px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                        style={{
                          borderColor: colors.border,
                          backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                          color: colors.textPrimary,
                        }}
                      />
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <h3 className="text-base font-semibold mb-3" style={{ color: colors.textPrimary }}>
                        Step 2: 答練点数
                      </h3>

                      <div className="space-y-3">
                        {reportData.scores.map((row, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl p-3 border"
                            style={{ borderColor: colors.border, backgroundColor: colors.backgroundSecondary }}
                          >
                            <div className="md:col-span-2">
                              <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>
                                答練名
                              </label>
                              <input
                                value={row.name}
                                onChange={(e) =>
                                  setReportData((prev) => ({
                                    ...prev,
                                    scores: prev.scores.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                                  }))
                                }
                                className="w-full max-w-2xl px-3 py-2 rounded-lg border focus:outline-none"
                                style={{
                                  borderColor: colors.border,
                                  backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                                  color: colors.textPrimary,
                                }}
                                placeholder="例：財務会計レギュラー答練第1回"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>
                                得点
                              </label>
                              <input
                                value={row.score}
                                onChange={(e) =>
                                  setReportData((prev) => ({
                                    ...prev,
                                    scores: prev.scores.map((r, i) => (i === idx ? { ...r, score: e.target.value } : r)),
                                  }))
                                }
                                inputMode="numeric"
                                className="w-full max-w-[14rem] px-3 py-2 rounded-lg border focus:outline-none"
                                style={{
                                  borderColor: colors.border,
                                  backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                                  color: colors.textPrimary,
                                }}
                                placeholder="得点（例: 80）"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>
                                満点
                              </label>
                              <input
                                value={row.fullScore}
                                onChange={(e) =>
                                  setReportData((prev) => ({
                                    ...prev,
                                    scores: prev.scores.map((r, i) => (i === idx ? { ...r, fullScore: e.target.value } : r)),
                                  }))
                                }
                                onKeyDown={(e) => {
                                  // Step2の「最後の入力（最終行の満点）」→ Tabで「次へ」へ
                                  if (idx === reportData.scores.length - 1 && e.key === 'Tab' && !e.shiftKey) {
                                    e.preventDefault();
                                    focusPrimaryFooterButton();
                                  }
                                }}
                                inputMode="numeric"
                                className="w-full max-w-[14rem] px-3 py-2 rounded-lg border focus:outline-none"
                                style={{
                                  borderColor: colors.border,
                                  backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                                  color: colors.textPrimary,
                                }}
                                placeholder="満点（例: 100）"
                              />
                            </div>
                            <div className="md:col-span-1 flex items-end">
                              <button
                                type="button"
                                aria-label="行を削除"
                                onClick={() => {
                                  setReportData((prev) => {
                                    const next = prev.scores.filter((_, i) => i !== idx);
                                    return { ...prev, scores: next.length ? next : [{ name: '', score: '', fullScore: '' }] };
                                  });
                                }}
                                className="w-full px-3 py-2 rounded-lg transition-colors"
                                style={{ backgroundColor: colors.buttonDisabled, color: colors.textInverse }}
                              >
                                削除
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setReportData((prev) => ({ ...prev, scores: [...prev.scores, { name: '', score: '', fullScore: '' }] }))
                          }
                          className="px-4 py-2 rounded-lg font-semibold transition-colors"
                          style={{ backgroundColor: colors.accent, color: colors.textInverse }}
                        >
                          ＋答練を追加
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <h3 className="text-base font-semibold mb-3" style={{ color: colors.textPrimary }}>
                        Step 3: 課題とアクション
                      </h3>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                            現状課題と解決策
                          </label>
                          <textarea
                            value={reportData.issues}
                            onChange={(e) => setReportData((prev) => ({ ...prev, issues: e.target.value }))}
                            rows={3}
                            className="w-full max-w-2xl px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 mb-2"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                              color: colors.textPrimary,
                            }}
                            placeholder="（課題）"
                          />
                          <textarea
                            value={reportData.solutions}
                            onChange={(e) => setReportData((prev) => ({ ...prev, solutions: e.target.value }))}
                            rows={3}
                            className="w-full max-w-2xl px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                              color: colors.textPrimary,
                            }}
                            placeholder="（解決策）"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                            今週実施すること
                          </label>
                          <textarea
                            value={reportData.nextWeekPlan}
                            onChange={(e) => setReportData((prev) => ({ ...prev, nextWeekPlan: e.target.value }))}
                            rows={3}
                            className="w-full max-w-2xl px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                              color: colors.textPrimary,
                            }}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                            相談したいこと
                          </label>
                          <textarea
                            value={reportData.questions}
                            onChange={(e) => setReportData((prev) => ({ ...prev, questions: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Tab' && !e.shiftKey) {
                                e.preventDefault();
                                focusPrimaryFooterButton();
                              }
                            }}
                            rows={3}
                            className="w-full max-w-2xl px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                              color: colors.textPrimary,
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 右：リアルタイムプレビュー（成果物） */}
              <div className="min-w-0 md:sticky md:top-6 self-start">
                <div
                  className="rounded-2xl border shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
                  style={{
                    borderColor: theme === 'modern' ? 'rgba(255,255,255,0.12)' : colors.border,
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
                        maxHeight: '68vh',
                      }}
                    >
                      <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">{outputText}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="p-8 border-t flex items-center justify-between gap-3" style={{ borderColor: theme === 'modern' ? 'rgba(255,255,255,0.10)' : colors.border }}>
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.buttonDisabled, color: colors.textInverse }}
            >
              戻る
            </button>

            <div className="flex items-center gap-2">
              {step < 2 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(2, s + 1))}
                  ref={primaryFooterButtonRef}
                  className="px-4 py-2 rounded-lg font-semibold transition-colors"
                  style={{ backgroundColor: colors.accent, color: colors.textInverse }}
                >
                  次へ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  ref={primaryFooterButtonRef}
                  className="px-4 py-2 rounded-lg font-semibold transition-colors"
                  style={{ backgroundColor: colors.accent, color: colors.textInverse }}
                >
                  閉じる
                </button>
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


