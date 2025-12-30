import type { Theme } from '../../../../contexts/ThemeContext';
import { getThemeColors } from '../../../../styles/theme';
import type { ReportData, UpdateReportData } from '../../types/reportWizard';

type ThemeColors = ReturnType<typeof getThemeColors>;

type Props = {
  theme: Theme;
  colors: ThemeColors;
  reportData: ReportData;
  updateData: UpdateReportData;
};

export function ReportStep4({ colors }: Props) {
  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: colors.textPrimary }}>
        Step 4: 最終確認
      </h3>
      <div
        className="rounded-xl p-4 border"
        style={{
          borderColor: 'rgba(255,255,255,0.10)',
          backgroundColor: colors.backgroundSecondary,
        }}
      >
        <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
          お疲れ様でした！この内容で報告書を完成させますか？
        </p>
        <p className="text-xs mt-2" style={{ color: colors.textSecondary }}>
          右側のプレビューを最終チェックして、「確定して終了」を押してください。（EnterでもOK）
        </p>
      </div>
    </div>
  );
}


