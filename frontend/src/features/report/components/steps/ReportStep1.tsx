import type { Theme } from '../../../../contexts/ThemeContext';
import { getThemeColors } from '../../../../styles/theme';
import type { ReportData, UpdateReportData } from '../../types/reportWizard';
import type { ReactNode } from 'react';
import { AnimatedCounter } from '../effects/AnimatedCounter';
import type { Subject } from '../../../../api/types';
import { getSubjectColor as resolveSubjectColor } from '../../../../utils/todoHelpers';

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
  subjectsWithColors: Subject[];
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
  subjectsWithColors,
  periodStartKey,
  periodEndKey,
  matchedCount,
  onTabToNext,
}: Props) {
  const getSubjectAccent = (subject: string): string => {
    // 設定画面（subjectsWithColors）の color と完全同期
    const resolved = resolveSubjectColor(subject, subjectsWithColors, colors.accent);
    return resolved || colors.accent;
  };

  const maxHours = Math.max(0.0001, ...subjectHours.map((r) => r.hours));
  const maxCount = Math.max(0.0001, ...reminderCountsBySubject.map((r) => r.count));

  const GoldCard = ({ children }: { children: ReactNode }) => (
    <div
      className="rounded-2xl p-[1.5px]"
      style={{
        backgroundColor: '#FFB800',
        boxShadow: '0 18px 55px rgba(0,0,0,0.25)',
      }}
    >
      <div className="rounded-2xl p-4" style={{ backgroundColor: colors.backgroundSecondary }}>
        {children}
      </div>
    </div>
  );

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: colors.textPrimary }}>
        Step 1: 実績（自動抽出）
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <GoldCard>
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            先週の総勉強時間
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <AnimatedCounter value={lastWeekTotalHours} decimals={1} className="text-4xl md:text-5xl font-black tracking-tight" />
            <span className="text-2xl font-semibold text-gray-400">
              時間
            </span>
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
              <div className="space-y-2">
                {subjectHours.map((row) => {
                  const c = getSubjectAccent(row.subject);
                  const pct = Math.max(2, Math.round((row.hours / maxHours) * 100));
                  return (
                    <div key={row.subject} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs truncate font-semibold" style={{ color: c }}>
                          {row.subject}
                        </span>
                        <span className="text-xs tabular-nums" style={{ color: colors.textPrimary }}>
                          {row.hours.toFixed(1)}h
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme === 'modern' ? 'rgba(255,255,255,0.08)' : colors.border }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GoldCard>

        <GoldCard>
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            先週の完了リマインダ総数
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <AnimatedCounter value={reminderTotalCount} decimals={0} className="text-4xl md:text-5xl font-black tracking-tight" />
            <span className="text-2xl font-semibold text-gray-400">
              件
            </span>
          </p>
          <div className="mt-3">
            <p className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
              科目別
            </p>
            {reminderTotalCount === 0 ? (
              <div className="space-y-2">
                {(subjectsWithColors.length ? subjectsWithColors : [{ id: -1, name: '（登録科目なし）', color: colors.textTertiary }]).map((s) => {
                  const c = s.color || colors.accent;
                  return (
                    <div key={s.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs truncate font-semibold" style={{ color: c }}>
                          {s.name}
                        </span>
                        <span className="text-xs tabular-nums" style={{ color: colors.textPrimary }}>
                          0件
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme === 'modern' ? 'rgba(255,255,255,0.08)' : colors.border }}>
                        <div className="h-full rounded-full" style={{ width: '0%', backgroundColor: c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : reminderCountsBySubject.length === 0 ? (
              <p className="text-xs" style={{ color: colors.textTertiary }}>
                （該当期間に完了したリマインダはありません）
              </p>
            ) : (
              <div className="space-y-2">
                {reminderCountsBySubject.map((row) => {
                  const c = getSubjectAccent(row.subject);
                  const pct = row.count === 0 ? 0 : Math.max(2, Math.round((row.count / maxCount) * 100));
                  return (
                    <div key={row.subject} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs truncate font-semibold" style={{ color: c }}>
                          {row.subject}
                        </span>
                        <span className="text-xs tabular-nums" style={{ color: colors.textPrimary }}>
                          {row.count}件
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme === 'modern' ? 'rgba(255,255,255,0.08)' : colors.border }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GoldCard>
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


