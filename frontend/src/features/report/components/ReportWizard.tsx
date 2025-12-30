import { useEffect, useMemo, useRef, useState } from 'react';
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
import type { ReminderCountsBySubject } from './steps/ReportStep1';
import { useAccentMode } from '../../../contexts/AccentModeContext';
import { useTrophySystemContext } from '../../../contexts/TrophySystemContext';

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
  const { setAccentMode } = useAccentMode();
  const { trophies, unlockTrophy } = useTrophySystemContext();

  const periodId = useMemo(
    () => `${format(periodStart, 'yyyy-MM-dd')}__${format(periodEnd, 'yyyy-MM-dd')}`,
    [periodStart, periodEnd]
  );

  // Step1..Step4 を 0..3 で管理（Welcomeは本体の外に分離）
  const [stepIndex, setStepIndex] = useState(0); // 0..3（表示は+1）
  const [toast, setToast] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const [finalDraftText, setFinalDraftText] = useState<string>('');
  const [isFinalDraftDirty, setIsFinalDraftDirty] = useState(false);

  const copySuccessTimeoutRef = useRef<number | null>(null);
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
    const order = subjectsWithColors.filter((s) => s.visible !== false).map((s) => s.name);
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

  const IND1 = '　';
  const IND2 = '　　';

  const bulletize = (text: string, indent: string): string => {
    const trimmed = (text || '').trim();
    if (!trimmed) return `${indent}・（未入力）`;
    const lines = trimmed.split(/\r?\n/);
    return [ `${indent}・${lines[0]}`, ...lines.slice(1).map((l) => `${indent}　${l}`) ].join('\n');
  };

  const normalizeTodoTitle = (raw: string): string => {
    let s = (raw || '').trim();
    // 末尾の枝番を落とす（例: _復習12回目 / (12) など）
    const suffixRe = /(_復習\d+回目|復習\d+回目|\(\d+\)|（\d+）|_第\d+回|第\d+回)$/;
    while (suffixRe.test(s)) s = s.replace(suffixRe, '');
    s = s.replace(/[_\s]+$/g, '');
    s = s.replace(/_/g, ''); // 「成果連結_復習1回目」→「成果連結」
    s = s.replace(/\s{2,}/g, ' ').trim();
    return s || '（無題）';
  };

  const reminderCounts = useMemo(() => {
    const orderedSubjects = subjectsWithColors.filter((s) => s.visible !== false).map((s) => s.name);
    const countMap = new Map<string, number>();
    const getCompletedDateKey = (t: Todo): string => format(parseISO(t.updated_at || t.created_at), 'yyyy-MM-dd');

    let total = 0;
    for (const t of todos) {
      if (!t.completed) continue;
      const key = getCompletedDateKey(t);
      if (key < periodStartKey || key > periodEndKey) continue;
      const subject = t.subject?.trim() || '未分類';
      total += 1;
      countMap.set(subject, (countMap.get(subject) ?? 0) + 1);
    }

    const countsBySubject: ReminderCountsBySubject = [];
    for (const s of orderedSubjects) {
      const c = countMap.get(s) ?? 0;
      if (c > 0) countsBySubject.push({ subject: s, count: c });
      countMap.delete(s);
    }
    Array.from(countMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
      .forEach(([subject, c]) => {
        if (c > 0) countsBySubject.push({ subject, count: c });
      });

    return { total, countsBySubject };
  }, [todos, subjectsWithColors, periodStartKey, periodEndKey]);

  const performedTodosOutputText = useMemo(() => {
    const orderedSubjects = subjectsWithColors.filter((s) => s.visible !== false).map((s) => s.name);
    const setMap = new Map<string, Set<string>>();
    const getCompletedDateKey = (t: Todo): string => format(parseISO(t.updated_at || t.created_at), 'yyyy-MM-dd');

    for (const t of todos) {
      if (!t.completed) continue;
      const key = getCompletedDateKey(t);
      if (key < periodStartKey || key > periodEndKey) continue;
      const subject = t.subject?.trim() || '未分類';
      const base = normalizeTodoTitle(t.title);
      if (!setMap.has(subject)) setMap.set(subject, new Set());
      setMap.get(subject)!.add(base);
    }

    const subjects = [
      ...orderedSubjects,
      ...Array.from(setMap.keys())
        .filter((s) => !orderedSubjects.includes(s))
        .sort((a, b) => a.localeCompare(b, 'ja')),
    ];

    const chunks: string[] = [];
    for (const subject of subjects) {
      const titles = Array.from(setMap.get(subject) ?? [])
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'ja'));
      if (titles.length === 0) continue; // 0件科目は非表示
      chunks.push(`${IND1}（${subject}）`);
      chunks.push(titles.map((t) => `${IND2}・${t}`).join('\n'));
      chunks.push('');
    }

    if (chunks.length === 0) return `${IND1}（該当期間に完了したリマインダはありません）`;
    return chunks.join('\n').trimEnd();
  }, [todos, subjectsWithColors, periodStartKey, periodEndKey]);

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
      performedTodosOutputText,
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
  }, [performedTodosOutputText, scoresText, lastWeekTotalHours, reportData]);

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
            reminderTotalCount={reminderCounts.total}
            reminderCountsBySubject={reminderCounts.countsBySubject}
            subjectsWithColors={subjectsWithColors}
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
    reminderCounts.total,
    reminderCounts.countsBySubject,
    periodStartKey,
    periodEndKey,
    lastWeekHoursDebug.matched,
  ]);

  const STEP_COUNT = steps.length;
  const isFinalStep = stepIndex === STEP_COUNT - 1;

  useEffect(() => {
    // 最終ステップは Enter 一発で確定できるよう、主要ボタンにフォーカス
    if (isFinalStep) window.setTimeout(() => primaryFooterButtonRef.current?.focus(), 0);
  }, [isFinalStep]);

  useEffect(() => {
    // 表示中は報告モードに固定（閉じたら通常へ戻す）
    setAccentMode('report');
    return () => setAccentMode('normal');
  }, [setAccentMode]);

  // Step4（最終確認）に入ったら、自動生成文をドラフトに流し込む（未編集のときだけ追従）
  useEffect(() => {
    if (!isFinalStep) return;
    if (isFinalDraftDirty) return;
    setFinalDraftText(outputText);
  }, [isFinalStep, isFinalDraftDirty, outputText]);

  // 表示上は Step 1/4 〜 Step 4/4（内部は0..3）
  const displayStep = stepIndex + 1;
  const progressPct = STEP_COUNT <= 1 ? 100 : (stepIndex / (STEP_COUNT - 1)) * 100;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1500);
  };

  /**
   * 週次報告書生成完了時のトロフィー判定ロジック
   * - 統計データに基づいて条件を満たすトロフィーを解放
   */
  const checkWeeklyReportTrophies = useMemo(() => {
    // ストリーク計算：期間内の学習日数を計算（1週間で7日間すべてに学習記録があるか）
    const studyDays = new Set<string>();
    for (const p of progressList) {
      const key = format(parseISO(p.created_at), 'yyyy-MM-dd');
      if (key >= periodStartKey && key <= periodEndKey) {
        studyDays.add(key);
      }
    }
    const perfectStreak = studyDays.size >= 7; // 7日間すべてに学習記録がある

    // 各トロフィーの判定
    const trophyById = new Map(trophies.map((t) => [t.id, t]));
    const unlockedIds: string[] = [];

    // 1. 初回報告（weekly_report_first）
    const firstReportTrophy = trophyById.get('weekly_report_first');
    if (firstReportTrophy && !firstReportTrophy.unlockedAt) {
      unlockedIds.push('weekly_report_first');
    }

    // 2. 70時間突破（weekly_hours_70）
    const hours70Trophy = trophyById.get('weekly_hours_70');
    if (hours70Trophy && !hours70Trophy.unlockedAt && lastWeekTotalHours >= 70) {
      unlockedIds.push('weekly_hours_70');
    }

    // 3. 完璧ストリーク（weekly_perfect_streak）
    const perfectStreakTrophy = trophyById.get('weekly_perfect_streak');
    if (perfectStreakTrophy && !perfectStreakTrophy.unlockedAt && perfectStreak) {
      unlockedIds.push('weekly_perfect_streak');
    }

    return unlockedIds;
  }, [trophies, progressList, periodStartKey, periodEndKey, lastWeekTotalHours]);

  const handleCopyInternal = async (opts?: { closeAfter?: boolean }) => {
    try {
      setIsCopying(true);
      const textToCopy = isFinalStep ? finalDraftText : outputText;
      await navigator.clipboard.writeText(textToCopy);
      onCopied(periodId);

      // 週次報告書生成完了時のトロフィー判定・解放
      // 報告書生成完了とほぼ同時にトロフィーが出るように、コピー成功直後に実行
      const trophyIdsToUnlock = checkWeeklyReportTrophies;
      for (const id of trophyIdsToUnlock) {
        unlockTrophy(id);
      }

      setIsCopySuccess(true);
      if (copySuccessTimeoutRef.current) window.clearTimeout(copySuccessTimeoutRef.current);
      if (copyCloseTimeoutRef.current) window.clearTimeout(copyCloseTimeoutRef.current);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop（静止） */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: theme === 'modern' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-6xl h-[90vh] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
                <h2 className="text-lg font-extrabold" style={{ color: '#FFB800' }}>
                  財務報告
                </h2>
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  対象期間: {format(periodStart, 'yyyy/MM/dd')}〜{format(periodEnd, 'yyyy/MM/dd')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="p-3 rounded-xl transition-colors"
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.cardHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            {/* progress bar */}
            <div className="mt-4">
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme === 'modern' ? 'rgba(255,255,255,0.08)' : colors.border }}>
                <div className="h-full" style={{ width: `${progressPct}%`, backgroundColor: '#FFB800' }} />
              </div>
              <p className="text-xs mt-2" style={{ color: colors.textTertiary }}>
                Step {displayStep} / {STEP_COUNT}
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
                {steps[stepIndex]?.render()}
              </div>

              {/* 右：リアルタイムプレビュー（成果物） */}
              <div className="min-w-0 md:sticky md:top-6 self-start">
                <div>
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
                            <button
                              type="button"
                              onClick={handleCopy}
                              disabled={isCopying}
                              tabIndex={-1}
                              className="px-3 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: '#FFB800', color: '#111827' }}
                            >
                              {isCopying ? 'コピー中...' : isCopySuccess ? 'コピー完了！' : 'コピー'}
                            </button>
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
                              {isFinalStep ? (
                                <textarea
                                  value={finalDraftText}
                                  onChange={(e) => {
                                    setFinalDraftText(e.target.value);
                                    setIsFinalDraftDirty(true);
                                  }}
                                  className="w-full h-full min-h-[64vh] resize-none bg-transparent outline-none font-mono text-sm leading-relaxed rounded-lg border-2 px-3 py-2"
                                  style={{
                                    borderColor: theme === 'modern' ? 'rgba(56, 189, 248, 0.35)' : colors.accent,
                                    color: colors.textPrimary,
                                    lineBreak: 'strict',
                                    wordBreak: 'break-word',
                                  }}
                                />
                              ) : (
                                <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed" style={{ lineBreak: 'strict', wordBreak: 'break-word' }}>
                                  {outputText}
                                </pre>
                              )}
                            </div>
                          </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="p-8 border-t flex items-center justify-between gap-3" style={{ borderColor: theme === 'modern' ? 'rgba(255,255,255,0.10)' : colors.border }}>
            <div className="flex items-center gap-2">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  aria-label="前へ"
                  onClick={() => setStepIndex((s: number) => Math.max(0, s - 1))}
                  className="p-3 rounded-xl transition-colors"
                  style={{ backgroundColor: colors.buttonDisabled, color: colors.textInverse }}
                >
                  <ChevronDown size={22} className="rotate-90" />
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
                  onClick={() => setStepIndex((s: number) => Math.min(STEP_COUNT - 1, s + 1))}
                  ref={primaryFooterButtonRef}
                  className="p-3 rounded-xl transition-colors"
                  style={{ backgroundColor: '#FFB800', color: '#111827' }}
                >
                  <ChevronDown size={22} className="-rotate-90" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyAndClose}
                  disabled={isCopying}
                  ref={primaryFooterButtonRef}
                  className="px-6 py-4 rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    color: '#111827',
                    minWidth: 220,
                    backgroundColor: '#FFB800',
                    boxShadow: '0 18px 55px rgba(0,0,0,0.55)',
                  }}
                >
                  {isCopying ? 'コピー中...' : isCopySuccess ? 'コピー完了！' : '確定して終了'}
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
      </div>
    </div>
  );
}


