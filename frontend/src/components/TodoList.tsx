import { useState, useEffect, useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale';
import { addDays } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import { todoApi, settingsApi } from '../api';
import type { Todo, TodoCreate, Subject, ReviewTiming } from '../types';

registerLocale('ja', ja);

interface TodoListProps {
  todos: Todo[];
  onUpdate: () => void;
  subjects: string[];
  subjectsWithColors?: Subject[];
}

export default function TodoList({ todos, onUpdate, subjects, subjectsWithColors = [] }: TodoListProps) {
  // 科目名から色を取得
  const getSubjectColor = (subjectName?: string): string | undefined => {
    if (!subjectName) return undefined;
    const subject = subjectsWithColors.find(s => s.name === subjectName);
    return subject?.color;
  };
  
  // デバッグ用：subjectsWithColorsの内容を確認
  useEffect(() => {
    if (subjectsWithColors.length > 0) {
      console.log('TodoList - subjectsWithColors:', subjectsWithColors);
    } else {
      console.log('TodoList - subjectsWithColors is empty');
    }
  }, [subjectsWithColors]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoSubject, setNewTodoSubject] = useState<string>('');
  const [newTodoDueDate, setNewTodoDueDate] = useState<Date>(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [reviewTimings, setReviewTimings] = useState<ReviewTiming[]>([]);
  const [isUsingSetList, setIsUsingSetList] = useState(false);
  const [selectedSetListTiming, setSelectedSetListTiming] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSetListDropdownOpen, setIsSetListDropdownOpen] = useState(false);
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');

  // 復習タイミング設定を読み込む
  useEffect(() => {
    loadReviewTimings();
  }, []);

  const loadReviewTimings = async () => {
    try {
      const settings = await settingsApi.getAll();
      const reviewTimingSetting = settings.find(s => s.key === 'review_timing');
      
      if (reviewTimingSetting) {
        try {
          const parsed = JSON.parse(reviewTimingSetting.value);
          if (Array.isArray(parsed)) {
            setReviewTimings(parsed as ReviewTiming[]);
          }
        } catch (error) {
          console.error('Error parsing review timings:', error);
        }
      }
    } catch (error) {
      console.error('Error loading review timings:', error);
    }
  };

  // 通知を表示
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // 復習リマインダを一括作成（セットリストから）
  const handleCreateReviewSet = async (timing: ReviewTiming, title: string) => {
    if (!timing || timing.review_days.length === 0) {
      showNotification('復習タイミングが設定されていません', 'error');
      return;
    }

    if (!title || !title.trim()) {
      showNotification('タイトルを入力してください', 'error');
      return;
    }

    try {
      setIsAdding(true);
      const startDate = new Date(newTodoDueDate);
      startDate.setHours(0, 0, 0, 0);

      // 復習リマインダを作成
      const todosToCreate: TodoCreate[] = [];
      timing.review_days.forEach((day, index) => {
        const dueDate = addDays(startDate, day);
        const timezoneOffset = dueDate.getTimezoneOffset();
        const utcDate = new Date(dueDate.getTime() - timezoneOffset * 60 * 1000);
        
        todosToCreate.push({
          title: `${title.trim()}_復習${index + 1}回目`,
          subject: timing.subject_name,
          due_date: utcDate.toISOString(),
        });
      });

      // 一括作成
      for (const todo of todosToCreate) {
        await todoApi.create(todo);
      }

      // フォームをリセット
      setNewTodoTitle('');
      setNewTodoSubject('');
      setNewTodoDueDate(new Date());
      setIsUsingSetList(false);
      setSelectedSetListTiming(null);
      onUpdate();
      showNotification(`${timing.review_days.length}件の復習リマインダを作成しました`, 'success');
    } catch (error) {
      console.error('Error creating review todos:', error);
      showNotification('復習リマインダの作成に失敗しました', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // 新しいToDoを追加
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // セットリストから生成する場合
    if (isUsingSetList && selectedSetListTiming !== null) {
      const timing = reviewTimings.find(t => t.subject_id === selectedSetListTiming);
      if (!timing) return;
      
      const title = newTodoTitle.trim();
      if (!title) {
        showNotification('タイトルを入力してください', 'error');
        return;
      }
      
      await handleCreateReviewSet(timing, title);
      return;
    }
    
    // 通常の単発リマインダ作成
    if (!newTodoTitle.trim() || !newTodoDueDate) return;

    try {
      setIsAdding(true);
      // 日付のみを扱うため、ローカル時間で00:00:00に設定
      const selectedDate = new Date(newTodoDueDate);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      const localDate = new Date(year, month, day, 0, 0, 0, 0);
      
      // タイムゾーンオフセットを考慮してUTC時間に変換
      const timezoneOffset = localDate.getTimezoneOffset();
      const utcDate = new Date(localDate.getTime() - timezoneOffset * 60 * 1000);
      
      const todoData: TodoCreate = {
        title: newTodoTitle.trim(),
        subject: newTodoSubject || undefined,
        due_date: utcDate.toISOString(),
      };
      await todoApi.create(todoData);
      setNewTodoTitle('');
      setNewTodoSubject('');
      setNewTodoDueDate(new Date()); // デフォルトを今日の日付にリセット
      onUpdate();
      showNotification('リマインダを追加しました', 'success');
    } catch (error) {
      console.error('Error adding todo:', error);
      showNotification('リマインダの追加に失敗しました', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // ToDoの完了状態を切り替え
  const handleToggle = async (todo: Todo) => {
    try {
      await todoApi.update(todo.id, { completed: !todo.completed });
      onUpdate();
    } catch (error) {
      console.error('Error updating todo:', error);
      showNotification('リマインダの更新に失敗しました', 'error');
    }
  };

  // ToDoを削除
  const handleDelete = async (id: number) => {
    try {
      await todoApi.delete(id);
      onUpdate();
      showNotification('リマインダを削除しました', 'success');
    } catch (error) {
      console.error('Error deleting todo:', error);
      showNotification('リマインダの削除に失敗しました', 'error');
    }
  };

  // 検索タグの追加
  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const trimmed = searchInput.trim();
      if (trimmed && !searchTags.includes(trimmed)) {
        setSearchTags([...searchTags, trimmed]);
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

  // 検索フィルタリング（すべてのタグが一致する必要がある - AND検索）
  const filteredTodos = todos.filter(todo => {
    if (searchTags.length === 0) return true;
    return searchTags.every(tag => {
      const query = tag.toLowerCase();
      const titleMatch = todo.title.toLowerCase().includes(query);
      const subjectMatch = todo.subject?.toLowerCase().includes(query) || false;
      return titleMatch || subjectMatch;
    });
  });

  // 未完了と完了で分ける
  const incompleteTodos = filteredTodos.filter(t => !t.completed);
  const completedTodos = filteredTodos.filter(t => t.completed);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* 左側：新規リマインダ生成フォーム（メイン） */}
      <div className="lg:col-span-3 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">新規リマインダ</h2>

        {/* 新規追加フォーム */}
        <form onSubmit={handleAdd} className="space-y-4">
        {/* セットリスト使用の切り替え */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isUsingSetList}
              onChange={(e) => {
                setIsUsingSetList(e.target.checked);
                if (!e.target.checked) {
                  setSelectedSetListTiming(null);
                  setNewTodoSubject('');
                }
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">復習セットリストから一括生成</span>
          </label>
        </div>

        {isUsingSetList ? (
          /* セットリストモード */
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                セットリスト
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSetListDropdownOpen(!isSetListDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                    isAdding ? 'disabled:bg-gray-100' : ''
                  }`}
                  disabled={isAdding}
                >
                  <span className="flex items-center gap-2">
                    {selectedSetListTiming !== null && (() => {
                      const timing = reviewTimings.find(t => t.subject_id === selectedSetListTiming);
                      const color = timing ? getSubjectColor(timing.subject_name) : undefined;
                      return color ? (
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ) : null;
                    })()}
                    {selectedSetListTiming !== null ?
                      (() => {
                        const timing = reviewTimings.find(t => t.subject_id === selectedSetListTiming);
                        return timing ? `${timing.subject_name} (${timing.review_days.length}回: ${timing.review_days.map(d => `${d}日後`).join(', ')})` : '選択してください';
                      })()
                      : '選択してください'}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${isSetListDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isSetListDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsSetListDropdownOpen(false)}
                    />
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div
                        onClick={() => {
                          setSelectedSetListTiming(null);
                          setNewTodoSubject('');
                          setIsSetListDropdownOpen(false);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                          selectedSetListTiming === null ? 'bg-blue-100' : ''
                        }`}
                      >
                        <span className="w-3 h-3" />
                        <span>選択してください</span>
                      </div>
                      {reviewTimings.map((timing) => {
                        const color = getSubjectColor(timing.subject_name);
                        return (
                          <div
                            key={timing.subject_id}
                            onClick={() => {
                              setSelectedSetListTiming(timing.subject_id);
                              setNewTodoSubject(timing.subject_name);
                              setIsSetListDropdownOpen(false);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                              selectedSetListTiming === timing.subject_id ? 'bg-blue-100' : ''
                            }`}
                          >
                            {color ? (
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            ) : (
                              <span className="w-3 h-3" />
                            )}
                            <span>{timing.subject_name} ({timing.review_days.length}回: {timing.review_days.map(d => `${d}日後`).join(', ')})</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {selectedSetListTiming && (() => {
              const timing = reviewTimings.find(t => t.subject_id === selectedSetListTiming);
              if (!timing) return null;
              return (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル
                    </label>
                    <input
                      type="text"
                      value={newTodoTitle}
                      onChange={(e) => setNewTodoTitle(e.target.value)}
                      placeholder="例: 3章"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isAdding}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      開始日
                    </label>
                    <DatePicker
                      selected={newTodoDueDate}
                      onChange={(date: Date | null) => date && setNewTodoDueDate(date)}
                      dateFormat="yyyy年MM月dd日"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isAdding}
                      required
                      locale="ja"
                      calendarClassName="react-datepicker-custom"
                      showPopperArrow={false}
                    />
                  </div>

                  {newTodoTitle.trim() && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm font-medium text-blue-800 mb-2">生成されるタイトル:</div>
                      <div className="space-y-1">
                        {timing.review_days.map((day, index) => {
                          const dueDate = addDays(newTodoDueDate, day);
                          return (
                            <div key={index} className="text-sm text-blue-700">
                              【{timing.subject_name}】{newTodoTitle.trim()}_復習{index + 1}回目 ({dueDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })})
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        ) : (
          /* 通常モード */
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タイトル
              </label>
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="新しいリマインダを追加..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isAdding}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  科目（任意）
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                    className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center gap-2 ${
                      newTodoSubject && getSubjectColor(newTodoSubject) ? 'pl-8 pr-4 py-2' : 'px-4 py-2'
                    } ${isAdding ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    disabled={isAdding}
                  >
                    {newTodoSubject && getSubjectColor(newTodoSubject) && (
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getSubjectColor(newTodoSubject) || '#ccc' }}
                      />
                    )}
                    <span className="flex-1">
                      {newTodoSubject || '選択してください'}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform flex-shrink-0 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isSubjectDropdownOpen && !isAdding && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsSubjectDropdownOpen(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setNewTodoSubject('');
                            setIsSubjectDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                            !newTodoSubject ? 'bg-blue-50' : ''
                          }`}
                        >
                          <span className="w-3 h-3 flex-shrink-0" />
                          <span>選択してください</span>
                        </button>
                        {subjects.map((subject) => {
                          const color = getSubjectColor(subject);
                          return (
                            <button
                              key={subject}
                              type="button"
                              onClick={() => {
                                setNewTodoSubject(subject);
                                setIsSubjectDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                                newTodoSubject === subject ? 'bg-blue-50' : ''
                              }`}
                            >
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color || '#9ca3af' }}
                              />
                              <span>{subject}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  期限
                </label>
                <DatePicker
                  selected={newTodoDueDate}
                  onChange={(date: Date | null) => date && setNewTodoDueDate(date)}
                  dateFormat="yyyy年MM月dd日"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isAdding}
                  required
                  minDate={new Date()}
                  locale="ja"
                  calendarClassName="react-datepicker-custom"
                  showPopperArrow={false}
                />
              </div>
            </div>
          </>
        )}

          <button
            type="submit"
            disabled={isAdding || !newTodoTitle.trim() || !newTodoDueDate || (isUsingSetList && !selectedSetListTiming)}
            className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isAdding ? (isUsingSetList ? '作成中...' : '追加中...') : (isUsingSetList ? '一括生成' : '追加')}
          </button>
        </form>
      </div>

      {/* 右側：既存リマインダリスト（サブ） */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">リマインダ一覧</h2>

        {/* 検索バー */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white min-h-[42px]">
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
              placeholder={searchTags.length === 0 ? "リマインダを検索..." : ""}
              className="flex-1 min-w-[120px] outline-none bg-transparent"
            />
          </div>
          {searchTags.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">スペースまたはEnterでキーワードを追加</p>
          )}
        </div>

        {/* リマインダリスト */}
        <div className="space-y-2">
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
                  className="flex-shrink-0 w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center"
                  style={{
                    borderColor: todo.completed 
                      ? (getSubjectColor(todo.subject) || '#3b82f6')
                      : '#d1d5db',
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
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      style={{
                        color: getSubjectColor(todo.subject) || '#3b82f6',
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    {todo.due_date && (
                      <span>
                        {new Date(todo.due_date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    )}
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
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                      {todo.due_date && (
                        <span>
                          {new Date(todo.due_date).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      )}
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
              <p className="text-sm mt-2">左側のフォームから追加してください</p>
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
  );
}

