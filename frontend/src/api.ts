import axios from 'axios';
import type { StudyProgress, StudyProgressCreate, SubjectSummary, Todo, TodoCreate, Settings, SettingsCreate } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const studyProgressApi = {
  // すべての進捗を取得
  getAll: async (): Promise<StudyProgress[]> => {
    const response = await api.get<StudyProgress[]>('/progress');
    return response.data;
  },

  // IDで進捗を取得
  getById: async (id: number): Promise<StudyProgress> => {
    const response = await api.get<StudyProgress>(`/progress/${id}`);
    return response.data;
  },

  // 新しい進捗を作成
  create: async (data: StudyProgressCreate): Promise<StudyProgress> => {
    const response = await api.post<StudyProgress>('/progress', data);
    return response.data;
  },

  // 進捗を更新
  update: async (id: number, data: Partial<StudyProgressCreate>): Promise<StudyProgress> => {
    const response = await api.put<StudyProgress>(`/progress/${id}`, data);
    return response.data;
  },

  // 進捗を削除
  delete: async (id: number): Promise<void> => {
    await api.delete(`/progress/${id}`);
  },

  // 科目で進捗を取得
  getBySubject: async (subject: string): Promise<StudyProgress[]> => {
    const response = await api.get<StudyProgress[]>(`/progress/subject/${subject}`);
    return response.data;
  },

  // 科目ごとの集計を取得
  getSummary: async (): Promise<SubjectSummary[]> => {
    const response = await api.get<SubjectSummary[]>('/summary');
    return response.data;
  },
};

export const todoApi = {
  // すべてのToDoを取得
  getAll: async (): Promise<Todo[]> => {
    const response = await api.get<Todo[]>('/todos');
    return response.data;
  },

  // IDでToDoを取得
  getById: async (id: number): Promise<Todo> => {
    const response = await api.get<Todo>(`/todos/${id}`);
    return response.data;
  },

  // 新しいToDoを作成
  create: async (data: TodoCreate): Promise<Todo> => {
    const response = await api.post<Todo>('/todos', data);
    return response.data;
  },

  // ToDoを更新
  update: async (id: number, data: Partial<TodoCreate & { completed: boolean }>): Promise<Todo> => {
    const response = await api.put<Todo>(`/todos/${id}`, data);
    return response.data;
  },

  // ToDoを削除
  delete: async (id: number): Promise<void> => {
    await api.delete(`/todos/${id}`);
  },
};

export const settingsApi = {
  // すべての設定を取得
  getAll: async (): Promise<Settings[]> => {
    const response = await api.get<Settings[]>('/settings');
    return response.data;
  },

  // キーで設定を取得
  getByKey: async (key: string): Promise<Settings> => {
    const response = await api.get<Settings>(`/settings/${key}`);
    return response.data;
  },

  // 設定を作成または更新
  createOrUpdate: async (data: SettingsCreate): Promise<Settings> => {
    const response = await api.post<Settings>('/settings', data);
    return response.data;
  },

  // 科目名を更新
  updateSubjectName: async (oldName: string, newName: string): Promise<{ updated_count: number }> => {
    const response = await api.put<{ updated_count: number }>('/subjects/update-name', {
      old_name: oldName,
      new_name: newName,
    });
    return response.data;
  },
};

