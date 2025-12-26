import { useMemo } from 'react';
import { isSameDay, isBefore, startOfDay } from 'date-fns';
import type { Todo } from '../types';

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
    const today = startOfDay(new Date());
    return incompleteTodos.filter(todo => {
      if (!todo.due_date) return false;
      const dueDate = startOfDay(new Date(todo.due_date));
      return isSameDay(dueDate, today) || isBefore(dueDate, today);
    });
  }, [todos, filterType]);

  return dateFilteredTodos;
};


