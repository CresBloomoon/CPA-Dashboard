import { useEffect } from 'react';
import Tabs from './features/shared/components/Tabs';
import AppHeader from './features/shared/components/AppHeader';
import TabContent from './features/shared/components/TabContent';
import { useAppData } from './hooks/useAppData';
import { useAppSettings } from './hooks/useAppSettings';
import { useTabNavigation } from './hooks/useTabNavigation';
import { useTheme } from './contexts/ThemeContext';
import { getThemeColors } from './styles/theme';

function App() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  
  const {
    progressList,
    summary,
    todos,
    projects,
    isLoading,
    fetchData,
    fetchTodos,
  } = useAppData();

  const {
    subjects,
    subjectsWithColors,
    setSubjects,
    setSubjectsWithColors,
    loadSettings,
    isLoadingSettings,
  } = useAppSettings();

  const {
    activeTab,
    slideDirection,
    todoListFilterType,
    handleTabChange,
    handleHomeClick,
    handleSettingsClick,
    handleTodoFilterClick,
  } = useTabNavigation();

  const tabs = [
    { id: 'timer', label: '学習時間' },
    { id: 'todo', label: 'リマインダ' },
    { id: 'calendar', label: 'カレンダー' },
    { id: 'kanban', label: 'プロジェクト' },
  ];

  // 初期データ読み込み
  useEffect(() => {
    fetchData();
    loadSettings();
  }, []);

  // タブ変更時にデータを再取得
  useEffect(() => {
    fetchData();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // テーマに応じた背景グラデーション
  const backgroundStyle = theme === 'light'
    ? { background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)' } // from-blue-50 to-indigo-100
    : { backgroundColor: colors.background };

  return (
    <div className="min-h-screen" style={backgroundStyle}>
      <div className="container mx-auto px-4 py-8">
        <AppHeader onHomeClick={handleHomeClick} />

        <div 
          className="border-b mb-6 relative"
          style={{ borderColor: colors.border }}
        >
          <Tabs 
            activeTab={activeTab} 
            onTabChange={handleTabChange} 
            tabs={tabs.filter(tab => tab.id !== 'settings')}
            showHomeButton={true}
            onHomeClick={handleHomeClick}
            showSettingsButton={true}
            onSettingsClick={handleSettingsClick}
          />
        </div>

        {isLoading || isLoadingSettings ? (
          <div className="text-center py-12">
            <div 
              className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: colors.accent }}
            ></div>
            <p className="mt-4" style={{ color: colors.textSecondary }}>読み込み中...</p>
          </div>
        ) : (
          <TabContent
            activeTab={activeTab}
            slideDirection={slideDirection}
            progressList={progressList}
            summary={summary}
            todos={todos}
            projects={projects}
            subjects={subjects}
            subjectsWithColors={subjectsWithColors}
            todoListFilterType={todoListFilterType}
            onFetchData={fetchData}
            onFetchTodos={fetchTodos}
            onSubjectsChange={setSubjects}
            onSubjectsWithColorsChange={setSubjectsWithColors}
            onSettingsUpdate={loadSettings}
            onTodoFilterClick={handleTodoFilterClick}
          />
        )}
      </div>
    </div>
  );
}

export default App;
