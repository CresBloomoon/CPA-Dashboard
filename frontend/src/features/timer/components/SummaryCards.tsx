import { useMemo, useState } from 'react';
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
import { addDays, endOfDay, format, parseISO, startOfDay, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import type { StudyProgress, Subject, Todo } from '../../../api/types';
import { SUBJECT_COLOR_FALLBACK } from '../../../config/subjects';
import { getSubjectColor as resolveSubjectColor } from '../../../utils/todoHelpers';
import CompactStreakCalendar from '../../calendar/components/CompactStreakCalendar';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';
import ReportWizard from '../../report/components/ReportWizard';

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
  progressList?: StudyProgress[];
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
  progressList = [],
  todos = [],
  subjectsWithColors = []
  ,
  reportStartDay = 1
}: SummaryCardsProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardToast, setWizardToast] = useState<string | null>(null);

  // 科目名から色を取得する関数
  const getSubjectColor = (subjectName: string): string => {
    return resolveSubjectColor(subjectName, subjectsWithColors, SUBJECT_COLOR_FALLBACK) || SUBJECT_COLOR_FALLBACK;
  };

  const shouldShowWizardEntry = useMemo(() => {
    const dow = new Date().getDay(); // 0=Sun..6=Sat
    const start = Math.max(0, Math.min(6, Math.floor(reportStartDay)));
    const grace = (start + 1) % 7;
    return dow === start || dow === grace;
  }, [reportStartDay]);

  const reportPeriod = useMemo(() => {
    // 報告日は reportStartDay（または翌日の猶予）とし、報告内容は「前週（7日）」を対象にする
    const now = new Date();
    const start = Math.max(0, Math.min(6, Math.floor(reportStartDay)));
    const grace = (start + 1) % 7;
    const todayDow = now.getDay();
    const reportDay = todayDow === start ? now : (todayDow === grace ? subDays(now, 1) : now);
    const periodEnd = endOfDay(subDays(reportDay, 1));
    const periodStart = startOfDay(subDays(periodEnd, 6));
    const periodId = `${format(periodStart, 'yyyy-MM-dd')}__${format(periodEnd, 'yyyy-MM-dd')}`;
    return { periodStart, periodEnd, periodId };
  }, [reportStartDay]);

  const isReported = useMemo(() => {
    const last = localStorage.getItem('reportWizard:lastReportedPeriodId');
    return last === reportPeriod.periodId;
  }, [reportPeriod.periodId]);

  // 1週間分のデータを集計
  const chartData = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 月曜日から
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // 英語の曜日略語マッピング（getDay()の0(日)〜6(土)に対応）
    const dayAbbreviations = ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.'];
    
    // 各日のデータを初期化（daysは[月, 火, 水, 木, 金, 土, 日]の順）
    const dailyData = days.map(day => {
      const dayOfWeek = day.getDay(); // 0 (Sunday) から 6 (Saturday)
      const dayLabel = dayAbbreviations[dayOfWeek];
      return {
        label: dayLabel,
        dateObj: day,
        dateKey: format(day, 'yyyy-MM-dd'), // デバッグと比較用に事前計算
        subjects: {} as Record<string, number>,
        total: 0
      };
    });

    // 進捗データを日付ごとに集計（JSTで日付を比較）
    progressList.forEach(progress => {
      // parseISOを使用してタイムゾーン情報を考慮してパース
      // その後、formatでローカルタイムゾーンの日付としてフォーマット
      const progressDate = parseISO(progress.created_at);
      // ローカルタイムゾーン（JST）の日付（yyyy-MM-dd）を取得して比較
      const progressDateKey = format(progressDate, 'yyyy-MM-dd');
      // dateKeyで直接検索（事前計算済み）
      const dayIndex = dailyData.findIndex(d => d.dateKey === progressDateKey);
      
      if (dayIndex >= 0) {
        const subject = progress.subject;
        if (!dailyData[dayIndex].subjects[subject]) {
          dailyData[dayIndex].subjects[subject] = 0;
        }
        dailyData[dayIndex].subjects[subject] += progress.study_hours;
        dailyData[dayIndex].total += progress.study_hours;
      }
    });

    // 科目リストに含まれる科目のみを取得
    const validSubjects = subjectsWithColors.map(s => s.name);
    const allSubjects = Array.from(new Set(progressList.map(p => p.subject)))
      .filter(subject => validSubjects.includes(subject));

    // ラベル（曜日）を取得 - dailyDataの順序のまま（[Mon., Tue., ..., Sun.]）
    const labels = dailyData.map(day => day.label);

    // 各科目のデータセットを作成 - dailyDataの順序のまま
    const datasets = allSubjects.map(subject => ({
      label: subject,
      data: dailyData.map(day => day.subjects[subject] || 0),
      backgroundColor: getSubjectColor(subject),
      borderRadius: 4, // 角を丸くする
      borderSkipped: false, // すべての角を丸くする
    }));

    return {
      labels,
      datasets,
    };
  }, [progressList, subjectsWithColors]);

  // 今日と今週の学習時間を計算（JSTで日付を比較）
  const todayHours = useMemo(() => {
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');
    return progressList
      .filter(p => {
        const progressDateKey = format(parseISO(p.created_at), 'yyyy-MM-dd');
        return progressDateKey === todayKey;
      })
      .reduce((sum, p) => sum + p.study_hours, 0);
  }, [progressList]);

  const thisWeekHours = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 月曜日から
    const weekStartKey = format(weekStart, 'yyyy-MM-dd');
    const todayKey = format(today, 'yyyy-MM-dd');
    return progressList
      .filter(p => {
        const progressDateKey = format(parseISO(p.created_at), 'yyyy-MM-dd');
        return progressDateKey >= weekStartKey && progressDateKey <= todayKey;
      })
      .reduce((sum, p) => sum + p.study_hours, 0);
  }, [progressList]);

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
        {/* 監査報告書ウィザード（報告日だけ表示） */}
        {shouldShowWizardEntry && (
          <div
            className="rounded-lg shadow-lg p-6"
            style={{
              backgroundColor: theme === 'modern' ? 'rgba(30, 41, 59, 0.5)' : colors.card,
              backdropFilter: theme === 'modern' ? 'blur(12px)' : 'none',
              border: theme === 'modern' ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}`,
            }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
              監査報告書ウィザード
            </h3>
            <p className="text-xs mb-4" style={{ color: colors.textSecondary }}>
              対象期間: {format(reportPeriod.periodStart, 'M/d')}〜{format(reportPeriod.periodEnd, 'M/d')}
            </p>
            <button
              type="button"
              disabled={isReported}
              onClick={() => setIsWizardOpen(true)}
              className="w-full px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isReported ? colors.buttonDisabled : colors.accent,
                color: colors.textInverse,
              }}
              onMouseEnter={(e) => {
                if (!isReported) e.currentTarget.style.backgroundColor = colors.accentHover;
              }}
              onMouseLeave={(e) => {
                if (!isReported) e.currentTarget.style.backgroundColor = colors.accent;
              }}
            >
              {isReported ? '報告済み' : 'ウィザードを開始'}
            </button>
          </div>
        )}

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
          <CompactStreakCalendar progressList={progressList} compact={false} />
        </div>
      </div>

      {/* ウィザードモーダル */}
      {isWizardOpen && (
        <ReportWizard
          reportStartDay={reportStartDay}
          periodStart={reportPeriod.periodStart}
          periodEnd={reportPeriod.periodEnd}
          progressList={progressList}
          todos={todos}
          subjectsWithColors={subjectsWithColors}
          onClose={() => setIsWizardOpen(false)}
          onCopied={(periodId) => {
            localStorage.setItem('reportWizard:lastReportedPeriodId', periodId);
            setWizardToast('クリップボードにコピーしました');
            setIsWizardOpen(false);
            window.setTimeout(() => setWizardToast(null), 1500);
          }}
        />
      )}

      {/* トースト通知（コピー成功） */}
      {wizardToast && (
        <div
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300"
          style={{ backgroundColor: theme === 'modern' ? 'rgba(34, 197, 94, 0.85)' : '#22c55e', color: '#fff' }}
        >
          {wizardToast}
        </div>
      )}
    </div>
  );
}

