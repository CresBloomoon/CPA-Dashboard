import type { Theme } from '../../../../contexts/ThemeContext';
import { getThemeColors } from '../../../../styles/theme';

type ThemeColors = ReturnType<typeof getThemeColors>;

type Props = {
  theme: Theme;
  colors: ThemeColors;
};

export function ReportStep0({ colors }: Props) {
  return (
    <div className="min-h-[52vh] flex items-center justify-center">
      <div className="w-full max-w-xl text-center px-6 py-10">
        <div
          className="mx-auto mb-6 w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.20)' }}
        >
          <span className="text-4xl leading-none">🎉</span>
        </div>

        <h3 className="text-2xl font-semibold" style={{ color: colors.textPrimary }}>
          今週一週間、本当にお疲れ様でした！
        </h3>
        <p className="text-sm mt-4 leading-relaxed" style={{ color: colors.textSecondary }}>
          あなたの積み上げた努力を、正確に報告書にまとめましょう。合格まであと少し、一緒に最後の一歩を頑張りましょう！
        </p>
      </div>
    </div>
  );
}


