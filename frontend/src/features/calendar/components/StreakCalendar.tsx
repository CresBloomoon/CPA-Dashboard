import { useMemo, useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  isSameDay, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  parseISO, 
  isToday, 
  isFuture,
  isSameMonth
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import type { StudyProgress } from '../../../api/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';
import { toLocalDateKey, toLocalDateKeyFromApi } from '../../../utils/dateKey';

interface StreakCalendarProps {
  progressList: StudyProgress[];
}

/**
 * 日付の達成状態を判定する関数
 * 1秒でも記録があれば「達成」とみなす
 */
function getAchievedDates(progressList: StudyProgress[]): Set<string> {
  const achievedSet = new Set<string>();
  progressList.forEach(progress => {
    const dateKey = toLocalDateKeyFromApi(progress.created_at);
    // 1秒でも記録があれば達成とみなす
    if (progress.study_hours > 0) {
      achievedSet.add(dateKey);
    }
  });
  return achievedSet;
}

/**
 * 連続ストリークのグループを計算する
 * 連続している達成日をグループ化して、それぞれのグループの開始日と終了日を返す
 */
function calculateStreakGroups(achievedDates: Set<string>, allDays: Date[]): Array<{ start: Date; end: Date; days: Date[] }> {
  const groups: Array<{ start: Date; end: Date; days: Date[] }> = [];
  let currentGroup: Date[] | null = null;

  allDays.forEach(day => {
    const dateKey = toLocalDateKey(day);
    const isAchieved = achievedDates.has(dateKey);

    if (isAchieved) {
      if (currentGroup === null) {
        currentGroup = [day];
      } else {
        // 前の日付との連続性をチェック
        const prevDay = currentGroup[currentGroup.length - 1];
        const dayDiff = (day.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff === 1) {
          // 連続している
          currentGroup.push(day);
        } else {
          // 連続が途切れた：現在のグループを保存して新しいグループを開始
          groups.push({
            start: currentGroup[0],
            end: currentGroup[currentGroup.length - 1],
            days: [...currentGroup],
          });
          currentGroup = [day];
        }
      }
    } else {
      // 達成日でない：現在のグループがあれば保存
      if (currentGroup !== null && currentGroup.length > 0) {
        groups.push({
          start: currentGroup[0],
          end: currentGroup[currentGroup.length - 1],
          days: [...currentGroup],
        });
        currentGroup = null;
      }
    }
  });

  // 最後のグループがあれば保存
  if (currentGroup !== null && currentGroup.length > 0) {
    groups.push({
      start: currentGroup[0],
      end: currentGroup[currentGroup.length - 1],
      days: [...currentGroup],
    });
  }

  return groups;
}

/**
 * 日付が連続ストリークの一部かどうかを判定
 * 左右・上下で隣接している達成日をチェック
 */
function getStreakConnections(
  date: Date,
  dateKey: string,
  achievedDates: Set<string>,
  streakGroups: Array<{ start: Date; end: Date; days: Date[] }>
): { left: boolean; right: boolean; top: boolean; bottom: boolean } {
  const connections = { left: false, right: false, top: false, bottom: false };
  
  if (!achievedDates.has(dateKey)) return connections;
  
  const currentGroup = streakGroups.find(group => 
    group.days.some(d => toLocalDateKey(d) === dateKey)
  );
  
  if (!currentGroup) return connections;
  
  // 前日（左）
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevKey = format(prevDay, 'yyyy-MM-dd');
  if (achievedDates.has(prevKey) && currentGroup.days.some(d => toLocalDateKey(d) === prevKey)) {
    connections.left = true;
  }
  
  // 翌日（右）
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextKey = format(nextDay, 'yyyy-MM-dd');
  if (achievedDates.has(nextKey) && currentGroup.days.some(d => toLocalDateKey(d) === nextKey)) {
    connections.right = true;
  }
  
  // 上（前週の同じ曜日）
  const prevWeek = new Date(date);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const prevWeekKey = format(prevWeek, 'yyyy-MM-dd');
  if (achievedDates.has(prevWeekKey) && currentGroup.days.some(d => toLocalDateKey(d) === prevWeekKey)) {
    connections.top = true;
  }
  
  // 下（次週の同じ曜日）
  const nextWeek = new Date(date);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = format(nextWeek, 'yyyy-MM-dd');
  if (achievedDates.has(nextWeekKey) && currentGroup.days.some(d => toLocalDateKey(d) === nextWeekKey)) {
    connections.bottom = true;
  }
  
  return connections;
}

export default function StreakCalendar({ progressList }: StreakCalendarProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; x: number; y: number } | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  // 日付跨ぎでも「今日」判定が更新されるようにtick
  const [now, setNow] = useState(() => new Date());

  // コンポーネントがマウントされたらアニメーション開始
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 1分間隔でnow更新（ストリークの今日ハイライトを安定させる）
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // 達成日を計算
  const achievedDates = useMemo(() => getAchievedDates(progressList), [progressList]);

  // 現在の月のカレンダー範囲を計算
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 日曜日から
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // カレンダーのすべての日付を取得
  const calendarDays = useMemo(() => 
    eachDayOfInterval({ start: calendarStart, end: calendarEnd }), 
    [calendarStart, calendarEnd]
  );

  // 連続ストリークのグループを計算
  const streakGroups = useMemo(() => 
    calculateStreakGroups(achievedDates, calendarDays), 
    [achievedDates, calendarDays]
  );

  // 週ごとにグループ化（7列のグリッド用）
  const weeks = useMemo(() => {
    const weekList: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weekList.push(calendarDays.slice(i, i + 7));
    }
    return weekList;
  }, [calendarDays]);

  // 日付の状態を取得
  const getDateStatus = (date: Date): 'achieved' | 'today-unachieved' | 'future' | 'unachieved' => {
    const dateKey = toLocalDateKey(date);
    if (date > now) return 'future';
    if (dateKey === toLocalDateKey(now)) {
      return achievedDates.has(dateKey) ? 'achieved' : 'today-unachieved';
    }
    return achievedDates.has(dateKey) ? 'achieved' : 'unachieved';
  };

  // ツールチップ用のテキストを生成
  const getTooltipText = (date: Date): string => {
    const month = format(date, 'M', { locale: ja });
    const day = format(date, 'd', { locale: ja });
    const weekdayShort = format(date, 'EEE', { locale: ja });
    const dateKey = toLocalDateKey(date);
    const isAchieved = achievedDates.has(dateKey);
    
    if (isAchieved) {
      const hours = progressList
        .filter(p => toLocalDateKeyFromApi(p.created_at) === dateKey)
        .reduce((sum, p) => sum + p.study_hours, 0);
      return `${month}月${day}日(${weekdayShort}) ${hours.toFixed(1)}時間`;
    } else if (dateKey === toLocalDateKey(now)) {
      return `${month}月${day}日(${weekdayShort}) まだ学習していません`;
    } else if (date > now) {
      return `${month}月${day}日(${weekdayShort}) 未来`;
    } else {
      return `${month}月${day}日(${weekdayShort}) 学習なし`;
    }
  };

  const handleCellMouseEnter = (e: MouseEvent<HTMLDivElement>, day: Date) => {
    const dateKey = toLocalDateKey(day);
    setHoveredDate(dateKey);
    const tooltipText = getTooltipText(day);
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
    setHoveredDate(null);
    setTooltip(null);
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // 曜日ヘッダー
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div 
      className="rounded-lg shadow-lg p-6 w-full"
      style={{
        backgroundColor: theme === 'modern' ? 'rgba(30, 41, 59, 0.5)' : colors.card,
        backdropFilter: theme === 'modern' ? 'blur(12px)' : 'none',
        border: theme === 'modern' ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}`,
      }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h2 
          className="text-2xl font-semibold"
          style={{ color: colors.textPrimary }}
        >
          学習ストリーク
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg transition-colors"
            style={{ color: colors.textSecondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.cardHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 
            className="text-xl font-semibold min-w-[120px] text-center"
            style={{ color: colors.textPrimary }}
          >
            {format(currentDate, 'yyyy年MM月', { locale: ja })}
          </h3>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg transition-colors"
            style={{ color: colors.textSecondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.cardHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={handleToday}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ 
              backgroundColor: colors.accent,
              color: colors.textInverse,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.accentHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.accent;
            }}
          >
            今日
          </button>
        </div>
      </div>

      {/* カレンダーグリッド */}
      <div className="w-full">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="text-center text-sm font-medium py-2"
              style={{ 
                color: index === 0 ? colors.textError : index === 6 ? colors.accent : colors.textSecondary 
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-2">
          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const status = getDateStatus(day);
              const isHovered = hoveredDate === dateKey;
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              
              const isAchieved = status === 'achieved';
              const isTodayUnachieved = status === 'today-unachieved';
              const isFutureDate = status === 'future';
              
              // 連続ストリークの接続情報を取得
              const connections = getStreakConnections(day, dateKey, achievedDates, streakGroups);
              
              // カプセル状のスタイルを計算
              const borderRadius = (() => {
                if (!isAchieved) return '50%';
                // 左側が接続されている場合は左側を角丸にしない
                const leftRadius = connections.left ? '0' : '50%';
                // 右側が接続されている場合は右側を角丸にしない
                const rightRadius = connections.right ? '0' : '50%';
                return `${leftRadius} ${rightRadius} ${rightRadius} ${leftRadius}`;
              })();
              
              let cellStyle: React.CSSProperties = {
                borderRadius,
              };
              let cellClassName = 'aspect-square flex items-center justify-center text-sm font-medium transition-all duration-200 cursor-pointer relative';
              
              if (isAchieved) {
                // 達成日：鮮やかなオレンジ（#FF4500）でGlowエフェクト
                cellStyle = {
                  ...cellStyle,
                  backgroundColor: '#FF4500',
                  color: '#ffffff',
                  boxShadow: isHovered 
                    ? '0 0 20px rgba(255, 69, 0, 0.8), 0 0 40px rgba(255, 69, 0, 0.4)'
                    : '0 0 10px rgba(255, 69, 0, 0.5), 0 0 20px rgba(255, 69, 0, 0.3)',
                };
              } else if (isTodayUnachieved) {
                // 今日（未達成）：オレンジの点線枠 + パルスアニメーション
                cellStyle = {
                  ...cellStyle,
                  backgroundColor: 'transparent',
                  color: '#FF4500',
                  border: '2px dashed #FF4500',
                  opacity: 0.6,
                };
                // 静止UI：アニメーションは使わない
              } else if (isFutureDate || !isCurrentMonth) {
                // 未来または今月以外：控えめなグレー
                cellStyle = {
                  ...cellStyle,
                  backgroundColor: theme === 'modern' ? 'rgba(148, 163, 184, 0.1)' : colors.backgroundSecondary,
                  color: colors.textTertiary,
                  opacity: 0.4,
                };
              } else {
                // 未達成日：控えめなグレー
                cellStyle = {
                  ...cellStyle,
                  backgroundColor: theme === 'modern' ? 'rgba(148, 163, 184, 0.05)' : colors.backgroundSecondary,
                  color: colors.textTertiary,
                  opacity: 0.3,
                };
              }
              
              // 今日の特別なインジケーター（白い枠線）
              if (isTodayDate && !isAchieved) {
                cellStyle = {
                  ...cellStyle,
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                };
              } else if (isTodayDate && isAchieved) {
                // 今日で達成済みの場合も白い枠線を追加
                cellStyle = {
                  ...cellStyle,
                  border: '2px solid #ffffff',
                  boxShadow: isHovered 
                    ? '0 0 20px rgba(255, 69, 0, 0.8), 0 0 40px rgba(255, 69, 0, 0.4), 0 0 10px rgba(255, 255, 255, 0.5)'
                    : '0 0 10px rgba(255, 69, 0, 0.5), 0 0 20px rgba(255, 69, 0, 0.3), 0 0 8px rgba(255, 255, 255, 0.4)',
                };
              }
              
              return (
                <motion.div
                  key={dateKey}
                  className={cellClassName}
                  style={cellStyle}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: isVisible ? 1 : 0,
                    opacity: isVisible ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.2,
                    delay: (weekIndex * 7 + dayIndex) * 0.01,
                    ease: 'easeOut',
                  }}
                  whileHover={{ scale: 1.05 }}
                  onMouseEnter={(e) => handleCellMouseEnter(e, day)}
                  onMouseMove={handleCellMouseMove}
                  onMouseLeave={handleCellMouseLeave}
                >
                  {format(day, 'd')}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ツールチップ */}
      <AnimatePresence>
        {tooltip?.visible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed z-50 px-3 py-2 rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
            style={{
              left: `${tooltip.x + 10}px`,
              top: `${tooltip.y + 10}px`,
              backgroundColor: theme === 'modern' ? 'rgba(15, 23, 42, 0.95)' : colors.card,
              color: colors.textPrimary,
              border: theme === 'modern' ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}`,
              backdropFilter: theme === 'modern' ? 'blur(12px)' : 'none',
            }}
          >
            {tooltip.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 統計情報 */}
      <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 text-sm" style={{ color: colors.textSecondary }}>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full"
              style={{
                backgroundColor: '#FF4500',
                boxShadow: '0 0 8px rgba(255, 69, 0, 0.5)',
              }}
            />
            <span>達成日</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full border-2 border-dashed"
              style={{
                borderColor: '#FF4500',
                opacity: 0.6,
              }}
            />
            <span>今日（未達成）</span>
          </div>
        </div>
        <div className="text-sm" style={{ color: colors.textTertiary }}>
          {achievedDates.size}日間学習 / 最長ストリーク: {streakGroups.length > 0 
            ? Math.max(...streakGroups.map(g => g.days.length))
            : 0}日
        </div>
      </div>
    </div>
  );
}
