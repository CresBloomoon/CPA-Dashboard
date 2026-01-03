import axios from 'axios';
import type {
  StudyProgress,
  StudyProgressCreate,
  SubjectSummary,
  Todo,
  TodoCreate,
  Settings,
  SettingsCreate,
  Project,
  ProjectCreate,
  StudyTimeSyncRequest,
  StudyTimeSyncResponse,
  StudyTimeSummaryResponse,
  ReviewSetList,
  ReviewSetListCreate,
  ReviewSetListUpdate,
  ReviewSetItem,
  ReviewSetGenerateRequest,
  ReviewSetGenerateResponse,
} from './types';

// NOTE:
// - 本番: VITE_API_BASE_URL を使う（例: http://homepi:8000）
// - 互換: 旧変数 VITE_API_URL も許可
// - 未設定: 開発用に http://localhost:8000 をフォールバック
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000';

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${normalizeBaseUrl(API_BASE_URL)}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター: デバッグ用
api.interceptors.request.use(
  (config) => {
    if (config.method === 'put' && config.url?.includes('/todos/')) {
      console.log('API Request:', config.method, config.url, 'data:', config.data);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター: デバッグ用とエラーハンドリング
api.interceptors.response.use(
  (response) => {
    if (response.config.method === 'put' && response.config.url?.includes('/todos/')) {
      console.log('API Response:', response.status, response.data);
    }
    return response;
  },
  (error) => {
    // エラーの詳細をコンソールに出力
    console.error('[API Error]', {
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code, // ERR_NETWORK, ERR_CONNECTION_REFUSED等
    });
    
    // ユーザーフレンドリーなエラーメッセージを追加
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
      error.userMessage = 'サーバーに接続できません。ネットワーク接続を確認してください。';
    } else if (error.response?.status === 404) {
      error.userMessage = '要求されたリソースが見つかりません。';
    } else if (error.response?.status === 500) {
      error.userMessage = 'サーバーエラーが発生しました。しばらく待ってから再試行してください。';
    } else {
      error.userMessage = `エラーが発生しました: ${error.message}`;
    }
    
    return Promise.reject(error);
  }
);

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
  update: async (id: number, data: Partial<TodoCreate & { completed: boolean; project_id?: number | null }>): Promise<Todo> => {
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

export const projectApi = {
  // すべてのプロジェクトを取得
  getAll: async (): Promise<Project[]> => {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  },

  // IDでプロジェクトを取得
  getById: async (id: number): Promise<Project> => {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  // 新しいプロジェクトを作成
  create: async (data: ProjectCreate): Promise<Project> => {
    const response = await api.post<Project>('/projects', data);
    return response.data;
  },

  // プロジェクトを更新
  update: async (id: number, data: Partial<ProjectCreate & { completed?: boolean }>): Promise<Project> => {
    const response = await api.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  // プロジェクトを削除
  delete: async (id: number): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  // プロジェクトを完了（紐づく未完了ToDoも一括で完了）
  complete: async (id: number): Promise<{ project: Project; updated_todos: number }> => {
    const response = await api.post<{ project: Project; updated_todos: number }>(`/projects/${id}/complete`);
    return response.data;
  },
};

// ----------------------------
// Study time sync (timer)
// ----------------------------

export const studyTimeApi = {
  sync: async (payload: StudyTimeSyncRequest): Promise<StudyTimeSyncResponse> => {
    const response = await api.post<StudyTimeSyncResponse>('/study-time/sync', payload);
    return response.data;
  },

  summary: async (dateKey: string, userId = 'default'): Promise<StudyTimeSummaryResponse> => {
    const response = await api.get<StudyTimeSummaryResponse>('/study-time/summary', {
      params: { date_key: dateKey, user_id: userId },
    });
    return response.data;
  },
};

// ----------------------------
// Review set list (復習セットリスト)
// ----------------------------

export const reviewSetApi = {
  getAll: async (): Promise<ReviewSetList[]> => {
    const response = await api.get<ReviewSetList[]>('/review-set-lists');
    return response.data;
  },

  getById: async (id: number): Promise<ReviewSetList> => {
    const response = await api.get<ReviewSetList>(`/review-set-lists/${id}`);
    return response.data;
  },

  create: async (data: ReviewSetListCreate): Promise<ReviewSetList> => {
    const response = await api.post<ReviewSetList>('/review-set-lists', data);
    return response.data;
  },

  update: async (id: number, data: ReviewSetListUpdate): Promise<ReviewSetList> => {
    const response = await api.put<ReviewSetList>(`/review-set-lists/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/review-set-lists/${id}`);
  },

  createItem: async (setListId: number, offsetDays: number): Promise<ReviewSetItem> => {
    const response = await api.post<ReviewSetItem>(`/review-set-lists/${setListId}/items`, {
      offset_days: offsetDays,
    });
    return response.data;
  },

  updateItem: async (itemId: number, offsetDays: number): Promise<ReviewSetItem> => {
    const response = await api.put<ReviewSetItem>(`/review-set-items/${itemId}`, {
      offset_days: offsetDays,
    });
    return response.data;
  },

  deleteItem: async (itemId: number): Promise<void> => {
    await api.delete(`/review-set-items/${itemId}`);
  },

  generate: async (payload: ReviewSetGenerateRequest): Promise<ReviewSetGenerateResponse> => {
    const response = await api.post<ReviewSetGenerateResponse>('/review-set-lists/generate', payload);
    return response.data;
  },
};

