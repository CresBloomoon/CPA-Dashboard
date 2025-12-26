import { useEffect } from 'react';
import Tabs from './features/shared/components/Tabs';
import AppHeader from './features/shared/components/AppHeader';
import TabContent from './features/shared/components/TabContent';
import { useAppData } from './hooks/useAppData';
import { useAppSettings } from './hooks/useAppSettings';
import { useTabNavigation } from './hooks/useTabNavigation';

function App() {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <AppHeader onHomeClick={handleHomeClick} />

        <div className="border-b border-gray-200 mb-6 relative">
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

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
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
            onTodoFilterClick={handleTodoFilterClick}
          />
        )}
      </div>
    </div>
  );
}

export default App;
