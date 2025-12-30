import { SubjectSummary } from '../../../api/types';

interface SubjectChartProps {
  summary: SubjectSummary[];
}

export default function SubjectChart({ summary }: SubjectChartProps) {
  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      '財務会計論': 'bg-blue-500',
      '管理会計論': 'bg-green-500',
      '企業法': 'bg-indigo-500',
      '監査論': 'bg-purple-500',
      '租税法': 'bg-red-500',
      '経営学': 'bg-amber-500',
      '経済学': 'bg-cyan-500',
      '民法': 'bg-pink-500',
      '統計学': 'bg-teal-500',
    };
    return colors[subject] || 'bg-gray-500';
  };

  const maxHours = Math.max(...summary.map(s => s.total_hours), 1);

  if (summary.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">科目別学習時間</h3>
        <p className="text-gray-500 text-center py-8">データがありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-700 mb-6">科目別学習時間</h3>
      <div className="space-y-4">
        {summary.map((item) => (
          <div key={item.subject}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded ${getSubjectColor(item.subject)}`}></div>
                <span className="font-medium text-gray-700">{item.subject}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-gray-800">{item.total_hours.toFixed(1)}時間</span>
                <span className="text-sm text-gray-500 ml-2">({item.count}件)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${getSubjectColor(item.subject)}`}
                style={{ width: `${(item.total_hours / maxHours) * 100}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              平均進捗: {item.avg_progress.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

