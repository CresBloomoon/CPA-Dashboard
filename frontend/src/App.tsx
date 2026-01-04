import { useEffect, useState, useRef } from 'react';
import Tabs from './features/shared/components/Tabs';
import AppHeader from './features/shared/components/AppHeader';
import TabContent from './features/shared/components/TabContent';
import { useAppData } from './hooks/useAppData';
import { useAppSettings } from './hooks/useAppSettings';
import { useTabNavigation } from './hooks/useTabNavigation';
import { useTheme } from './contexts/ThemeContext';
import { getThemeColors } from './styles/theme';
import { TrophyQueueSidebar } from './features/trophy/components/TrophyQueueSidebar';
import { AchievementsModal } from './features/trophy/components/AchievementsModal';
import { useTrophySystemContext } from './contexts/TrophySystemContext';

function App() {
  // 開発モードでのLocalStorageリセット機能（?reset=true）
  useEffect(() => {
    if (import.meta.env.DEV) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('reset') === 'true') {
        console.log('[App] Development mode: Clearing localStorage...');
        localStorage.clear();
        // リダイレクトしてクエリパラメータを削除
        window.location.href = window.location.pathname;
      }
    }
  }, []);
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
    reportStartDay,
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

  const [isTrophyModalOpen, setIsTrophyModalOpen] = useState(false);
  
  // 遅延ローディング（200ms以上続いた場合のみ表示）
  const [showLoading, setShowLoading] = useState(false);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const isCurrentlyLoading = isLoading || isLoadingSettings;
    
    // タイマーをクリア
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    
    if (isCurrentlyLoading) {
      // 200ms後にまだローディング中なら表示
      loadingTimerRef.current = setTimeout(() => {
        if (isLoading || isLoadingSettings) {
          setShowLoading(true);
        }
      }, 200);
    } else {
      // ローディング終了時は即座に非表示
      setShowLoading(false);
    }
    
    // クリーンアップ
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [isLoading, isLoadingSettings]);

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
      <TrophyQueueSidebar />
      <div className="container mx-auto px-4 py-8">
        <AppHeader
          onHomeClick={handleHomeClick}
          reportStartDay={reportStartDay}
          progressList={progressList}
          todos={todos}
          subjectsWithColors={subjectsWithColors}
        />

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
            showTrophyButton={true}
            onTrophyClick={() => setIsTrophyModalOpen(true)}
          />
        </div>

        {/* メインパネル: 常にTabContentを表示し、スライド＋フェードアニメーションを適用 */}
        <div
          key={activeTab}
          className={`relative ${
            slideDirection === 'right'
              ? 'panel-slide-fade-in-right'
              : 'panel-slide-fade-in-left'
          }`}
        >
          <TabContent
            activeTab={activeTab}
            slideDirection={slideDirection}
            progressList={progressList}
            summary={summary}
            todos={todos}
            projects={projects}
            subjects={subjects}
            subjectsWithColors={subjectsWithColors}
            reportStartDay={reportStartDay}
            todoListFilterType={todoListFilterType}
            onFetchData={fetchData}
            onFetchTodos={fetchTodos}
            onSubjectsChange={setSubjects}
            onSubjectsWithColorsChange={setSubjectsWithColors}
            onSettingsUpdate={loadSettings}
            onTodoFilterClick={handleTodoFilterClick}
          />
          
          {/* ローディングオーバーレイ（200ms以上続いた場合のみ表示） */}
          {showLoading && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center z-10"
              style={{
                backgroundColor: `rgba(${theme === 'light' ? '239, 246, 255' : '15, 23, 42'}, 0.7)`,
                backdropFilter: 'blur(2px)',
              }}
            >
              <div
                className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: colors.accent }}
              ></div>
              <p className="mt-3 text-sm" style={{ color: colors.textSecondary }}>
                読み込み中...
              </p>
            </div>
          )}
        </div>
      </div>
      {import.meta.env.DEV && <TrophyTestButton />}
      <AchievementsModal isOpen={isTrophyModalOpen} onClose={() => setIsTrophyModalOpen(false)} />
    </div>
  );
}

function TrophyTestButton() {
  const { checkTrophies, unlockTrophy, resetTrophies } = useTrophySystemContext();
  return (
    <div className="fixed right-4 bottom-4 z-[80] flex items-center gap-2">
      <button
        type="button"
        className="px-4 py-2 rounded-xl font-bold shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
        style={{ backgroundColor: '#FFB800', color: '#111827' }}
        onClick={() => {
          // 「一気に10個獲得」をシミュレート
          checkTrophies({ __testBatch10: true }, { trigger: 'immediate' });
        }}
      >
        トロフィー10個テスト
      </button>
      <button
        type="button"
        className="px-4 py-2 rounded-xl font-bold shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
        style={{ backgroundColor: 'rgba(8, 14, 28, 0.92)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.55)' }}
        onClick={() => {
          // 3つの異なる実績を同時にunlock（Sidebarの多重表示確認用）
          unlockTrophy('weekly_report_first');
          unlockTrophy('weekly_hours_70');
          unlockTrophy('weekly_perfect_streak');
        }}
        title="3つ同時アンロック（テスト）"
      >
        3つ同時テスト
      </button>
      <button
        type="button"
        className="px-4 py-2 rounded-xl font-semibold border shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
        style={{
          borderColor: '#FFB800',
          color: '#FFB800',
          backgroundColor: 'rgba(8, 14, 28, 0.92)',
          backdropFilter: 'blur(12px)',
        }}
        onClick={() => resetTrophies()}
        title="すべてのトロフィーをリセット"
      >
        全トロフィーリセット
      </button>
    </div>
  );
}

export default App;
