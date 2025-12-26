import { useState } from 'react';

/**
 * タブナビゲーションロジック
 */
export const useTabNavigation = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [prevTab, setPrevTab] = useState<string>('dashboard');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [todoListFilterType, setTodoListFilterType] = useState<'today' | 'all' | 'completed'>('today');

  const handleTabChange = (tab: string) => {
    // タブ操作でリマインダ画面に入るときは、サイドバー選択を必ず「今日」にリセットする
    if (tab === 'todo') {
      setTodoListFilterType('today');
    }
    const tabOrder = ['dashboard', 'timer', 'todo', 'calendar', 'kanban', 'settings'];
    const currentIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(tab);
    setSlideDirection(newIndex > currentIndex ? 'right' : 'left');
    setPrevTab(activeTab);
    setActiveTab(tab);
  };

  const handleHomeClick = () => {
    setSlideDirection('right');
    setPrevTab(activeTab);
    setActiveTab('dashboard');
  };

  const handleSettingsClick = () => {
    setSlideDirection('right');
    setPrevTab(activeTab);
    setActiveTab('settings');
  };

  const handleTodoFilterClick = (filterType: 'today' | 'all' | 'completed') => {
    setTodoListFilterType(filterType);
    setSlideDirection('right');
    setPrevTab(activeTab);
    setActiveTab('todo');
  };

  return {
    activeTab,
    slideDirection,
    todoListFilterType,
    handleTabChange,
    handleHomeClick,
    handleSettingsClick,
    handleTodoFilterClick,
  };
};


