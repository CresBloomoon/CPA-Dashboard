import type { Theme } from '../../../../contexts/ThemeContext';
import { getThemeColors } from '../../../../styles/theme';
import type { ReportData, UpdateReportData } from '../../types/reportWizard';

type ThemeColors = ReturnType<typeof getThemeColors>;

export type SubjectHoursRow = { subject: string; hours: number };

export type ReminderCountsBySubject = Array<{ subject: string; count: number }>;

type Props = {
  theme: Theme;
  colors: ThemeColors;
  reportData: ReportData;
  updateData: UpdateReportData;
  lastWeekTotalHours: number;
  subjectHours: SubjectHoursRow[];
  reminderTotalCount: number;
  reminderCountsBySubject: ReminderCountsBySubject;
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
  reminderTotalCount,
  reminderCountsBySubject,
  periodStartKey,
  periodEndKey,
  matchedCount,
  onTabToNext,
}: Props) {
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
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            先週の完了リマインダ総数
          </p>
          <p className="text-3xl font-bold mt-1" style={{ color: colors.textPrimary }}>
            {reminderTotalCount} 件
          </p>
          <div className="mt-3">
            <p className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
              科目別
            </p>
            {reminderCountsBySubject.length === 0 ? (
              <p className="text-xs" style={{ color: colors.textTertiary }}>
                （該当期間に完了したリマインダはありません）
              </p>
            ) : (
              <div className="space-y-1">
                {reminderCountsBySubject.map((row) => (
                  <div key={row.subject} className="flex items-center justify-between gap-3">
                    <span className="text-xs truncate" style={{ color: colors.textPrimary }}>
                      {row.subject}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: colors.textPrimary }}>
                      {row.count}件
                    </span>
                  </div>
                ))}
              </div>
            )}
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


