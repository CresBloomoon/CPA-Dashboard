import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import type { DashboardSummaryResponse, Subject, Todo } from '../../../api/types';
import { SUBJECT_COLOR_FALLBACK } from '../../../config/subjects';
import { getSubjectColor as resolveSubjectColor } from '../../../utils/todoHelpers';
import { toLocalDateKey, toLocalDateKeyFromApi } from '../../../utils/dateKey';
import CompactStreakCalendar from '../../calendar/components/CompactStreakCalendar';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';
import { useAccentMode } from '../../../contexts/AccentModeContext';
import { useTimer } from '../hooks/TimerContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SummaryCardsProps {
  totalHours: number;
  totalTodos: number;
  completedTodos: number;
  todayDueTodos: number;
  onTodayDueClick?: () => void;
  onTotalTodosClick?: () => void;
  onCompletedTodosClick?: () => void;
  dashboardSummary?: DashboardSummaryResponse | null;
  todos?: Todo[];
  subjectsWithColors?: Subject[];
  reportStartDay?: number;
}

export default function SummaryCards({ 
  totalHours, 
  totalTodos, 
  completedTodos, 
  todayDueTodos, 
  onTodayDueClick,
  onTotalTodosClick,
  onCompletedTodosClick,
  dashboardSummary = null,
  todos = [],
  subjectsWithColors = []
  ,
  reportStartDay = 1
}: SummaryCardsProps) {
  // 「今日」が日付跨ぎでも更新されるように、定期的にnowを更新（軽量：1分間隔）
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const { setAccentMode } = useAccentMode();
  const { unsyncedTodayMs, studyTimeServerSummary } = useTimer();

  // 科目名から色を取得する関数
  const getSubjectColor = (subjectName: string): string => {
    return resolveSubjectColor(subjectName, subjectsWithColors, SUBJECT_COLOR_FALLBACK) || SUBJECT_COLOR_FALLBACK;
  };

  // NOTE: 財務報告の導線は右上のフローティング通知へ移動（SummaryCardsからは撤去）

  // 1週間分のデータを集計
  const chartData = useMemo(() => {
    const today = now;
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 月曜日から
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // 英語の曜日略語マッピング（getDay()の0(日)〜6(土)に対応）
    const dayAbbreviations = ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.'];
    
    // /api/summary の week_daily（date_key基準）を使って日別合計の棒グラフを描画
    const weekDailyMap = new Map<string, number>(
      (dashboardSummary?.week_daily ?? []).map((d) => [d.date_key, Number(d.hours || 0)])
    );

    const labels = days.map((day) => {
      const dayOfWeek = day.getDay();
      return dayAbbreviations[dayOfWeek];
    });
    const values = days.map((day) => {
      const key = toLocalDateKey(day);
      return weekDailyMap.get(key) ?? 0;
    });

    const barColor = colors.accent;
    const datasets = [
      {
        label: '学習時間',
        data: values,
        backgroundColor: barColor,
        borderRadius: 4,
        borderSkipped: false,
      },
    ];

    return {
      labels,
      datasets,
    };
  }, [dashboardSummary, now, colors.accent]);

  // 今日と今週の学習時間を計算（JSTで日付を比較）
  const todayHours = useMemo(() => {
    const today = now;
    const todayKey = toLocalDateKey(today);
    const fromSummary = dashboardSummary?.date_key === todayKey ? Number(dashboardSummary.today_hours || 0) : 0;
    const fromServerFallback =
      fromSummary === 0 && studyTimeServerSummary?.dateKey === todayKey
        ? studyTimeServerSummary.todayTotalMs / 3_600_000
        : fromSummary;
    return fromServerFallback + (unsyncedTodayMs / 3_600_000);
  }, [dashboardSummary, now, studyTimeServerSummary, unsyncedTodayMs]);

  const thisWeekHours = useMemo(() => {
    const today = now;
    const todayKey = toLocalDateKey(today);
    const fromSummary = dashboardSummary?.date_key === todayKey ? Number(dashboardSummary.week_hours || 0) : 0;
    const fromServerFallback =
      fromSummary === 0 && studyTimeServerSummary?.dateKey === todayKey
        ? studyTimeServerSummary.weekTotalMs / 3_600_000
        : fromSummary;
    return fromServerFallback + (unsyncedTodayMs / 3_600_000);
  }, [dashboardSummary, now, studyTimeServerSummary, unsyncedTodayMs]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // 凡例を非表示
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}時間`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左側: 1週間の学習時間グラフ */}
      <div 
        className="lg:col-span-2 rounded-lg shadow-lg p-6"
        style={{
          backgroundColor: theme === 'modern' ? 'rgba(30, 41, 59, 0.5)' : colors.card,
          backdropFilter: theme === 'modern' ? 'blur(12px)' : 'none',
          border: theme === 'modern' ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}`,
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: colors.textPrimary }}
        >
          1週間の学習時間
        </h3>
        
        {/* 今日と今月のサマリー */}
        <div className="flex gap-6 mb-6">
          <div>
            <p 
              className="text-sm mb-1"
              style={{ color: colors.textSecondary }}
            >
              今日
            </p>
            <p 
              className="text-2xl font-bold"
              style={{ color: colors.textPrimary }}
            >
              {todayHours.toFixed(1)} 時間
            </p>
          </div>
          <div>
            <p 
              className="text-sm mb-1"
              style={{ color: colors.textSecondary }}
            >
              今週
            </p>
            <p 
              className="text-2xl font-bold"
              style={{ color: colors.textPrimary }}
            >
              {thisWeekHours.toFixed(1)} 時間
            </p>
          </div>
        </div>

        {/* 棒グラフ */}
        <div className="h-64">
          <Bar data={chartData} options={options} />
        </div>
      </div>

      {/* 右側: リマインダとストリークカレンダー */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        {/* リマインダカード */}
        <div 
          className="rounded-lg shadow-lg p-6"
          style={{
            backgroundColor: theme === 'modern' ? 'rgba(30, 41, 59, 0.5)' : colors.card,
            backdropFilter: theme === 'modern' ? 'blur(12px)' : 'none',
            border: theme === 'modern' ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}`,
          }}
        >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: colors.textPrimary }}
            >
              リマインダ
            </h3>
            <div className="space-y-4">
              <div 
                className={`flex items-center justify-between pb-3 ${
                  onTodayDueClick 
                    ? 'cursor-pointer rounded-lg p-2 -m-2 transition-colors' 
                    : ''
                }`}
                style={{
                  borderBottom: `1px solid ${colors.border}`,
                }}
                onClick={onTodayDueClick}
                onMouseEnter={(e) => {
                  if (onTodayDueClick) {
                    e.currentTarget.style.backgroundColor = colors.cardHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (onTodayDueClick) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div>
                  <p 
                    className="text-sm mb-1"
                    style={{ color: colors.textSecondary }}
                  >
                    今日が期限
                  </p>
                  <p 
                    className="text-2xl font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    {todayDueTodos}
                  </p>
                  <p 
                    className="text-xs mt-1"
                    style={{ color: colors.textTertiary }}
                  >
                    件
                  </p>
                </div>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: theme === 'modern' ? 'rgba(249, 115, 22, 0.2)' : '#fed7aa',
                  }}
                >
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: theme === 'modern' ? '#fb923c' : '#f97316' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              
              <div 
                className={`flex items-center justify-between pb-3 ${
                  onTotalTodosClick 
                    ? 'cursor-pointer rounded-lg p-2 -m-2 transition-colors' 
                    : ''
                }`}
                style={{
                  borderBottom: `1px solid ${colors.border}`,
                }}
                onClick={onTotalTodosClick}
                onMouseEnter={(e) => {
                  if (onTotalTodosClick) {
                    e.currentTarget.style.backgroundColor = colors.cardHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (onTotalTodosClick) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div>
                  <p 
                    className="text-sm mb-1"
                    style={{ color: colors.textSecondary }}
                  >
                    総リマインダ数
                  </p>
                  <p 
                    className="text-2xl font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    {totalTodos}
                  </p>
                  <p 
                    className="text-xs mt-1"
                    style={{ color: colors.textTertiary }}
                  >
                    件
                  </p>
                </div>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: theme === 'modern' ? 'rgba(168, 85, 247, 0.2)' : '#e9d5ff',
                  }}
                >
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: theme === 'modern' ? '#a855f7' : '#9333ea' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              
              <div 
                className={`flex items-center justify-between ${
                  onCompletedTodosClick 
                    ? 'cursor-pointer rounded-lg p-2 -m-2 transition-colors' 
                    : ''
                }`}
                onClick={onCompletedTodosClick}
                onMouseEnter={(e) => {
                  if (onCompletedTodosClick) {
                    e.currentTarget.style.backgroundColor = colors.cardHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (onCompletedTodosClick) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div>
                  <p 
                    className="text-sm mb-1"
                    style={{ color: colors.textSecondary }}
                  >
                    完了リマインダ数
                  </p>
                  <p 
                    className="text-2xl font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    {completedTodos}
                  </p>
                  <p 
                    className="text-xs mt-1"
                    style={{ color: colors.textTertiary }}
                  >
                    件
                  </p>
                </div>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: theme === 'modern' ? 'rgba(34, 197, 94, 0.2)' : '#bbf7d0',
                  }}
                >
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: theme === 'modern' ? '#22c55e' : '#16a34a' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* ストリークカレンダーカード */}
        <div 
          className="rounded-lg shadow-lg p-4"
          style={{
            backgroundColor: theme === 'modern' ? 'rgba(30, 41, 59, 0.5)' : colors.card,
            backdropFilter: theme === 'modern' ? 'blur(12px)' : 'none',
            border: theme === 'modern' ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}`,
          }}
        >
          <CompactStreakCalendar
            achievedDateKeys={dashboardSummary?.streak?.active_dates ?? []}
            hoursByDateKey={dashboardSummary?.streak?.active_hours_by_date ?? {}}
            compact={false}
          />
        </div>
      </div>

    </div>
  );
}

