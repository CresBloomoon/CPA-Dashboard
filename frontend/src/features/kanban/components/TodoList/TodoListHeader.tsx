import { getThemeColors } from '../../../../styles/theme';

interface TodoListHeaderProps {
  colors: ReturnType<typeof getThemeColors>;
}

export default function TodoListHeader({ colors }: TodoListHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 flex-shrink-0">
      <h2 
        className="text-2xl font-semibold"
        style={{ color: colors.textPrimary }}
      >
        リマインダ一覧
      </h2>
    </div>
  );
}


