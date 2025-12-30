import { format, parseISO } from 'date-fns';
import type { Todo } from '../api/types';

export interface TodoCounts {
  today: number; // 今日が期限（未完了のみ）
  all: number; // すべて（未完了のみ）
  completed: number; // 完了済み
}

/**
 * リマインダの件数を計算する共通関数
 * @param todos リマインダの配列
 * @returns 各フィルターの件数
 */
export function calculateTodoCounts(todos: Todo[]): TodoCounts {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  
  // 「今日」フィルターの件数（未完了のみ）
  const today = todos.filter(todo => {
    if (todo.completed) return false; // 完了済みを除外
    if (!todo.due_date) return false;
    const dueDateKey = format(parseISO(todo.due_date), 'yyyy-MM-dd');
    return dueDateKey <= todayKey;
  }).length;

  // 「すべて」フィルターの件数（未完了のみ）
  const all = todos.filter(todo => !todo.completed).length;

  // 「完了」フィルターの件数
  const completed = todos.filter(todo => todo.completed).length;

  return { today, all, completed };
}



