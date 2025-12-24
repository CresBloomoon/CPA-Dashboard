import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { todoApi } from '../api';
import type { Todo, Subject } from '../types';

interface CalendarViewProps {
  todos: Todo[];
  onUpdate: () => void;
  subjectsWithColors?: Subject[];
}

export default function CalendarView({ todos, onUpdate, subjectsWithColors = [] }: CalendarViewProps) {
  // 科目名から色を取得
  const getSubjectColor = (subjectName?: string): string | undefined => {
    if (!subjectName) return undefined;
    const subject = subjectsWithColors.find(s => s.name === subjectName);
    return subject?.color;
  };

  // 色の明度を計算（0-255）
  const getLuminance = (hex: string): number => {
    const rgb = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!rgb) return 128; // デフォルト値
    
    const r = parseInt(rgb[1], 16);
    const g = parseInt(rgb[2], 16);
    const b = parseInt(rgb[3], 16);
    
    // 相対輝度を計算（0.299*R + 0.587*G + 0.114*B）
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  // 背景色に応じた文字色を取得（透明度20%の背景を考慮）
  const getTextColor = (bgColor?: string): string => {
    if (!bgColor) return '#1e40af'; // デフォルトは青
    // 背景色が透明度20%なので、実際の背景は白に近い
    // そのため、元の色の明度に関係なく、常に暗い文字色を使用
    // ただし、元の色を少し濃くして使用することで、色の識別がしやすくなる
    return bgColor; // 元の色をそのまま使用（透明度20%の背景上では見やすくなる）
  };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTodos, setSelectedTodos] = useState<Todo[]>([]);
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  // 月の開始日と終了日を取得
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // カレンダーに表示するすべての日付
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // 特定の日付のToDoを取得
  const getTodosForDate = (date: Date): Todo[] => {
    return todos.filter(todo => {
      if (!todo.due_date) return false;
      const todoDate = new Date(todo.due_date);
      // 日付のみを比較（時刻を無視）
      const dateStr = format(date, 'yyyy-MM-dd');
      const todoDateStr = format(todoDate, 'yyyy-MM-dd');
      return dateStr === todoDateStr;
    });
  };

  // 日付セルをクリック
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateTodos = getTodosForDate(date);
    setSelectedTodos(dateTodos);
  };

  // ToDoの完了状態を切り替え
  const handleToggleTodo = async (e: React.MouseEvent, todo: Todo) => {
    e.stopPropagation(); // 日付セルのクリックイベントを防ぐ
    try {
      await todoApi.update(todo.id, { completed: !todo.completed });
      onUpdate();
      // 選択した日付のToDoリストも更新
      if (selectedDate) {
        const dateTodos = getTodosForDate(selectedDate);
        setSelectedTodos(dateTodos);
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      alert('ToDoの更新に失敗しました');
    }
  };

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    e.stopPropagation();
    setDraggedTodo(todo);
    e.dataTransfer.effectAllowed = 'move';
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  // ドラッグリーブ
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);
  };

  // ドロップ
  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTodo) return;

    // ローカル時間で日付を構築（時刻は00:00:00）
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    const localDate = new Date(year, month, day, 0, 0, 0, 0);
    
    // タイムゾーンオフセットを取得（分単位）
    const timezoneOffset = localDate.getTimezoneOffset();
    // UTC時間に変換（オフセットを加算）
    const utcDate = new Date(localDate.getTime() - timezoneOffset * 60 * 1000);
    const isoString = utcDate.toISOString();

    try {
      await todoApi.update(draggedTodo.id, {
        due_date: isoString,
      });
      onUpdate();
      setDraggedTodo(null);
      setDragOverDate(null);
      
      // 選択した日付のToDoリストも更新
      if (selectedDate) {
        const dateTodos = getTodosForDate(selectedDate);
        setSelectedTodos(dateTodos);
      }
    } catch (error) {
      console.error('Error moving todo:', error);
      alert('ToDoの移動に失敗しました');
      setDraggedTodo(null);
      setDragOverDate(null);
    }
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedTodo(null);
    setDragOverDate(null);
  };

  // 月を変更
  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // 日付セルのスタイル
  const getDateCellClass = (date: Date) => {
    const baseClass = "min-h-32 p-2 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer";
    const isCurrentMonth = isSameMonth(date, currentDate);
    const isToday = isSameDay(date, new Date());
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isDragOver = dragOverDate && isSameDay(date, dragOverDate);
    
    let classes = baseClass;
    if (!isCurrentMonth) {
      classes += " bg-gray-50 text-gray-400";
    }
    if (isToday) {
      classes += " bg-blue-50 border-blue-300";
    }
    if (isSelected) {
      classes += " bg-blue-100 border-blue-500";
    }
    if (isDragOver) {
      classes += " bg-green-100 border-green-400 border-2";
    }
    return classes;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">カレンダー</h2>

      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-xl font-semibold text-gray-800">
            {format(currentDate, 'yyyy年MM月', { locale: ja })}
          </h3>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleToday}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
        >
          今日
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
        {/* 曜日ヘッダー */}
        {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
          <div
            key={day}
            className={`p-2 text-center font-semibold text-sm ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            } bg-gray-100`}
          >
            {day}
          </div>
        ))}

        {/* カレンダー日付セル */}
        {calendarDays.map((date, index) => {
          const dateTodos = getTodosForDate(date);
          const incompleteTodos = dateTodos.filter(t => !t.completed);
          const completedTodos = dateTodos.filter(t => t.completed);

          return (
            <div
              key={index}
              onClick={() => handleDateClick(date)}
              onDragOver={(e) => handleDragOver(e, date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
              className={getDateCellClass(date)}
            >
              <div className="text-sm font-medium mb-1">
                {format(date, 'd')}
              </div>
              <div className="space-y-1">
                {incompleteTodos.slice(0, 4).map((todo) => {
                  const subjectColor = getSubjectColor(todo.subject);
                  const bgColor = subjectColor ? `${subjectColor}20` : undefined;
                  const textColor = subjectColor ? getTextColor(subjectColor) : undefined;
                  const borderColor = subjectColor ? subjectColor : undefined;
                  return (
                  <div
                    key={todo.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, todo)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => handleToggleTodo(e, todo)}
                    className="text-xs px-1 py-0.5 rounded truncate cursor-pointer transition-colors flex items-center gap-1"
                    style={subjectColor ? { 
                      backgroundColor: `${subjectColor}20`, 
                      color: textColor,
                      borderColor: borderColor 
                    } : {
                      backgroundColor: '#dbeafe',
                      color: '#1e40af'
                    }}
                    title={todo.subject ? `【${todo.subject}】${todo.title}` : todo.title}
                  >
                    <div 
                      className="flex-shrink-0 w-3 h-3 rounded-full border flex items-center justify-center"
                      style={borderColor ? { borderColor: borderColor } : { borderColor: '#2563eb' }}
                    >
                      {todo.completed && subjectColor && (
                        <svg 
                          className="w-2 h-2" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24" 
                          style={{ color: getTextColor(subjectColor) }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="truncate">
                      {todo.subject ? `【${todo.subject}】` : ''}
                      {todo.title.length > 8 ? `${todo.title.substring(0, 8)}...` : todo.title}
                    </span>
                  </div>
                  );
                })}
                {incompleteTodos.length > 4 && (
                  <div className="text-xs text-gray-500">
                    +{incompleteTodos.length - 4}件
                  </div>
                )}
                {/* 完了したToDoを表示（未完了が4個以下の場合、または未完了が0個の場合） */}
                {completedTodos.length > 0 && incompleteTodos.length <= 4 && (
                  <>
                    {completedTodos.slice(0, incompleteTodos.length === 0 ? 4 : 1).map((todo) => {
                      const subjectColor = getSubjectColor(todo.subject);
                      const displayText = todo.subject ? `【${todo.subject}】${todo.title}` : todo.title;
                      const textColor = subjectColor ? getTextColor(subjectColor) : undefined;
                      return (
                        <div
                          key={todo.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, todo)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => handleToggleTodo(e, todo)}
                          className="text-xs line-through cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded transition-colors flex items-center gap-1"
                          style={subjectColor ? {
                            backgroundColor: `${subjectColor}20`,
                            color: textColor,
                            opacity: 0.7
                          } : {
                            color: '#9ca3af'
                          }}
                        >
                          <div 
                            className="flex-shrink-0 w-3 h-3 rounded-full border flex items-center justify-center"
                            style={subjectColor ? { 
                              borderColor: subjectColor, 
                              backgroundColor: subjectColor 
                            } : {
                              borderColor: '#9ca3af',
                              backgroundColor: '#9ca3af'
                            }}
                          >
                            <svg 
                              className="w-2 h-2" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                              style={{ color: subjectColor ? getTextColor(subjectColor) : '#ffffff' }}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="truncate" title={displayText}>
                            {displayText.length > 8 
                              ? `${displayText.substring(0, 8)}...` 
                              : displayText}
                          </span>
                        </div>
                      );
                    })}
                    {completedTodos.length > (incompleteTodos.length === 0 ? 4 : 1) && (
                      <div className="text-xs text-gray-500">
                        +{completedTodos.length - (incompleteTodos.length === 0 ? 4 : 1)}件
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 選択した日付のToDo詳細 */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            {format(selectedDate, 'yyyy年MM月dd日', { locale: ja })}
          </h3>
          {selectedTodos.length === 0 ? (
            <p className="text-gray-500 text-sm">この日のリマインダはありません</p>
          ) : (
            <div className="space-y-2">
              {selectedTodos.map((todo) => {
                const subjectColor = getSubjectColor(todo.subject);
                return (
                <div
                  key={todo.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, todo)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => handleToggleTodo(e, todo)}
                  className={`p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                    todo.completed ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {todo.subject && subjectColor && (
                      <span
                        className="inline-block w-4 h-4 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: subjectColor }}
                        title={todo.subject}
                      />
                    )}
                    <div 
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                        todo.completed
                          ? subjectColor ? '' : 'border-blue-500 bg-blue-500'
                          : subjectColor ? '' : 'border-gray-300 hover:border-blue-500'
                      }`}
                      style={subjectColor ? {
                        borderColor: subjectColor,
                        backgroundColor: todo.completed ? subjectColor : 'transparent'
                      } : {}}
                    >
                      {todo.completed && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        {todo.subject ? `【${todo.subject}】${todo.title}` : todo.title}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

