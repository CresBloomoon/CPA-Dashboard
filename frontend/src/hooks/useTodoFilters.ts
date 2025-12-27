import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import type { Todo } from '../api/types';

export type FilterType = 'today' | 'all' | 'completed';

/**
 * Todoのフィルタリングロジック
 */
export const useTodoFilters = (todos: Todo[], filterType: FilterType) => {
  const dateFilteredTodos = useMemo(() => {
    if (filterType === 'completed') {
      return todos.filter(todo => todo.completed);
    }
    
    // 「今日」と「すべて」は未完了のみを表示
    const incompleteTodos = todos.filter(todo => !todo.completed);
    
    if (filterType === 'all') {
      return incompleteTodos;
    }
    
    // 「今日」フィルター：期限が今日までのリマインダ（期限切れ含む、未完了のみ）
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    return incompleteTodos.filter(todo => {
      if (!todo.due_date) return false;
      const dueDateKey = format(parseISO(todo.due_date), 'yyyy-MM-dd');
      return dueDateKey <= todayKey;
    });
  }, [todos, filterType]);

  return dateFilteredTodos;
};


