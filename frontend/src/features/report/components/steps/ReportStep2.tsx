import type { Theme } from '../../../../contexts/ThemeContext';
import { getThemeColors } from '../../../../styles/theme';
import type { ReportData, UpdateReportData } from '../../types/reportWizard';
import { Plus, Trash2 } from 'lucide-react';

type ThemeColors = ReturnType<typeof getThemeColors>;

type Props = {
  theme: Theme;
  colors: ThemeColors;
  reportData: ReportData;
  updateData: UpdateReportData;
  onTabToNext: () => void;
};

export function ReportStep2({ theme, colors, reportData, updateData, onTabToNext }: Props) {
  const setScores = (nextScores: ReportData['scores']) => updateData({ scores: nextScores });
  const addRow = () => setScores([...reportData.scores, { name: '', score: '', fullScore: '' }]);
  const removeRow = (idx: number) => {
    const next = reportData.scores.filter((_, i) => i !== idx);
    setScores(next.length ? next : [{ name: '', score: '', fullScore: '' }]);
  };

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: colors.textPrimary }}>
        Step 2: 答練点数
      </h3>

      <div className="space-y-3">
        {reportData.scores.map((row, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 md:grid-cols-5 gap-2 rounded-xl p-3 border"
            style={{ borderColor: colors.border, backgroundColor: colors.backgroundSecondary }}
          >
            <div className="md:col-span-2">
              <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>
                答練名
              </label>
              <div className="relative">
                <input
                  value={row.name}
                  onChange={(e) =>
                    setScores(reportData.scores.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
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
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>
                得点
              </label>
              <div className="relative">
                <input
                  value={row.score}
                  onChange={(e) =>
                    setScores(reportData.scores.map((r, i) => (i === idx ? { ...r, score: e.target.value } : r)))
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
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>
                満点
              </label>
              <div className="relative">
                <input
                  value={row.fullScore}
                  onChange={(e) =>
                    setScores(reportData.scores.map((r, i) => (i === idx ? { ...r, fullScore: e.target.value } : r)))
                  }
                  onKeyDown={(e) => {
                    if (idx === reportData.scores.length - 1 && e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      onTabToNext();
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
            </div>

            <div className="md:col-span-1 flex items-end justify-end">
              <button
                type="button"
                aria-label="行を削除"
                onClick={() => removeRow(idx)}
                className="p-1 text-red-500 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30 rounded-md"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={addRow}
          aria-label="答練を追加"
          className="p-2 rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2"
          style={{ backgroundColor: colors.accent, color: colors.textInverse }}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}


