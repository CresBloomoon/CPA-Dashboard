import { useMemo, useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { format, startOfYear, endOfYear, eachDayOfInterval, getDay, isSameDay, subDays, addDays, parseISO, isToday, isFuture, startOfToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import type { StudyProgress } from '../../../api/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';
import { ANIMATION_THEME } from '../../../config/appConfig';

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
    const date = parseISO(progress.created_at);
    const dateKey = format(date, 'yyyy-MM-dd');
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
    const dateKey = format(day, 'yyyy-MM-dd');
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

export default function StreakCalendar({ progressList }: StreakCalendarProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; x: number; y: number } | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // コンポーネントがマウントされたらアニメーション開始
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 達成日を計算
  const achievedDates = useMemo(() => getAchievedDates(progressList), [progressList]);

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

  // すべての日付を取得
  const allDays = useMemo(() => eachDayOfInterval({ start: firstSunday, end: lastSaturday }), [firstSunday, lastSaturday]);

  // 連続ストリークのグループを計算
  const streakGroups = useMemo(() => calculateStreakGroups(achievedDates, allDays), [achievedDates, allDays]);

  // 週ごとにグループ化
  const weeks = useMemo(() => {
    const weekList: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weekList.push(allDays.slice(i, i + 7));
    }
    return weekList;
  }, [allDays]);

  // 日付がどのストリークグループに属するか判定
  const getStreakGroup = (date: Date): { start: Date; end: Date; days: Date[] } | null => {
    const dateKey = format(date, 'yyyy-MM-dd');
    if (!achievedDates.has(dateKey)) return null;
    
    return streakGroups.find(group => 
      group.days.some(d => format(d, 'yyyy-MM-dd') === dateKey)
    ) || null;
  };

  // 日付の状態を取得（達成、今日（未達成）、未来、未達成）
  const getDateStatus = (date: Date): 'achieved' | 'today-unachieved' | 'future' | 'unachieved' => {
    const dateKey = format(date, 'yyyy-MM-dd');
    if (isFuture(date)) return 'future';
    if (isToday(date)) {
      return achievedDates.has(dateKey) ? 'achieved' : 'today-unachieved';
    }
    return achievedDates.has(dateKey) ? 'achieved' : 'unachieved';
  };

  // ツールチップ用のテキストを生成
  const getTooltipText = (date: Date): string => {
    const month = format(date, 'M', { locale: ja });
    const day = format(date, 'd', { locale: ja });
    const weekdayShort = format(date, 'EEE', { locale: ja });
    const dateKey = format(date, 'yyyy-MM-dd');
    const isAchieved = achievedDates.has(dateKey);
    
    if (isAchieved) {
      const hours = progressList
        .filter(p => format(parseISO(p.created_at), 'yyyy-MM-dd') === dateKey)
        .reduce((sum, p) => sum + p.study_hours, 0);
      return `${month}月${day}日(${weekdayShort}) ${hours.toFixed(1)}時間`;
    } else if (isToday(date)) {
      return `${month}月${day}日(${weekdayShort}) まだ学習していません`;
    } else if (isFuture(date)) {
      return `${month}月${day}日(${weekdayShort}) 未来`;
    } else {
      return `${month}月${day}日(${weekdayShort}) 学習なし`;
    }
  };

  const handleCellMouseEnter = (e: MouseEvent<HTMLDivElement>, day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
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

  // 日付が連続ストリークの一部かどうかを判定（右側に線を表示するかどうか）
  const shouldShowConnector = (day: Date, weekIndex: number, dayIndex: number): boolean => {
    const dateKey = format(day, 'yyyy-MM-dd');
    if (!achievedDates.has(dateKey)) return false;
    
    // 次の週の同じ日のインデックスの日付を取得
    if (weekIndex + 1 >= weeks.length) return false;
    
    const nextWeek = weeks[weekIndex + 1];
    if (dayIndex >= nextWeek.length) return false;
    
    const nextDay = nextWeek[dayIndex];
    const nextKey = format(nextDay, 'yyyy-MM-dd');
    
    if (!achievedDates.has(nextKey)) return false;
    
    // 同じストリークグループに属しているか確認
    const currentGroup = getStreakGroup(day);
    const nextGroup = getStreakGroup(nextDay);
    
    return currentGroup !== null && nextGroup !== null && currentGroup === nextGroup;
  };

  return (
    <div 
      className="rounded-lg shadow-lg p-6 w-full"
      style={{
        backgroundColor: theme === 'modern' ? 'rgba(30, 41, 59, 0.5)' : colors.card,
        backdropFilter: theme === 'modern' ? 'blur(12px)' : 'none',
        border: theme === 'modern' ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}`,
      }}
    >
      <h2 
        className="text-2xl font-semibold mb-4"
        style={{ color: colors.textPrimary }}
      >
        学習ストリーク
      </h2>
      <p 
        className="text-sm mb-4"
        style={{ color: colors.textTertiary }}
      >
        連続学習日数を可視化
      </p>

      <div className="w-full overflow-x-auto">
        <div className="flex gap-1 w-full min-w-max">
          {weeks.map((week, weekIndex) => {
            const weekKey = `week-${weekIndex}`;
            return (
              <div key={weekKey} className="flex flex-col gap-1 relative">
                {/* 日付セル */}
                {week.map((day, dayIndex) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const status = getDateStatus(day);
                  const isHovered = hoveredDate === dateKey;
                  const group = getStreakGroup(day);
                  
                  // 達成日のスタイル
                  const isAchieved = status === 'achieved';
                  const isTodayUnachieved = status === 'today-unachieved';
                  const isFutureDate = status === 'future';
                  
                  // 右側に線を表示するかどうか
                  const showConnector = shouldShowConnector(day, weekIndex, dayIndex);
                  
                  let cellStyle: React.CSSProperties = {};
                  let cellClassName = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 cursor-pointer relative';
                  
                  // 右側に線を表示（連続ストリークの場合）
                  if (showConnector && isAchieved) {
                    cellStyle = {
                      ...cellStyle,
                      position: 'relative' as const,
                    };
                  }
                  
                  if (isAchieved) {
                    // 達成日：鮮やかなオレンジ（発光エフェクト）
                    cellStyle = {
                      backgroundColor: '#FF6D01',
                      color: '#ffffff',
                      boxShadow: isHovered 
                        ? '0 0 20px rgba(255, 109, 1, 0.8), 0 0 40px rgba(255, 109, 1, 0.4)'
                        : '0 0 10px rgba(255, 109, 1, 0.5), 0 0 20px rgba(255, 109, 1, 0.3)',
                    };
                  } else if (isTodayUnachieved) {
                    // 今日（未達成）：オレンジの点線枠
                    cellStyle = {
                      backgroundColor: 'transparent',
                      color: '#FF6D01',
                      border: '2px dashed #FF6D01',
                      opacity: 0.6,
                    };
                  } else if (isFutureDate) {
                    // 未来：控えめなグレー
                    cellStyle = {
                      backgroundColor: theme === 'modern' ? 'rgba(148, 163, 184, 0.1)' : colors.backgroundSecondary,
                      color: colors.textTertiary,
                      opacity: 0.4,
                    };
                  } else {
                    // 未達成日：控えめなグレー
                    cellStyle = {
                      backgroundColor: theme === 'modern' ? 'rgba(148, 163, 184, 0.05)' : colors.backgroundSecondary,
                      color: colors.textTertiary,
                      opacity: 0.3,
                    };
                  }
                  
                  return (
                    <motion.div
                      key={`${weekIndex}-${dayIndex}`}
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
                      whileHover={{ scale: 1.1 }}
                      onMouseEnter={(e) => handleCellMouseEnter(e, day)}
                      onMouseMove={handleCellMouseMove}
                      onMouseLeave={handleCellMouseLeave}
                    >
                      {format(day, 'd')}
                      {/* 右側に線を表示（連続ストリークの場合） */}
                      {showConnector && isAchieved && (
                        <motion.div
                          className="absolute top-1/2 left-full h-1 bg-[#FF6D01] -translate-y-1/2"
                          style={{ width: '4px' }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: isVisible ? 1 : 0 }}
                          transition={{
                            duration: 0.3,
                            delay: (weekIndex * 7 + dayIndex) * 0.01 + 0.2,
                            ease: 'easeOut',
                          }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
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
                backgroundColor: '#FF6D01',
                boxShadow: '0 0 8px rgba(255, 109, 1, 0.5)',
              }}
            />
            <span>達成日</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full border-2 border-dashed"
              style={{
                borderColor: '#FF6D01',
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

