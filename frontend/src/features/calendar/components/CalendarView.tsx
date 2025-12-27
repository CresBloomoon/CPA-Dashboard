import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { todoApi } from '../../../api/api';
import type { Todo, Subject } from '../../../api/types';
import AnimatedCheckbox from '../../kanban/components/AnimatedCheckbox';
import { APP_LIMITS } from '../../../config/appConfig';

interface CalendarViewProps {
  todos: Todo[];
  onUpdate: () => void;
  subjectsWithColors?: Subject[];
}

// ドラッグ可能なリマインダカードコンポーネント（カレンダー用）
function DraggableTodoCard({ 
  todo, 
  getSubjectColor, 
  getTextColor, 
  onUpdate
}: { 
  todo: Todo; 
  getSubjectColor: (subject?: string) => string | undefined;
  getTextColor: (bgColor?: string) => string;
  onUpdate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const subjectColor = getSubjectColor(todo.subject);
  const bgColor = subjectColor ? `${subjectColor}20` : undefined;
  const textColor = subjectColor ? getTextColor(subjectColor) : undefined;
  const borderColor = subjectColor ? subjectColor : undefined;
  const displayTitle = (() => {
    const match = todo.title.match(/^【(.+?)】(.+)$/);
    return match ? match[2] : todo.title;
  })();

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`text-xs px-1 py-1 min-h-[26px] rounded truncate cursor-move transition-colors flex items-center gap-1 ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{
        ...style,
        ...(subjectColor ? { 
          backgroundColor: `${subjectColor}20`, 
          color: textColor,
          borderColor: borderColor 
        } : {
          backgroundColor: '#dbeafe',
          color: '#1e40af'
        }),
      }}
      title={displayTitle}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <AnimatedCheckbox
          todo={todo}
          subjectColor={subjectColor || '#3b82f6'}
          onUpdate={onUpdate}
          size="sm"
          className="scale-75"
        />
      </div>
      <span className="truncate">
        {displayTitle.length > APP_LIMITS.CALENDAR.TITLE_TRUNCATE_CHARS
          ? `${displayTitle.substring(0, APP_LIMITS.CALENDAR.TITLE_TRUNCATE_CHARS)}...`
          : displayTitle}
      </span>
    </div>
  );
}

// 完了済みリマインダカード（カレンダー用）
function DraggableCompletedTodoCard({ 
  todo, 
  getSubjectColor, 
  getTextColor, 
  onUpdate,
  incompleteCount
}: { 
  todo: Todo; 
  getSubjectColor: (subject?: string) => string | undefined;
  getTextColor: (bgColor?: string) => string;
  onUpdate: () => void;
  incompleteCount: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const subjectColor = getSubjectColor(todo.subject);
  const displayText = (() => {
    const match = todo.title.match(/^【(.+?)】(.+)$/);
    return match ? match[2] : todo.title;
  })();
  const textColor = subjectColor ? getTextColor(subjectColor) : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`text-xs cursor-move hover:bg-gray-100 px-1 py-1 min-h-[26px] rounded transition-colors flex items-center gap-1 ${
        isDragging ? 'opacity-50' : ''
      } ${todo.completed ? 'opacity-60' : ''}`}
      style={{
        ...style,
        ...(subjectColor ? {
          backgroundColor: `${subjectColor}20`,
          color: textColor,
        } : {
          color: '#9ca3af'
        }),
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <AnimatedCheckbox
          todo={todo}
          subjectColor={subjectColor || '#3b82f6'}
          onUpdate={onUpdate}
          size="sm"
          className="scale-75"
        />
      </div>
      <span className="truncate" title={displayText}>
        {displayText.length > APP_LIMITS.CALENDAR.TITLE_TRUNCATE_CHARS
          ? `${displayText.substring(0, APP_LIMITS.CALENDAR.TITLE_TRUNCATE_CHARS)}...`
          : displayText}
      </span>
    </div>
  );
}

// ドロップ可能な日付セルコンポーネント
function DroppableDateCell({ 
  date, 
  dateTodos, 
  incompleteTodos, 
  completedTodos,
  isCurrentMonth,
  isToday,
  isDragOver,
  getSubjectColor,
  getTextColor,
  onUpdateTodos,
  getTodosForDate
}: { 
  date: Date;
  dateTodos: Todo[];
  incompleteTodos: Todo[];
  completedTodos: Todo[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isDragOver: boolean;
  getSubjectColor: (subject?: string) => string | undefined;
  getTextColor: (bgColor?: string) => string;
  onUpdateTodos: () => void;
  getTodosForDate: (date: Date) => Todo[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, 'yyyy-MM-dd'),
  });

  const baseClass = "min-h-32 p-2 border border-gray-200 hover:bg-gray-50 transition-colors";
  let classes = baseClass;
  if (!isCurrentMonth) {
    classes += " bg-gray-50 text-gray-400";
  }
  if (isToday) {
    classes += " bg-blue-50 border-blue-300";
  }
  if (isDragOver || isOver) {
    classes += " bg-green-100 border-green-400 border-2";
  }

  return (
    <div
      ref={setNodeRef}
      className={classes}
    >
      <div className="text-sm font-medium mb-1">
        {format(date, 'd')}
      </div>
      <div className="space-y-1">
        {incompleteTodos.slice(0, APP_LIMITS.CALENDAR.MAX_INCOMPLETE_TODOS).map((todo) => (
          <DraggableTodoCard
            key={todo.id}
            todo={todo}
            getSubjectColor={getSubjectColor}
            getTextColor={getTextColor}
            onUpdate={onUpdateTodos}
          />
        ))}
        {incompleteTodos.length > APP_LIMITS.CALENDAR.MAX_INCOMPLETE_TODOS && (
          <div className="text-xs text-gray-500">
            +{incompleteTodos.length - APP_LIMITS.CALENDAR.MAX_INCOMPLETE_TODOS}件
          </div>
        )}
        {completedTodos.length > 0 && incompleteTodos.length <= APP_LIMITS.CALENDAR.MAX_INCOMPLETE_TODOS && (
          <>
            {completedTodos
              .slice(0, incompleteTodos.length === 0 ? APP_LIMITS.CALENDAR.MAX_INCOMPLETE_TODOS : 1)
              .map((todo) => (
              <DraggableCompletedTodoCard
                key={todo.id}
                todo={todo}
                getSubjectColor={getSubjectColor}
                getTextColor={getTextColor}
                onUpdate={onUpdateTodos}
                incompleteCount={incompleteTodos.length}
              />
            ))}
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
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overDateId, setOverDateId] = useState<string | null>(null);
  
  // 楽観的更新用のローカル状態
  const [optimisticTodos, setOptimisticTodos] = useState<Todo[]>(todos);
  
  // todosが更新されたら楽観的状態も更新
  useEffect(() => {
    setOptimisticTodos(todos);
  }, [todos]);
  
  // dnd-kitのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動したらドラッグ開始（誤操作防止）
      },
    }),
    useSensor(KeyboardSensor)
  );
  
  // 日付をID文字列に変換
  const dateToId = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };
  
  // ID文字列を日付に変換
  const idToDate = (id: string): Date => {
    return new Date(id);
  };

  // 月の開始日と終了日を取得
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // カレンダーに表示するすべての日付
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // 特定の日付のToDoを取得（楽観的状態を使用）
  const getTodosForDate = (date: Date): Todo[] => {
    return optimisticTodos.filter(todo => {
      if (!todo.due_date) return false;
      const todoDate = new Date(todo.due_date);
      // 日付のみを比較（時刻を無視）
      const dateStr = format(date, 'yyyy-MM-dd');
      const todoDateStr = format(todoDate, 'yyyy-MM-dd');
      return dateStr === todoDateStr;
    });
  };

  // ToDoの完了状態を切り替え（AnimatedCheckboxから呼ばれる）
  const handleUpdateTodos = () => {
    onUpdate();
  };

  // dnd-kitのドラッグ開始
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  // dnd-kitのドラッグオーバー
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && typeof over.id === 'string') {
      setOverDateId(over.id);
    } else {
      setOverDateId(null);
    }
  };

  // dnd-kitのドロップ
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverDateId(null);
    
    if (!over || typeof over.id !== 'string') {
      return;
    }

    const todoId = active.id as number;
    const targetDateId = over.id;
    const targetDate = idToDate(targetDateId);

    // 同じ日付への移動は無視
    const todo = optimisticTodos.find(t => t.id === todoId);
    if (!todo || !todo.due_date) {
      return;
    }

    const currentDateStr = format(parseISO(todo.due_date), 'yyyy-MM-dd');
    if (currentDateStr === targetDateId) {
      return;
    }

    // 楽観的更新：即座にUIを更新
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    const localDate = new Date(year, month, day, 0, 0, 0, 0);
    const timezoneOffset = localDate.getTimezoneOffset();
    const utcDate = new Date(localDate.getTime() - timezoneOffset * 60 * 1000);
    const isoString = utcDate.toISOString();
    
    setOptimisticTodos(prevTodos => 
      prevTodos.map(t => 
        t.id === todoId ? { ...t, due_date: isoString } : t
      )
    );

    try {
      // API呼び出し
      await todoApi.update(todoId, {
        due_date: isoString,
      });
      // サーバーから最新データを取得
      onUpdate();
    } catch (error) {
      console.error('Error moving todo:', error);
      // エラー時は楽観的更新を元に戻す
      setOptimisticTodos(todos);
    }
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


  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
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
            const dateId = dateToId(date);
            const isDragOver = overDateId === dateId;

            return (
              <DroppableDateCell
                key={index}
                date={date}
                dateTodos={dateTodos}
                incompleteTodos={incompleteTodos}
                completedTodos={completedTodos}
                isCurrentMonth={isSameMonth(date, currentDate)}
                isToday={isSameDay(date, new Date())}
                isDragOver={isDragOver}
                getSubjectColor={getSubjectColor}
                getTextColor={getTextColor}
                onUpdateTodos={handleUpdateTodos}
                getTodosForDate={getTodosForDate}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeId ? (() => {
            const todo = optimisticTodos.find(t => t.id === activeId);
            if (!todo) return null;
            const subjectColor = getSubjectColor(todo.subject);
            const bgColor = subjectColor ? `${subjectColor}20` : '#dbeafe';
            const textColor = subjectColor ? getTextColor(subjectColor) : '#1e40af';
            const displayTitle = (() => {
              const match = todo.title.match(/^【(.+?)】(.+)$/);
              return match ? match[2] : todo.title;
            })();
            return (
              <div
                className="text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 opacity-90"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                }}
              >
                <div 
                  className="flex-shrink-0 w-3 h-3 rounded-full border"
                  style={{ borderColor: subjectColor || '#2563eb' }}
                />
                <span className="truncate">
                  {displayTitle.length > APP_LIMITS.CALENDAR.TITLE_TRUNCATE_CHARS
                    ? `${displayTitle.substring(0, APP_LIMITS.CALENDAR.TITLE_TRUNCATE_CHARS)}...`
                    : displayTitle}
                </span>
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

