import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';
import type { StudyProgress, Subject, Todo } from '../../../api/types';
import { FinancialReportHeaderNotice } from '../../report/components/FinancialReportHeaderNotice';

interface AppHeaderProps {
  onHomeClick: () => void;
  reportStartDay: number;
  progressList: StudyProgress[];
  todos: Todo[];
  subjectsWithColors: Subject[];
}

export default function AppHeader({ onHomeClick, reportStartDay, progressList, todos, subjectsWithColors }: AppHeaderProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <header className="mb-8">
      <div className="flex justify-between items-center">
        <div>
          {/* NOTE: buttonの入れ子はクリックが効かなくなる原因になるため、タイトル側と通知側を分離 */}
          <div className="text-left">
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={onHomeClick}
                className="hover:opacity-80 transition-opacity"
              >
                <h1 className="text-4xl font-bold" style={{ color: colors.textPrimary }}>
                  CPA Dashboard
                </h1>
              </button>

              <FinancialReportHeaderNotice
                reportStartDay={reportStartDay}
                progressList={progressList}
                todos={todos}
                subjectsWithColors={subjectsWithColors}
              />
            </div>

            <button
              type="button"
              onClick={onHomeClick}
              className="hover:opacity-80 transition-opacity"
            >
              <p style={{ color: colors.textSecondary }}>公認会計士の勉強進捗管理</p>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}


