import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isWithinInterval, parseISO } from 'date-fns';
import type { StudyProgress, Subject, Todo } from '../../../api/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';

type ScoreRow = {
  subject: string;
  calculation: string; // number入力でも空文字を許容したい
  theory: string;
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

  const [reportData, setReportData] = useState<ReportData>({
    reflection: '',
    scores: [{ subject: '', calculation: '', theory: '' }],
    issues: '',
    solutions: '',
    nextWeekPlan: '',
    questions: '',
  });

  const lastWeekTotalHours = useMemo(() => {
    return progressList
      .filter((p) => {
        const d = parseISO(p.created_at);
        return isWithinInterval(d, { start: periodStart, end: periodEnd });
      })
      .reduce((sum, p) => sum + p.study_hours, 0);
  }, [progressList, periodStart, periodEnd]);

  const completedTodosBySubject = useMemo(() => {
    const subjectOrder = subjectsWithColors.map((s) => s.name);
    const map = new Map<string, string[]>();

    const getCompletedDate = (t: Todo): Date => parseISO(t.updated_at || t.created_at);

    todos.forEach((t) => {
      if (!t.completed) return;
      const d = getCompletedDate(t);
      if (!isWithinInterval(d, { start: periodStart, end: periodEnd })) return;
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
  }, [todos, subjectsWithColors, periodStart, periodEnd]);

  const todoListText = useMemo(() => {
    if (completedTodosBySubject.length === 0) return '（該当期間に完了したリマインダはありません）';
    return completedTodosBySubject
      .map(([subject, items]) => {
        const lines = items.map((t) => `・${t}`).join('\n');
        return `【${subject}】\n${lines}`;
      })
      .join('\n\n');
  }, [completedTodosBySubject]);

  const scoresText = useMemo(() => {
    const rows = reportData.scores
      .map((r) => ({
        subject: r.subject.trim(),
        calculation: r.calculation.trim(),
        theory: r.theory.trim(),
      }))
      .filter((r) => r.subject || r.calculation || r.theory);
    if (rows.length === 0) return '（未入力）';
    return rows
      .map((r) => {
        const calc = r.calculation ? `${r.calculation}点` : '-';
        const theo = r.theory ? `${r.theory}点` : '-';
        return `【${r.subject || '（科目未入力）'}】計算:${calc} / 理論:${theo}`;
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
          className="relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden"
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
          <div className="px-6 py-5 border-b" style={{ borderColor: theme === 'modern' ? 'rgba(255,255,255,0.10)' : colors.border }}>
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
          <div className="px-6 py-5">
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

                  <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                    先週の振り返り
                  </label>
                  <textarea
                    value={reportData.reflection}
                    onChange={(e) => setReportData((prev) => ({ ...prev, reflection: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
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
                        <div className="md:col-span-1">
                          <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>
                            科目名
                          </label>
                          <input
                            value={row.subject}
                            onChange={(e) =>
                              setReportData((prev) => ({
                                ...prev,
                                scores: prev.scores.map((r, i) => (i === idx ? { ...r, subject: e.target.value } : r)),
                              }))
                            }
                            list="report-subjects"
                            className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                              color: colors.textPrimary,
                            }}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>
                            計算
                          </label>
                          <input
                            value={row.calculation}
                            onChange={(e) =>
                              setReportData((prev) => ({
                                ...prev,
                                scores: prev.scores.map((r, i) => (i === idx ? { ...r, calculation: e.target.value } : r)),
                              }))
                            }
                            inputMode="numeric"
                            className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                              color: colors.textPrimary,
                            }}
                            placeholder="例: 60"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>
                            理論
                          </label>
                          <input
                            value={row.theory}
                            onChange={(e) =>
                              setReportData((prev) => ({
                                ...prev,
                                scores: prev.scores.map((r, i) => (i === idx ? { ...r, theory: e.target.value } : r)),
                              }))
                            }
                            inputMode="numeric"
                            className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                              color: colors.textPrimary,
                            }}
                            placeholder="例: 55"
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              setReportData((prev) => {
                                const next = prev.scores.filter((_, i) => i !== idx);
                                return { ...prev, scores: next.length ? next : [{ subject: '', calculation: '', theory: '' }] };
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

                  <datalist id="report-subjects">
                    {subjectsWithColors.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setReportData((prev) => ({ ...prev, scores: [...prev.scores, { subject: '', calculation: '', theory: '' }] }))
                      }
                      className="px-4 py-2 rounded-lg font-semibold transition-colors"
                      style={{ backgroundColor: colors.accent, color: colors.textInverse }}
                    >
                      行を追加
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
                        className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 mb-2"
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
                        className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
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
                        className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
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
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                        style={{
                          borderColor: colors.border,
                          backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                          color: colors.textPrimary,
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                        生成プレビュー
                      </label>
                      <textarea
                        value={outputText}
                        readOnly
                        rows={10}
                        className="w-full px-4 py-3 rounded-xl border focus:outline-none"
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

          {/* footer */}
          <div className="px-6 py-5 border-t flex items-center justify-between gap-3" style={{ borderColor: theme === 'modern' ? 'rgba(255,255,255,0.10)' : colors.border }}>
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
                  className="px-4 py-2 rounded-lg font-semibold transition-colors"
                  style={{ backgroundColor: colors.accent, color: colors.textInverse }}
                >
                  次へ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={isCopying}
                  className="px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colors.accent, color: colors.textInverse }}
                >
                  {isCopying ? 'コピー中...' : 'クリップボードにコピー'}
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


