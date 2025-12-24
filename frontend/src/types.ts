export interface StudyProgress {
  id: number;
  subject: string;
  topic: string;
  progress_percent: number;
  study_hours: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface StudyProgressCreate {
  subject: string;
  topic: string;
  progress_percent: number;
  study_hours: number;
  notes?: string;
}

export interface SubjectSummary {
  subject: string;
  count: number;
  total_hours: number;
  avg_progress: number;
}

export interface Todo {
  id: number;
  title: string;
  subject?: string;
  due_date?: string;
  project_id?: number;
  completed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TodoCreate {
  title: string;
  subject?: string;
  due_date?: string;
  project_id?: number;
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
}

export interface ReviewTiming {
  subject_id: number;
  subject_name: string;
  review_days: number[]; // 復習日数（開始日からの日数）例: [1, 3, 7, 14] → 1日後、3日後、7日後、14日後
}

export interface Project {
  id: number;
  name: string;
  subject?: string;
  due_date?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface ProjectCreate {
  name: string;
  subject?: string;
  due_date?: string;
  description?: string;
}
