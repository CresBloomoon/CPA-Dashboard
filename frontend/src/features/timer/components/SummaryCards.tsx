import { useMemo } from 'react';
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
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO } from 'date-fns';
import type { StudyProgress, Subject } from '../../../api/types';
import { SUBJECT_COLOR_FALLBACK } from '../../../config/subjects';
import { getSubjectColor as resolveSubjectColor } from '../../../utils/todoHelpers';
import CompactStreakCalendar from '../../calendar/components/CompactStreakCalendar';

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
  subjectsWithColors?: Subject[];
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
  subjectsWithColors = []
}: SummaryCardsProps) {
  // 科目名から色を取得する関数
  const getSubjectColor = (subjectName: string): string => {
    return resolveSubjectColor(subjectName, subjectsWithColors, SUBJECT_COLOR_FALLBACK) || SUBJECT_COLOR_FALLBACK;
  };

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
    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">1週間の学習時間</h3>
        
        {/* 今日と今月のサマリー */}
        <div className="flex gap-6 mb-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">今日</p>
            <p className="text-2xl font-bold text-gray-800">{todayHours.toFixed(1)} 時間</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">今週</p>
            <p className="text-2xl font-bold text-gray-800">{thisWeekHours.toFixed(1)} 時間</p>
          </div>
        </div>

        {/* 棒グラフ */}
        <div className="h-64">
          <Bar data={chartData} options={options} />
        </div>
      </div>

      <div className="md:col-span-1 bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">リマインダ</h3>
            <div className="space-y-4">
              <div 
                className={`flex items-center justify-between pb-3 border-b border-gray-200 ${
                  onTodayDueClick 
                    ? 'cursor-pointer hover:bg-orange-50 rounded-lg p-2 -m-2 transition-colors' 
                    : ''
                }`}
                onClick={onTodayDueClick}
              >
                <div>
                  <p className="text-gray-600 text-sm mb-1">今日が期限</p>
                  <p className="text-2xl font-bold text-gray-800">{todayDueTodos}</p>
                  <p className="text-gray-500 text-xs mt-1">件</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              
              <div 
                className={`flex items-center justify-between pb-3 border-b border-gray-200 ${
                  onTotalTodosClick 
                    ? 'cursor-pointer hover:bg-purple-50 rounded-lg p-2 -m-2 transition-colors' 
                    : ''
                }`}
                onClick={onTotalTodosClick}
              >
                <div>
                  <p className="text-gray-600 text-sm mb-1">総リマインダ数</p>
                  <p className="text-2xl font-bold text-gray-800">{totalTodos}</p>
                  <p className="text-gray-500 text-xs mt-1">件</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              
              <div 
                className={`flex items-center justify-between ${
                  onCompletedTodosClick 
                    ? 'cursor-pointer hover:bg-green-50 rounded-lg p-2 -m-2 transition-colors' 
                    : ''
                }`}
                onClick={onCompletedTodosClick}
              >
                <div>
                  <p className="text-gray-600 text-sm mb-1">完了リマインダ数</p>
                  <p className="text-2xl font-bold text-gray-800">{completedTodos}</p>
                  <p className="text-gray-500 text-xs mt-1">件</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

