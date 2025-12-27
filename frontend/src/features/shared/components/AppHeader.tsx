import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';

interface AppHeaderProps {
  onHomeClick: () => void;
}

export default function AppHeader({ onHomeClick }: AppHeaderProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <header className="mb-8">
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={onHomeClick}
            className="text-left hover:opacity-80 transition-opacity"
          >
            <h1 
              className="text-4xl font-bold mb-2"
              style={{ color: colors.textPrimary }}
            >
              CPA Dashboard
            </h1>
            <p style={{ color: colors.textSecondary }}>
              公認会計士の勉強進捗管理
            </p>
          </button>
        </div>
      </div>
    </header>
  );
}


