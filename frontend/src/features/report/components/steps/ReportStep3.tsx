import type { Theme } from '../../../../contexts/ThemeContext';
import { getThemeColors } from '../../../../styles/theme';
import type { ReportData, UpdateReportData } from '../../types/reportWizard';

type ThemeColors = ReturnType<typeof getThemeColors>;

type Props = {
  theme: Theme;
  colors: ThemeColors;
  reportData: ReportData;
  updateData: UpdateReportData;
  onTabToNext: () => void;
};

export function ReportStep3({ theme, colors, reportData, updateData, onTabToNext }: Props) {
  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: colors.textPrimary }}>
        Step 3: 課題とアクション
      </h3>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            現状課題と解決策
          </label>
          <div className="relative">
            <textarea
              value={reportData.issues}
              onChange={(e) => updateData({ issues: e.target.value })}
              rows={3}
              className="w-full max-w-2xl px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 mb-2"
              style={{
                borderColor: colors.border,
                backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.55)' : colors.card,
                color: colors.textPrimary,
              }}
              placeholder="（課題）"
            />
          </div>
          <div className="relative">
            <textarea
              value={reportData.solutions}
              onChange={(e) => updateData({ solutions: e.target.value })}
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            今週実施すること
          </label>
          <div className="relative">
            <textarea
              value={reportData.nextWeekPlan}
              onChange={(e) => updateData({ nextWeekPlan: e.target.value })}
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

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            相談したいこと
          </label>
          <div className="relative">
            <textarea
              value={reportData.questions}
              onChange={(e) => updateData({ questions: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                  e.preventDefault();
                  onTabToNext();
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
      </div>
    </div>
  );
}


