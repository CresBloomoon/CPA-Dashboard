interface EmptyStateProps {
  hasTodos: boolean;
  hasFilteredResults: boolean;
}

export default function EmptyState({ hasTodos, hasFilteredResults }: EmptyStateProps) {
  if (!hasTodos) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>リマインダがありません</p>
        <p className="text-sm mt-2">右上の＋ボタンから追加してください</p>
      </div>
    );
  }

  if (!hasFilteredResults) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>検索結果が見つかりません</p>
        <p className="text-sm mt-2">別のキーワードで検索してください</p>
      </div>
    );
  }

  return null;
}


