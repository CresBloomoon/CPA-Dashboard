import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ANIMATION_THEME } from '../../../../config/appConfig';
import { todoApi } from '../../../../api/api';
import type { Todo, Subject, Project } from '../../../../api/types';
import TodoCreateModal from '../TodoCreateModal';
import Sidebar from '../../../shared/components/Sidebar';
import { calculateTodoCounts } from '../../../../utils/todoCounts';
import { useTodoFilters, type FilterType } from '../../../../hooks/useTodoFilters';
import { useTodoSearch } from '../../../../hooks/useTodoSearch';
import SearchBar from './SearchBar';
import TodoItem from './TodoItem';
import TodoListHeader from './TodoListHeader';
import EmptyState from './EmptyState';
import { useTheme } from '../../../../contexts/ThemeContext';
import { getThemeColors } from '../../../../styles/theme';

interface TodoListProps {
  todos: Todo[];
  onUpdate: () => void;
  subjects: string[];
  subjectsWithColors?: Subject[];
  projects?: Project[];
  initialFilterType?: FilterType;
}

export default function TodoList({ 
  todos, 
  onUpdate, 
  subjects, 
  subjectsWithColors = [], 
  projects = [], 
  initialFilterType = 'today' 
}: TodoListProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  
  const BATCH_COMPLETION_DELAY = 1500;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>(initialFilterType);
  
  // initialFilterTypeが変更されたらfilterTypeを更新
  useEffect(() => {
    setFilterType(initialFilterType);
  }, [initialFilterType]);

  // フィルタリング
  const dateFilteredTodos = useTodoFilters(todos, filterType);

  // 検索
  const {
    searchTags,
    searchInput,
    setSearchInput,
    handleSearchInputKeyDown,
    removeSearchTag,
    filteredTodos: searchFilteredTodos,
  } = useTodoSearch(dateFilteredTodos);

  // 最終的なフィルタリング結果
  const filteredTodos = searchFilteredTodos;

  // リマインダ件数の計算
  const { today: todayCount, all: allCount, completed: completedCount } = calculateTodoCounts(todos);

  // ToDoを削除
  const handleDelete = async (id: number) => {
    try {
      await todoApi.delete(id);
      onUpdate();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  // モーダルを閉じる
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // 追加ボタンのクリックハンドラ
  const handleAddClick = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      <SearchBar
        searchTags={searchTags}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        onSearchInputKeyDown={handleSearchInputKeyDown}
        onRemoveSearchTag={removeSearchTag}
        colors={colors}
        theme={theme}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          title="リマインダ"
          headerRight={
            <motion.button
              onClick={handleAddClick}
              className="p-2 rounded-lg transition-colors"
              style={{
                color: colors.textTertiary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.accent;
                e.currentTarget.style.backgroundColor = colors.cardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.textTertiary;
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="リマインダを追加"
              aria-label="リマインダを追加"
              whileHover={{ scale: ANIMATION_THEME.SCALES.BUTTON.HOVER }}
              whileTap={{ scale: ANIMATION_THEME.SCALES.BUTTON.TAP }}
              transition={ANIMATION_THEME.SPRINGS.UI_TIGHT}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </motion.button>
          }
          items={[
            { id: 'today', label: '今日', count: todayCount },
            { id: 'all', label: 'すべて', count: allCount },
            { id: 'completed', label: '完了', count: completedCount },
          ]}
          activeItemId={filterType}
          onItemClick={(itemId) => setFilterType(itemId as FilterType)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div 
            className="rounded-lg shadow-lg p-6 h-full flex flex-col overflow-hidden"
            style={{
              backgroundColor: theme === 'modern' ? 'rgba(30, 41, 59, 0.5)' : colors.card,
              backdropFilter: theme === 'modern' ? 'blur(12px)' : 'none',
              border: theme === 'modern' ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}`,
            }}
          >
            <TodoListHeader colors={colors} />

            <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
              {filteredTodos.length > 0 && (
                <div className="space-y-2">
                  {filteredTodos.map((todo: Todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onUpdate={onUpdate}
                      onDelete={handleDelete}
                      subjectsWithColors={subjectsWithColors}
                      projects={projects}
                      batchCompletionDelay={BATCH_COMPLETION_DELAY}
                    />
                  ))}
                </div>
              )}

              <EmptyState 
                hasTodos={todos.length > 0} 
                hasFilteredResults={filteredTodos.length > 0}
                colors={colors}
              />
            </div>
          </div>
        </div>
      </div>

      <TodoCreateModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={onUpdate}
        subjects={subjects}
        subjectsWithColors={subjectsWithColors}
      />
    </div>
  );
}

