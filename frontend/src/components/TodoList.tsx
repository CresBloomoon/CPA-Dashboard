import { useState, useEffect, useRef, useMemo } from 'react';
import { todoApi } from '../api';
import { isSameDay, isBefore, startOfDay } from 'date-fns';
import type { Todo, Subject, Project } from '../types';
import TodoCreateModal from './TodoCreateModal';
import Sidebar, { type SidebarItem } from './Sidebar';
import { calculateTodoCounts } from '../utils/todoCounts';

interface TodoListProps {
  todos: Todo[];
  onUpdate: () => void;
  subjects: string[];
  subjectsWithColors?: Subject[];
  projects?: Project[];
  initialFilterType?: 'today' | 'all' | 'completed';
}

export default function TodoList({ todos, onUpdate, subjects, subjectsWithColors = [], projects = [], initialFilterType = 'today' }: TodoListProps) {
  // 科目名から色を取得
  const getSubjectColor = (subjectName?: string): string | undefined => {
    if (!subjectName) return undefined;
    const subject = subjectsWithColors.find(s => s.name === subjectName);
    return subject?.color;
  };

  // プロジェクトIDからプロジェクト名を取得
  const getProjectName = (projectId?: number): string | undefined => {
    if (!projectId) return undefined;
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      console.log('Project not found for projectId:', projectId, 'Available projects:', projects);
      return undefined;
    }
    return project.name;
  };
  
  // デバッグ用：subjectsWithColorsの内容を確認
  useEffect(() => {
    if (subjectsWithColors.length > 0) {
      console.log('TodoList - subjectsWithColors:', subjectsWithColors);
    } else {
      console.log('TodoList - subjectsWithColors is empty');
    }
  }, [subjectsWithColors]);
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'today' | 'all' | 'completed'>(initialFilterType);
  
  // initialFilterTypeが変更されたらfilterTypeを更新
  useEffect(() => {
    setFilterType(initialFilterType);
  }, [initialFilterType]);

  // ToDoの完了状態を切り替え
  const handleToggle = async (todo: Todo) => {
    try {
      await todoApi.update(todo.id, { completed: !todo.completed });
      onUpdate();
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  // ToDoを削除
  const handleDelete = async (id: number) => {
    try {
      await todoApi.delete(id);
      onUpdate();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };


  // 検索タグの追加
  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const trimmed = searchInput.trim();
      if (trimmed) {
        // スペースで分割して複数のタグを追加
        const newTags = trimmed.split(/\s+/).filter(tag => tag.length > 0 && !searchTags.includes(tag));
        if (newTags.length > 0) {
          setSearchTags([...searchTags, ...newTags]);
        }
        setSearchInput('');
      }
    } else if (e.key === 'Backspace' && searchInput === '' && searchTags.length > 0) {
      // 入力が空でBackspaceを押したら最後のタグを削除
      setSearchTags(searchTags.slice(0, -1));
    }
  };

  // 検索タグの削除
  const removeSearchTag = (tagToRemove: string) => {
    setSearchTags(searchTags.filter(tag => tag !== tagToRemove));
  };

  // フィルタリング（今日、すべて、完了）
  const dateFilteredTodos = useMemo(() => {
    if (filterType === 'all') {
      return todos;
    }
    
    if (filterType === 'completed') {
      return todos.filter(todo => todo.completed);
    }
    
    // 「今日」フィルター：期限が今日までのリマインダ（期限切れ含む）
    const today = startOfDay(new Date());
    return todos.filter(todo => {
      if (!todo.due_date) return false;
      const dueDate = startOfDay(new Date(todo.due_date));
      return isSameDay(dueDate, today) || isBefore(dueDate, today);
    });
  }, [todos, filterType]);

  // リマインダ件数の計算（共通ロジックを使用）
  const { today: todayCount, all: allCount, completed: completedCount } = useMemo(
    () => calculateTodoCounts(todos),
    [todos]
  );

  // 検索フィルタリング（すべてのタグが一致する必要がある - AND検索）
  const filteredTodos = useMemo(() => {
    return dateFilteredTodos.filter(todo => {
      if (searchTags.length === 0) return true;
      return searchTags.every(tag => {
        const query = tag.toLowerCase();
        const titleMatch = todo.title.toLowerCase().includes(query);
        const subjectMatch = todo.subject?.toLowerCase().includes(query) || false;
        return titleMatch || subjectMatch;
      });
    });
  }, [dateFilteredTodos, searchTags]);

  // 未完了と完了で分ける
  const incompleteTodos = filteredTodos.filter(t => !t.completed);
  const completedTodos = filteredTodos.filter(t => t.completed);

  // モーダルを閉じる
  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* 検索バーと追加ボタン（上部固定） */}
      <div className="flex items-center justify-end gap-4 p-6 pb-4 flex-shrink-0">
        {/* 検索バー */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white min-h-[42px] w-80">
          <div className="flex items-center text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* 検索タグ */}
          {searchTags.map((tag, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeSearchTag(tag)}
                className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          
          {/* 検索入力 */}
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchInputKeyDown}
            placeholder={searchTags.length === 0 ? "検索..." : ""}
            className="flex-1 min-w-[120px] outline-none bg-transparent"
          />
        </div>
        
        {/* 追加ボタン（＋のみ） */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-10 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          title="リマインダを追加"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* 検索タグの説明 */}
      {searchTags.length > 0 && (
        <div className="px-6 pb-2 flex-shrink-0">
          <p className="text-xs text-gray-500">スペースまたはEnterでキーワードを追加</p>
        </div>
      )}

      {/* サイドバーとメインコンテンツエリア */}
      <div className="flex flex-1 min-h-0">
        {/* 左側サイドバー */}
        <Sidebar
          title="リマインダ"
          items={[
            { id: 'today', label: '今日', count: todayCount },
            { id: 'all', label: 'すべて', count: allCount },
            { id: 'completed', label: '完了', count: completedCount },
          ]}
          activeItemId={filterType}
          onItemClick={(itemId) => setFilterType(itemId as 'today' | 'all' | 'completed')}
        />

        {/* 右側メインコンテンツ */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="text-2xl font-semibold text-gray-700">リマインダ一覧</h2>
            </div>

            {/* リマインダ一覧（メイン） */}
          <div 
            className="space-y-2 overflow-y-auto"
            style={{
              height: 'calc(9.5 * 5rem + 9 * 0.5rem)', // 9.5個分の高さ（各項目約5rem + 項目間スペース0.5rem × 9）10個目の上半分が見える
              minHeight: 'calc(9.5 * 5rem + 9 * 0.5rem)',
            }}
          >
            {/* 未完了のリマインダ */}
            {incompleteTodos.length > 0 && (
              <div className="space-y-2">
                {incompleteTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                <button
                  onClick={() => handleToggle(todo)}
                  key={`${todo.id}-${todo.completed}`}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    todo.completed ? 'animate-checkmark-circle' : ''
                  }`}
                  style={{
                    borderColor: todo.completed 
                      ? (getSubjectColor(todo.subject) || '#3b82f6')
                      : '#d1d5db',
                    backgroundColor: todo.completed 
                      ? (getSubjectColor(todo.subject) || '#3b82f6')
                      : 'transparent',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!todo.completed) {
                      e.currentTarget.style.borderColor = getSubjectColor(todo.subject) || '#3b82f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!todo.completed) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                >
                  {todo.completed && (
                    <svg 
                      className="w-4 h-4 animate-checkmark" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      style={{
                        color: '#ffffff',
                      }}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={3.5} 
                        d="M5 13l4 4L19 7"
                        className="animate-draw-check"
                        style={{
                          filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))',
                        }}
                      />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <div className="text-gray-800 flex items-center gap-2">
                    {todo.subject && (
                      <span
                        className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getSubjectColor(todo.subject) }}
                        title={todo.subject}
                      />
                    )}
                    <span>{todo.subject ? `【${todo.subject}】${todo.title}` : todo.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    {todo.due_date && (() => {
                      const dueDate = new Date(todo.due_date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      dueDate.setHours(0, 0, 0, 0);
                      
                      const diffTime = dueDate.getTime() - today.getTime();
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      
                      const dueDateText = `${dueDate.getFullYear()}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${String(dueDate.getDate()).padStart(2, '0')}`;
                      
                      let textColorClass = 'text-gray-700'; // デフォルト（明日以降）
                      
                      if (diffDays < 0) {
                        // 期限超（前日以前）- 赤文字
                        textColorClass = 'text-red-600';
                      } else if (diffDays === 0) {
                        // 当日 - 青文字
                        textColorClass = 'text-blue-600';
                      }
                      
                      return (
                        <span className={`px-2 py-1 bg-gray-100 rounded-md text-sm ${textColorClass}`}>
                          {dueDateText}
                        </span>
                      );
                    })()}
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
                      {getProjectName(todo.project_id) || '未分類'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="opacity-0 group-hover:opacity-100 px-2 py-1 text-red-500 hover:text-red-700 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                  </div>
                ))}
              </div>
            )}

            {/* 完了したリマインダ */}
            {completedTodos.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">完了済み</h3>
                <div className="space-y-2">
                  {completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group opacity-60"
                >
                  <button
                    onClick={() => handleToggle(todo)}
                    className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{
                      backgroundColor: getSubjectColor(todo.subject) || '#3b82f6',
                      borderColor: getSubjectColor(todo.subject) || '#3b82f6',
                    }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <div className="flex-1">
                    <div className="text-gray-600 line-through flex items-center gap-2">
                      {todo.subject && (
                        <span
                          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getSubjectColor(todo.subject) }}
                          title={todo.subject}
                        />
                      )}
                      <span>{todo.subject ? `【${todo.subject}】${todo.title}` : todo.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      {todo.due_date && (() => {
                        const dueDate = new Date(todo.due_date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        dueDate.setHours(0, 0, 0, 0);
                        
                        const diffTime = dueDate.getTime() - today.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        
                        const dueDateText = `${dueDate.getFullYear()}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${String(dueDate.getDate()).padStart(2, '0')}`;
                        
                        let textColorClass = 'text-gray-700'; // デフォルト（明日以降）
                        
                        if (diffDays < 0) {
                          // 期限超（前日以前）- 赤文字
                          textColorClass = 'text-red-600';
                        } else if (diffDays === 0) {
                          // 当日 - 青文字
                          textColorClass = 'text-blue-600';
                        }
                        
                        return (
                          <span className={`px-2 py-1 bg-gray-100 rounded-md text-sm opacity-60 ${textColorClass}`}>
                            {dueDateText}
                          </span>
                        );
                      })()}
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm opacity-60">
                        {getProjectName(todo.project_id) || '未分類'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 text-red-500 hover:text-red-700 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                  ))}
                </div>
              </div>
            )}

            {/* 空の状態 */}
            {todos.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>リマインダがありません</p>
                <p className="text-sm mt-2">右上の＋ボタンから追加してください</p>
              </div>
            )}
            {todos.length > 0 && filteredTodos.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>検索結果が見つかりません</p>
                <p className="text-sm mt-2">別のキーワードで検索してください</p>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* モーダル：新規リマインダ追加フォーム */}
      <TodoCreateModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={onUpdate}
        subjects={subjects}
        subjectsWithColors={subjectsWithColors}
      />
    </div>
  );
}

