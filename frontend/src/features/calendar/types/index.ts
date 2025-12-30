/**
 * Calendar機能の型定義
 */

export interface CalendarDateRange {
  start: Date;
  end: Date;
}

export interface TodoDateFilter {
  date: Date;
  todos: unknown[]; // Todo型はapi/typesからインポートするため、ここではunknown
}


