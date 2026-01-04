import { useMemo, useState, useEffect } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
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

interface CompactStreakCalendarProps {
  progressList?: StudyProgress[];
  achievedDateKeys?: string[]; // yyyy-MM-dd（/api/summary由来）
  hoursByDateKey?: Record<string, number>; // tooltip用（/api/summary由来）
  compact?: boolean; // コンパクトモード（日付非表示、最小サイズ）
}

/**
 * 日付の達成状態を判定する関数
 */
function getAchievedDates(progressList: StudyProgress[]): Set<string> {
  const achievedSet = new Set<string>();
  progressList.forEach(progress => {
    const dateKey = toLocalDateKeyFromApi(progress.created_at);
    if (progress.study_hours > 0) {
      achievedSet.add(dateKey);
    }
  });
  return achievedSet;
}

/**
 * 連続ストリークのグループを計算する
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
        const prevDay = currentGroup[currentGroup.length - 1];
        const dayDiff = (day.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff === 1) {
          currentGroup.push(day);
        } else {
          groups.push({
            start: currentGroup[0],
            end: currentGroup[currentGroup.length - 1],
            days: [...currentGroup],
          });
          currentGroup = [day];
        }
      }
    } else {
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
  const prevKey = toLocalDateKey(prevDay);
  if (achievedDates.has(prevKey) && currentGroup.days.some(d => toLocalDateKey(d) === prevKey)) {
    connections.left = true;
  }
  
  // 翌日（右）
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextKey = toLocalDateKey(nextDay);
  if (achievedDates.has(nextKey) && currentGroup.days.some(d => toLocalDateKey(d) === nextKey)) {
    connections.right = true;
  }
  
  // 上（前週の同じ曜日）
  const prevWeek = new Date(date);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const prevWeekKey = toLocalDateKey(prevWeek);
  if (achievedDates.has(prevWeekKey) && currentGroup.days.some(d => toLocalDateKey(d) === prevWeekKey)) {
    connections.top = true;
  }
  
  // 下（次週の同じ曜日）
  const nextWeek = new Date(date);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = toLocalDateKey(nextWeek);
  if (achievedDates.has(nextWeekKey) && currentGroup.days.some(d => toLocalDateKey(d) === nextWeekKey)) {
    connections.bottom = true;
  }
  
  return connections;
}

export default function CompactStreakCalendar({
  progressList = [],
  achievedDateKeys,
  hoursByDateKey,
  compact = true,
}: CompactStreakCalendarProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; x: number; y: number } | null>(null);
  const [hoveredGroupIndex, setHoveredGroupIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const achievedDates = useMemo(() => {
    if (achievedDateKeys && achievedDateKeys.length > 0) return new Set<string>(achievedDateKeys);
    return getAchievedDates(progressList);
  }, [achievedDateKeys, progressList]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = useMemo(() => 
    eachDayOfInterval({ start: calendarStart, end: calendarEnd }), 
    [calendarStart, calendarEnd]
  );

  const streakGroups = useMemo(() => 
    calculateStreakGroups(achievedDates, calendarDays), 
    [achievedDates, calendarDays]
  );

  const dateKeyToGroupIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < streakGroups.length; i++) {
      const g = streakGroups[i]!;
      for (const d of g.days) map.set(toLocalDateKey(d), i);
    }
    return map;
  }, [streakGroups]);

  const weeks = useMemo(() => {
    const weekList: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weekList.push(calendarDays.slice(i, i + 7));
    }
    return weekList;
  }, [calendarDays]);

  const getDateStatus = (date: Date): 'achieved' | 'today-unachieved' | 'future' | 'unachieved' => {
    const dateKey = toLocalDateKey(date);
    if (date > now) return 'future';
    if (dateKey === toLocalDateKey(now)) {
      return achievedDates.has(dateKey) ? 'achieved' : 'today-unachieved';
    }
    return achievedDates.has(dateKey) ? 'achieved' : 'unachieved';
  };

  const getTooltipText = (date: Date): string => {
    const month = format(date, 'M', { locale: ja });
    const day = format(date, 'd', { locale: ja });
    const weekdayShort = format(date, 'EEE', { locale: ja });
    const dateKey = toLocalDateKey(date);
    const isAchieved = achievedDates.has(dateKey);
    
    if (isAchieved) {
      const fromMap = hoursByDateKey ? Number(hoursByDateKey[dateKey] || 0) : null;
      const hours =
        fromMap != null
          ? fromMap
          : progressList
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

  const getGroupIndexForDateKey = (dateKey: string): number | null => dateKeyToGroupIndex.get(dateKey) ?? null;

  const handleCellMouseEnter = (e: MouseEvent<HTMLDivElement>, day: Date) => {
    const dateKey = toLocalDateKey(day);
    setHoveredGroupIndex(getGroupIndexForDateKey(dateKey));
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
    setHoveredGroupIndex(null);
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

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // セルサイズの設定（コンパクトモードでは最小、通常モードでは右側カラムに合わせて自動調整）
  const cellSize = compact ? 'w-2.5 h-2.5' : 'w-full aspect-square'; // 通常モードではAspect Ratio 1:1で自動調整
  const textSize = compact ? 'text-[0px]' : 'text-xs'; // 通常モードでは小さめの文字サイズ

  return (
    <div 
      className="rounded-lg shadow-lg p-4 w-full"
      style={{
        backgroundColor: theme === 'modern' ? 'rgba(30, 41, 59, 0.5)' : colors.card,
        backdropFilter: theme === 'modern' ? 'blur(12px)' : 'none',
        border: theme === 'modern' ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}`,
      }}
    >
      {/* ヘッダー（コンパクト） */}
      <div className="flex items-center justify-between mb-3">
        <h3 
          className="text-sm font-semibold"
          style={{ color: colors.textPrimary }}
        >
          学習ストリーク
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded transition-colors"
            style={{ color: colors.textSecondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.cardHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span 
            className="text-xs font-medium min-w-[80px] text-center"
            style={{ color: colors.textPrimary }}
          >
            {format(currentDate, 'yyyy年M月', { locale: ja })}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded transition-colors"
            style={{ color: colors.textSecondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.cardHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* カレンダーグリッド（コンパクト） */}
      <div className="w-full">
        {/* 曜日ヘッダー（コンパクト） */}
        {!compact && (
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className="text-center text-[10px] font-medium py-1"
                style={{
                  // 視認性最優先：日曜は赤、土曜は青で固定
                  color: index === 0 ? '#ff4d4f' : (index === 6 ? '#1890ff' : colors.textTertiary),
                }}
              >
                {day}
              </div>
            ))}
          </div>
        )}

        {/* 日付グリッド（コンパクト） */}
        <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'} overflow-visible relative`}>
          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const status = getDateStatus(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              
              const isAchieved = status === 'achieved';
              const isTodayUnachieved = status === 'today-unachieved';
              const isFutureDate = status === 'future';
              
              const connections = getStreakConnections(day, dateKey, achievedDates, streakGroups);
              
              const borderRadius = (() => {
                if (!isAchieved) return '50%';
                
                // 左右の接続状態を見て、角を落とすかどうか決める
                const topLeft = connections.left ? '0' : '50%';
                const bottomLeft = connections.left ? '0' : '50%';
                const topRight = connections.right ? '0' : '50%';
                const bottomRight = connections.right ? '0' : '50%';
                
                // order: top-left top-right bottom-right bottom-left
                return `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`;
              })();
              
              // 「背景結合」アプローチ：
              // - セル本体はグリッドのサイズに従わせる（伸ばさない）
              // - 背景だけ absolute で gap 分はみ出して 1〜2px 重ね、アンチエイリアス起因の細い隙間も封じる
              const gridGapPx = compact ? 2 : 4; // gap-0.5(≈2px) / gap-1(≈4px)
              const overlapPx = 1; // 1px 重ねる（アンチエイリアスの細い隙間対策）
              const extendHalf = gridGapPx / 2 + overlapPx;
              const bgExtendLeft = isAchieved && connections.left ? extendHalf : 0;
              const bgExtendRight = isAchieved && connections.right ? extendHalf : 0;

              // Z-Index整理：背景=1、文字/枠=2
              let cellStyle: CSSProperties = {
                position: 'relative',
                overflow: 'visible',
              };

              let cellClassName = `${cellSize} flex items-center justify-center ${textSize} font-medium transition-all duration-200 cursor-pointer relative`;
              const groupIndex = isAchieved ? getGroupIndexForDateKey(dateKey) : null;
              const isGroupHovered = groupIndex != null && groupIndex === hoveredGroupIndex;
              
              if (isAchieved) {
                cellStyle = {
                  ...cellStyle,
                  color: compact ? 'transparent' : '#ffffff', // コンパクトモードでは数字を非表示
                };
              } else if (isTodayUnachieved) {
                cellStyle = {
                  ...cellStyle,
                  backgroundColor: 'transparent',
                  color: '#FF4500',
                  border: '1px dashed #FF4500',
                  opacity: 0.6,
                };
                // 静止UI：アニメーションは使わない
              } else if (isFutureDate || !isCurrentMonth) {
                cellStyle = {
                  ...cellStyle,
                  backgroundColor: theme === 'modern' ? 'rgba(148, 163, 184, 0.05)' : colors.backgroundSecondary,
                  color: colors.textTertiary,
                  opacity: 0.2,
                };
              } else {
                cellStyle = {
                  ...cellStyle,
                  backgroundColor: theme === 'modern' ? 'rgba(148, 163, 184, 0.03)' : colors.backgroundSecondary,
                  color: colors.textTertiary,
                  opacity: 0.15,
                };
              }
              
              // クリーンアップ：白い枠（border）は出さない（今日の強調は色/ツールチップで行う）
              if (isTodayDate && !isAchieved) {
                cellStyle = {
                  ...cellStyle,
                  border: 'none',
                  boxShadow: 'none',
                };
              } else if (isTodayDate && isAchieved) {
                cellStyle = {
                  ...cellStyle,
                  border: 'none',
                  boxShadow: 'none',
                };
              }
              
              return (
                <motion.div
                  key={dateKey}
                  className={cellClassName}
                  style={cellStyle}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: isVisible ? (isGroupHovered ? 1.05 : 1) : 0,
                    opacity: isVisible ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.15,
                    delay: (weekIndex * 7 + dayIndex) * 0.005,
                    ease: 'easeOut',
                  }}
                  onMouseEnter={(e) => handleCellMouseEnter(e, day)}
                  onMouseMove={handleCellMouseMove}
                  onMouseLeave={handleCellMouseLeave}
                >
                  {/* 背景レイヤー（連結用） */}
                  {isAchieved && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: -bgExtendLeft,
                        width: `calc(100% + ${bgExtendLeft + bgExtendRight}px)`,
                        backgroundColor: '#FF4500',
                        borderRadius,
                        zIndex: 1,
                        pointerEvents: 'none',
                        // フラットデザイン：発光/影は出さない
                        boxShadow: 'none',
                      }}
                    />
                  )}

                  {/* 前面レイヤー（文字/枠） */}
                  <span style={{ position: 'relative', zIndex: 2 }}>
                    {!compact && format(day, 'd')}
                  </span>
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
            className="fixed z-50 px-2 py-1 rounded text-xs shadow-lg pointer-events-none whitespace-nowrap"
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

      {/* 統計情報（コンパクト） */}
      <div className="mt-3 flex items-center justify-between text-xs" style={{ color: colors.textTertiary }}>
        <span>{achievedDates.size}日学習</span>
        <span>最長: {streakGroups.length > 0 
          ? Math.max(...streakGroups.map(g => g.days.length))
          : 0}日</span>
      </div>
    </div>
  );
}

