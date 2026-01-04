export interface StudyProgress {
  id: number;
  subject: string;
  topic: string;
  date: string;
  progress_percent: number;
  study_hours: number;
  notes?: string;
  // 分析機能のための追加フィールド
  actual_time?: number; // 実際にかかった時間（時間）
  target_time?: number; // 目標としていた標準時間（時間）
  variance_reason?: string; // 差異の原因（「集中力欠如」「難易度高」など）
  theory_calculation_ratio?: number; // 理論と計算の比率（0.0-1.0）
  created_at: string;
  updated_at?: string;
}

export interface StudyProgressCreate {
  subject: string;
  topic: string;
  date: string;
  progress_percent: number;
  study_hours: number;
  notes?: string;
  // 分析機能のための追加フィールド
  actual_time?: number;
  target_time?: number;
  variance_reason?: string;
  theory_calculation_ratio?: number;
}

export interface SubjectSummary {
  subject: string;
  count: number;
  total_hours: number;
  avg_progress: number;
}

// ----------------------------
// Dashboard summary (/api/summary)
// ----------------------------

export interface WeekDailyEntry {
  date_key: string; // yyyy-MM-dd
  hours: number;
}

export interface StreakSummary {
  current: number;
  longest: number;
  active_dates: string[]; // yyyy-MM-dd
  active_hours_by_date?: Record<string, number>; // date_key -> hours
}

export interface DashboardSummaryResponse {
  user_id: string;
  date_key: string; // yyyy-MM-dd
  today_hours: number;
  week_hours: number;
  week_daily: WeekDailyEntry[];
  week_daily_by_subject?: Array<{ date_key: string; subjects: Record<string, number> }>;
  streak: StreakSummary;
  subjects: SubjectSummary[];
}

export interface Todo {
  id: number;
  title: string;
  subject?: string;
  due_date?: string;
  project_id?: number | null;
  completed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TodoCreate {
  title: string;
  subject?: string;
  due_date?: string;
  project_id?: number | null;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
  created_at: string;
  updated_at?: string;
}

export interface SettingsCreate {
  key: string;
  value: string;
}

export interface Subject {
  id: number;
  name: string;
  color: string;
  /** 科目の表示/非表示（未指定は表示扱い） */
  visible?: boolean;
}

export interface ReviewTiming {
  subject_id: number;
  subject_name: string;
  review_days: number[]; // 復習日数（開始日からの日数）例: [1, 3, 7, 14] → 1日後、3日後、7日後、14日後
}

// ----------------------------
// Review set list (復習セットリスト / 科目非依存)
// ----------------------------

export interface ReviewSetItem {
  id: number;
  set_list_id: number;
  offset_days: number;
  created_at: string;
}

export interface ReviewSetList {
  id: number;
  name: string;
  created_at: string;
  updated_at?: string;
  items: ReviewSetItem[];
}

export interface ReviewSetListCreate {
  name: string;
  items?: Array<{ offset_days: number }>;
}

export interface ReviewSetListUpdate {
  name?: string;
}

export interface ReviewSetGenerateRequest {
  set_list_id: number;
  subject: string;
  base_title?: string;
  start_date?: string; // ISO
  project_id?: number | null;
}

export interface ReviewSetGenerateResponse {
  todos: Todo[];
}

export interface Project {
  id: number;
  name: string;
  due_date?: string;
  description?: string;
  completed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProjectCreate {
  name: string;
  due_date?: string;
  description?: string;
}

// ----------------------------
// Study time sync (timer)
// ----------------------------

export interface StudyTimeSyncRequest {
  user_id: string; // 現状は"default"等
  date_key: string; // yyyy-MM-dd
  subject: string;
  client_session_id: string;
  total_ms: number;
}

export interface StudyTimeSyncResponse {
  applied_delta_ms: number;
  server_today_total_ms: number;
  server_week_total_ms: number;
}

export interface StudyTimeSummaryResponse {
  date_key: string;
  today_total_ms: number;
  week_total_ms: number;
}
