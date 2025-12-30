import { getThemeColors } from '../../../../styles/theme';

interface EmptyStateProps {
  hasTodos: boolean;
  hasFilteredResults: boolean;
  colors: ReturnType<typeof getThemeColors>;
}

export default function EmptyState({ hasTodos, hasFilteredResults, colors }: EmptyStateProps) {
  if (!hasTodos) {
    return (
      <div className="text-center py-12" style={{ color: colors.textTertiary }}>
        <p>リマインダがありません</p>
        <p className="text-sm mt-2">右上の＋ボタンから追加してください</p>
      </div>
    );
  }

  if (!hasFilteredResults) {
    return (
      <div className="text-center py-12" style={{ color: colors.textTertiary }}>
        <p>検索結果が見つかりません</p>
        <p className="text-sm mt-2">別のキーワードで検索してください</p>
      </div>
    );
  }

  return null;
}


