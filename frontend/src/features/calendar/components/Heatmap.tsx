import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { format, startOfYear, endOfYear, eachDayOfInterval, getDay, isSameDay, subDays, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { StudyProgress, Todo } from '../../../api/types';
import { parseApiDateTime, toLocalDateKey } from '../../../utils/dateKey';

interface HeatmapProps {
  progressList: StudyProgress[];
  todos: Todo[];
}

export default function Heatmap({ progressList, todos }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; x: number; y: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  
  // デフォルトは勉強時間で表示
  const useStudyHours = true; // TODO: ユーザーが選択できるようにする

  // 日別の学習時間を集計
  const dailyHours = useMemo(() => {
    const hoursMap: { [key: string]: number } = {};
    
    progressList.forEach(progress => {
      const dateKey = toLocalDateKey(parseApiDateTime(progress.created_at));
      
      if (!hoursMap[dateKey]) {
        hoursMap[dateKey] = 0;
      }
      hoursMap[dateKey] += progress.study_hours;
    });
    
    return hoursMap;
  }, [progressList]);

  // 日別の完了リマインダ数を集計
  const dailyCompletedTodos = useMemo(() => {
    const countMap: { [key: string]: number } = {};
    
    todos.filter(todo => todo.completed && todo.due_date).forEach(todo => {
      const date = new Date(todo.due_date!);
      const dateKey = toLocalDateKey(date);
      
      if (!countMap[dateKey]) {
        countMap[dateKey] = 0;
      }
      countMap[dateKey] += 1;
    });
    
    return countMap;
  }, [todos]);

  // 表示する日付の範囲（今年の最初の日曜日から最後の土曜日まで）
  const firstSunday = (() => {
    const start = startOfYear(new Date());
    const dayOfWeek = getDay(start);
    const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek;
    return subDays(start, daysToSubtract);
  })();
  
  const lastSaturday = (() => {
    const end = endOfYear(new Date());
    const dayOfWeek = getDay(end);
    const daysToAdd = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
    return addDays(end, daysToAdd);
  })();

  // 週ごとにグループ化
  const weeks = useMemo(() => {
    const allDays = eachDayOfInterval({ start: firstSunday, end: lastSaturday });
    const weekList: Date[][] = [];
    
    for (let i = 0; i < allDays.length; i += 7) {
      weekList.push(allDays.slice(i, i + 7));
    }
    
    return weekList;
  }, [firstSunday, lastSaturday]);

  // 学習時間に応じた色を取得
  const getColorByHours = (hours: number): string => {
    if (hours === 0) return '#ebedf0'; // グレー（学習なし）
    if (hours < 0.5) return '#c6e48b'; // 薄い緑
    if (hours < 1) return '#7bc96f'; // 緑
    if (hours < 2) return '#239a3b'; // 濃い緑
    return '#196127'; // 最も濃い緑
  };

  // 完了リマインダ数に応じた色を取得
  const getColorByCount = (count: number): string => {
    if (count === 0) return '#ebedf0'; // グレー（完了なし）
    if (count === 1) return '#c6e48b'; // 薄い緑
    if (count <= 3) return '#7bc96f'; // 緑
    if (count <= 5) return '#239a3b'; // 濃い緑
    return '#196127'; // 最も濃い緑
  };

  // 日付キーから色とデータを取得
  const getColor = (dateKey: string): { color: string; value: number; label: string } => {
    if (useStudyHours) {
      const hours = dailyHours[dateKey] || 0;
      return {
        color: getColorByHours(hours),
        value: hours,
        label: hours === 0 ? '学習時間なし' : `${hours.toFixed(1)}時間`,
      };
    } else {
      const count = dailyCompletedTodos[dateKey] || 0;
      return {
        color: getColorByCount(count),
        value: count,
        label: count === 0 ? '完了リマインダなし' : `${count}件完了`,
      };
    }
  };

  // ツールチップ用のテキストを生成
  const getTooltipText = (date: Date, data: { value: number; label: string }): string => {
    const month = format(date, 'M', { locale: ja });
    const day = format(date, 'd', { locale: ja });
    const weekdayShort = format(date, 'EEE', { locale: ja }); // 曜日短縮形（例: 月）
    
    // 例: "12月25日(水) 2.5時間"
    return `${month}月${day}日(${weekdayShort}) ${data.label}`;
  };

  const handleCellMouseEnter = (e: MouseEvent<HTMLDivElement>, day: Date, data: { value: number; label: string }) => {
    const dateKey = toLocalDateKey(day);
    setHoveredCell(dateKey);
    const tooltipText = getTooltipText(day, data);
    setTooltip({
      visible: true,
      text: tooltipText,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleCellMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (tooltip?.visible) {
      setTooltip({
        ...tooltip,
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const handleCellMouseLeave = () => {
    setHoveredCell(null);
    setTooltip(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">学習ヒートマップ</h2>
      <p className="text-sm text-gray-500 mb-4">今年の学習活動を可視化</p>
      
      <div className="w-full">
        <div className="flex gap-1 w-full">
          {/* ヒートマップ本体 */}
          <div className="flex gap-1 flex-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1 flex-1">
                {week.map((day, dayIndex) => {
                  const localDayKey = toLocalDateKey(day);
                  const data = getColor(localDayKey);
                  const isToday = isSameDay(day, now);
                  const isFuture = day > now;
                  const isHovered = hoveredCell === localDayKey;
                  
                  return (
                    <div
                      key={dayIndex}
                      className="w-full aspect-square rounded-sm cursor-pointer group relative transition-all duration-200"
                      style={{
                        backgroundColor: isFuture ? '#f3f4f6' : data.color,
                        border: isToday 
                          ? '2px solid #ef4444' 
                          : isHovered 
                            ? '2px solid #3b82f6' 
                            : '2px solid transparent',
                        opacity: isHovered ? 0.9 : 1,
                      }}
                      onMouseEnter={(e) => handleCellMouseEnter(e, day, data)}
                      onMouseMove={handleCellMouseMove}
                      onMouseLeave={handleCellMouseLeave}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ツールチップ */}
      {tooltip?.visible && (
        <div
          className="fixed z-50 px-3 py-2 bg-gray-800 text-white text-sm rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* 凡例 */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>少ない</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#ebedf0' }}></div>
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#c6e48b' }}></div>
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#7bc96f' }}></div>
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#239a3b' }}></div>
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#196127' }}></div>
          </div>
          <span>多い</span>
          <span className="ml-4 text-xs text-gray-400">
            ({useStudyHours ? '勉強時間' : '完了リマインダ数'})
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {useStudyHours 
            ? `${Object.keys(dailyHours).length}日間学習`
            : `${Object.keys(dailyCompletedTodos).length}日間でリマインダ完了`
          }
        </div>
      </div>
    </div>
  );
}
