import { type MouseEvent } from 'react';
import type { Todo } from '../../../../api/types';
import AnimatedCheckbox from '../AnimatedCheckbox';
import { getSubjectColor, getProjectName } from '../../../../utils/todoHelpers';
import type { Subject, Project } from '../../../../api/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import { getThemeColors } from '../../../../styles/theme';

interface TodoItemProps {
  todo: Todo;
  onUpdate: () => void;
  onDelete: (id: number) => void;
  subjectsWithColors: Subject[];
  projects: Project[];
  batchCompletionDelay: number;
}

export default function TodoItem({
  todo,
  onUpdate,
  onDelete,
  subjectsWithColors,
  projects,
  batchCompletionDelay,
}: TodoItemProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  
  const subjectColor = getSubjectColor(todo.subject, subjectsWithColors);
  const displayTitle = (() => {
    // 互換: 以前のデータで title に「【科目】」が含まれている場合は表示時に除去する
    const match = todo.title.match(/^【(.+?)】(.+)$/);
    return match ? match[2] : todo.title;
  })();

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    // 削除ボタンやチェックボックスがクリックされた場合は完了処理を実行しない
    const target = e.target as HTMLElement;
    if (target.closest('button[data-action="delete"]') || target.closest('.ui-checkbox-wrapper')) {
      return;
    }
  };

  const dueDateText = todo.due_date ? (() => {
    const dueDate = new Date(todo.due_date);
    return `${dueDate.getFullYear()}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${String(dueDate.getDate()).padStart(2, '0')}`;
  })() : null;

  const dueDateStyle: React.CSSProperties = todo.due_date ? (() => {
    const dueDate = new Date(todo.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { color: colors.error }; // 期限超
    } else if (diffDays === 0) {
      return { color: colors.accent }; // 当日
    }
    return { color: colors.textPrimary }; // 明日以降
  })() : { color: colors.textPrimary };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 group cursor-pointer ${
        todo.completed ? 'opacity-60' : ''
      }`}
      style={{
        backgroundColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.cardHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <AnimatedCheckbox
        todo={todo}
        subjectColor={subjectColor}
        onUpdate={onUpdate}
        batchCompletionDelay={batchCompletionDelay}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div 
          className="flex items-center gap-2"
          style={{ color: todo.completed ? colors.textTertiary : colors.textPrimary }}
        >
          <span className="truncate">{displayTitle}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm">
          {todo.subject && (
            <span
              className="px-2 py-1 rounded-md text-sm font-medium"
              style={{
                backgroundColor: `${subjectColor}20`,
                color: subjectColor,
              }}
            >
              {todo.subject}
            </span>
          )}
          {dueDateText && (
            <span 
              className="px-2 py-1 rounded-md text-sm"
              style={{
                ...dueDateStyle,
                backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.5)' : colors.backgroundSecondary,
              }}
            >
              {dueDateText}
            </span>
          )}
          <span 
            className="px-2 py-1 rounded-md text-sm"
            style={{
              color: colors.textPrimary,
              backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.5)' : colors.backgroundSecondary,
            }}
          >
            {getProjectName(todo.project_id, projects) || '未分類'}
          </span>
        </div>
      </div>
      <button
        data-action="delete"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onDelete(todo.id);
        }}
        className="opacity-0 group-hover:opacity-100 px-4 py-2 transition-all rounded-lg"
        style={{ color: colors.error }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = colors.error;
          e.currentTarget.style.backgroundColor = `${colors.error}1A`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = colors.error;
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}


