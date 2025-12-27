import { useMemo, useState } from 'react';
import type { Theme } from '../../../../contexts/ThemeContext';
import { getThemeColors } from '../../../../styles/theme';
import type { ReportData, UpdateReportData } from '../../types/reportWizard';

type ThemeColors = ReturnType<typeof getThemeColors>;

export type SubjectHoursRow = { subject: string; hours: number };

export type TodoGroup = { title: string; count: number; isKam: boolean };
export type TodoSubjectSummary = {
  subject: string;
  totalCount: number;
  kam: TodoGroup[];
  otherCount: number;
  allGroups: TodoGroup[];
};

type Props = {
  theme: Theme;
  colors: ThemeColors;
  reportData: ReportData;
  updateData: UpdateReportData;
  lastWeekTotalHours: number;
  subjectHours: SubjectHoursRow[];
  todoSummaryBySubject: TodoSubjectSummary[];
  periodStartKey: string;
  periodEndKey: string;
  matchedCount: number;
  onTabToNext: () => void;
};

export function ReportStep1({
  theme,
  colors,
  reportData,
  updateData,
  lastWeekTotalHours,
  subjectHours,
  todoSummaryBySubject,
  periodStartKey,
  periodEndKey,
  matchedCount,
  onTabToNext,
}: Props) {
  const [showAllTodos, setShowAllTodos] = useState(false); // default: 要約（KAMのみ）

  const totalTodoCount = useMemo(
    () => todoSummaryBySubject.reduce((acc, s) => acc + s.totalCount, 0),
    [todoSummaryBySubject]
  );

  return (
    <div>
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
          <div className="mt-3">
            <p className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
              科目別
            </p>
            {subjectHours.length === 0 ? (
              <p className="text-xs" style={{ color: colors.textTertiary }}>
                （該当データなし）
              </p>
            ) : (
              <div className="space-y-1">
                {subjectHours.map((row) => (
                  <div key={row.subject} className="flex items-center justify-between gap-3">
                    <span className="text-xs truncate" style={{ color: colors.textPrimary }}>
                      {row.subject}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: colors.textPrimary }}>
                      {row.hours.toFixed(1)}h
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: colors.backgroundSecondary }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                KAM（主要な検討事項）
              </p>
              <p className="text-[10px] mt-1" style={{ color: colors.textTertiary }}>
                {totalTodoCount > 0 ? `完了 ${totalTodoCount} 件（科目別）` : '（該当期間に完了したリマインダはありません）'}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowAllTodos(false)}
                className="px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
                style={{
                  backgroundColor: !showAllTodos ? colors.accent : 'transparent',
                  color: !showAllTodos ? colors.textInverse : colors.textSecondary,
                  border: `1px solid ${!showAllTodos ? 'transparent' : colors.border}`,
                }}
              >
                要約
              </button>
              <button
                type="button"
                onClick={() => setShowAllTodos(true)}
                className="px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
                style={{
                  backgroundColor: showAllTodos ? colors.accent : 'transparent',
                  color: showAllTodos ? colors.textInverse : colors.textSecondary,
                  border: `1px solid ${showAllTodos ? 'transparent' : colors.border}`,
                }}
              >
                詳細
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-56 overflow-auto pr-1">
            {todoSummaryBySubject.map((s) => (
              <div key={s.subject} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                    （{s.subject}）
                  </p>
                  <p className="text-[10px] tabular-nums" style={{ color: s.totalCount === 0 ? colors.textTertiary : colors.textSecondary }}>
                    {s.totalCount === 0 ? '0件' : `${s.totalCount}件`}
                  </p>
                </div>

                {s.totalCount === 0 ? (
                  <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                    （該当期間に完了したリマインダはありません）
                  </p>
                ) : showAllTodos ? (
                  <div className="mt-1 space-y-1">
                    {s.allGroups.map((g) => (
                      <div key={`${s.subject}:${g.title}`} className="flex items-center justify-between gap-2">
                        <span className="text-xs truncate" style={{ color: colors.textPrimary }}>
                          {g.title}
                        </span>
                        <span className="text-xs tabular-nums" style={{ color: colors.textSecondary }}>
                          {g.count}件
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 space-y-1">
                    {s.kam.map((g) => (
                      <div key={`${s.subject}:${g.title}`} className="flex items-center justify-between gap-2">
                        <span className="text-xs truncate" style={{ color: colors.textPrimary }}>
                          ★ {g.title}
                        </span>
                        <span className="text-xs tabular-nums" style={{ color: colors.textSecondary }}>
                          {g.count}件
                        </span>
                      </div>
                    ))}
                    {s.otherCount > 0 && (
                      <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        その他 {s.otherCount}件
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Debug（開発用）: 集計対象期間 */}
      <div className="mt-2 text-[10px] text-right" style={{ color: colors.textTertiary }}>
        {periodStartKey}〜{periodEndKey} / matched: {matchedCount}
      </div>

      <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
        先週の振り返り
      </label>
      <textarea
        value={reportData.reflection}
        onChange={(e) => updateData({ reflection: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            onTabToNext();
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
    </div>
  );
}


