import { useState, useEffect } from 'react';
import { studyProgressApi, todoApi, settingsApi, projectApi } from './api';
import type { StudyProgress, StudyProgressCreate, SubjectSummary, Todo, Subject, Project } from './types';
import ProgressList from './components/ProgressList';
import ProgressForm from './components/ProgressForm';
import SummaryCards from './components/SummaryCards';
import SubjectChart from './components/SubjectChart';
import StudyTimer from './components/StudyTimer';
import TodoList from './components/TodoList';
import CalendarView from './components/CalendarView';
import SettingsView from './components/SettingsView';
import GanttChart from './components/GanttChart';
import KanbanBoard from './components/KanbanBoard';
import Heatmap from './components/Heatmap';
import Tabs from './components/Tabs';
import { ToastProvider } from './components/Toast';

function App() {
  const [progressList, setProgressList] = useState<StudyProgress[]>([]);
  const [summary, setSummary] = useState<SubjectSummary[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [subjects, setSubjects] = useState<string[]>(['財計', '財理', '管計', '管理', '企業法', '監査論', '租税法', '経営学']);
  const [subjectsWithColors, setSubjectsWithColors] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProgress, setEditingProgress] = useState<StudyProgress | null>(null);
  const [health, setHealth] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [prevTab, setPrevTab] = useState<string>('dashboard');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード' },
    { id: 'timer', label: '時間記録' },
    { id: 'todo', label: 'リマインダ' },
    { id: 'calendar', label: 'カレンダー' },
    { id: 'kanban', label: 'プロジェクト' },
    { id: 'gantt', label: 'ガントチャート' },
    { id: 'settings', label: '設定' },
  ];

  // データ取得
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 各APIを個別に呼び出してエラーハンドリング
      try {
        const progress = await studyProgressApi.getAll();
        setProgressList(progress);
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
      
      try {
        const summaryData = await studyProgressApi.getSummary();
        setSummary(summaryData);
      } catch (error) {
        console.error('Error fetching summary:', error);
      }
      
      try {
        const todosData = await todoApi.getAll();
        setTodos(todosData);
      } catch (error) {
        console.error('Error fetching todos:', error);
      }
      
      try {
        const projectsData = await projectApi.getAll();
        setProjects(projectsData);
      } catch (error) {
        console.error('Error fetching projects:', error);
        // プロジェクト取得に失敗した場合は空配列を設定
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ToDoデータ取得
  const fetchTodos = async () => {
    try {
      const todosData = await todoApi.getAll();
      setTodos(todosData);
    } catch (error) {
      console.error('Error fetching todos:', error);
      alert('リマインダの取得に失敗しました');
    }
  };

  // 設定を読み込む
  const loadSettings = async () => {
    try {
      const settings = await settingsApi.getAll();
      const subjectsSetting = settings.find(s => s.key === 'subjects');
      if (subjectsSetting) {
        const parsedSubjects = JSON.parse(subjectsSetting.value);
        // Subject型の配列か、文字列の配列かを判定
        if (Array.isArray(parsedSubjects) && parsedSubjects.length > 0) {
          if (parsedSubjects[0] && typeof parsedSubjects[0] === 'object' && 'id' in parsedSubjects[0]) {
            setSubjectsWithColors(parsedSubjects as Subject[]);
            setSubjects((parsedSubjects as Subject[]).map(s => s.name));
          } else {
            // 文字列配列の場合は名前のみを設定（色情報なし）
            setSubjects(parsedSubjects as string[]);
            setSubjectsWithColors([]);
          }
        }
      } else {
        // 設定が存在しない場合は空にする
        setSubjectsWithColors([]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // エラー時はデフォルト値を使用
      setSubjectsWithColors([]);
    }
  };

  // ヘルスチェック
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/health`);
        const data = await response.json();
        setHealth(data.status);
      } catch (error) {
        setHealth('接続エラー');
      }
    };
    checkHealth();
    fetchData();
    loadSettings();
  }, []);

  // タブ変更時にデータを再取得
  useEffect(() => {
    fetchData();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 進捗追加
  const handleAdd = async (data: StudyProgressCreate) => {
    await studyProgressApi.create(data);
    await fetchData();
    setShowForm(false);
  };

  // 進捗更新
  const handleUpdate = async (data: StudyProgressCreate) => {
    if (editingProgress) {
      await studyProgressApi.update(editingProgress.id, data);
      await fetchData();
      setEditingProgress(null);
      setShowForm(false);
    }
  };

  // 進捗削除
  const handleDelete = async (id: number) => {
    if (confirm('本当に削除しますか？')) {
      try {
        await studyProgressApi.delete(id);
        await fetchData();
      } catch (error) {
        console.error('Error deleting progress:', error);
        alert('削除に失敗しました');
      }
    }
  };

  // 編集開始
  const handleEdit = (progress: StudyProgress) => {
    setEditingProgress(progress);
    setShowForm(true);
  };

  // フォームキャンセル
  const handleCancel = () => {
    setShowForm(false);
    setEditingProgress(null);
  };

  // 統計計算
  const totalHours = summary.reduce((sum, s) => sum + s.total_hours, 0);
  const totalProgress = progressList.length > 0
    ? progressList.reduce((sum, p) => sum + p.progress_percent, 0) / progressList.length
    : 0;
  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.completed).length;
  
  // 今日が期限のリマインダ数（期限切れも含む）
  const todayDueTodos = todos.filter(todo => {
    if (!todo.due_date) return false;
    const todoDate = new Date(todo.due_date);
    const today = new Date();
    // 日付のみを比較（時刻を無視）
    const todoDateStr = todoDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    return todoDateStr <= todayStr; // 今日以前（今日と期限切れ）
  }).length;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                CPA Dashboard
              </h1>
              <p className="text-gray-600">公認会計士の勉強進捗管理</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${health === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                API: {health || '確認中...'}
              </span>
            </div>
          </div>
        </header>

        <Tabs activeTab={activeTab} onTabChange={(tab) => {
          const tabOrder = ['dashboard', 'timer', 'todo', 'calendar', 'kanban', 'gantt', 'settings'];
          const currentIndex = tabOrder.indexOf(activeTab);
          const newIndex = tabOrder.indexOf(tab);
          setSlideDirection(newIndex > currentIndex ? 'right' : 'left');
          setPrevTab(activeTab);
          setActiveTab(tab);
        }} tabs={tabs} />

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div key={activeTab} className={slideDirection === 'right' ? 'slide-in-right' : 'slide-in-left'}>
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <SummaryCards
                  totalHours={totalHours}
                  totalTodos={totalTodos}
                  completedTodos={completedTodos}
                  todayDueTodos={todayDueTodos}
                  onReminderCardClick={() => {
                    setSlideDirection('right');
                    setPrevTab(activeTab);
                    setActiveTab('todo');
                  }}
                />
                <Heatmap progressList={progressList} todos={todos} />
              </div>
            )}

            {activeTab === 'timer' && (
              <div className="max-w-2xl mx-auto">
                <StudyTimer onRecorded={fetchData} subjects={subjects} subjectsWithColors={subjectsWithColors} />
              </div>
            )}

            {activeTab === 'todo' && (
              <div className="max-w-7xl mx-auto">
                <TodoList todos={todos} onUpdate={fetchTodos} subjects={subjects} subjectsWithColors={subjectsWithColors} projects={projects} />
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="max-w-full mx-auto">
                <CalendarView todos={todos} onUpdate={fetchTodos} subjectsWithColors={subjectsWithColors} />
              </div>
            )}

            {activeTab === 'kanban' && (
              <div className="max-w-full mx-auto">
                <KanbanBoard 
                  todos={todos} 
                  projects={projects} 
                  subjectsWithColors={subjectsWithColors}
                  onProjectsUpdate={fetchData}
                  onTodosUpdate={fetchTodos}
                  subjects={subjects}
                />
              </div>
            )}

            {activeTab === 'gantt' && (
              <div className="max-w-full mx-auto">
                <GanttChart 
                  todos={todos} 
                  projects={projects} 
                  subjectsWithColors={subjectsWithColors}
                  onProjectsUpdate={fetchData}
                  subjects={subjects}
                />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="w-full -mx-4">
                <SettingsView 
                  onSubjectsChange={(names) => {
                    setSubjects(names);
                  }}
                  onSubjectsWithColorsChange={(subjectsWithColorsData) => {
                    setSubjectsWithColors(subjectsWithColorsData);
                  }}
                  onDataUpdate={fetchData}
                />
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;

