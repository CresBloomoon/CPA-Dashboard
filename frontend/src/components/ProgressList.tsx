import { StudyProgress } from '../types';

interface ProgressListProps {
  progressList: StudyProgress[];
  onEdit: (progress: StudyProgress) => void;
  onDelete: (id: number) => void;
}

export default function ProgressList({ progressList, onEdit, onDelete }: ProgressListProps) {
  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      '財務会計': 'bg-blue-100 text-blue-800',
      '管理会計': 'bg-green-100 text-green-800',
      '監査論': 'bg-purple-100 text-purple-800',
      '企業法': 'bg-yellow-100 text-yellow-800',
      '租税法': 'bg-red-100 text-red-800',
    };
    return colors[subject] || 'bg-gray-100 text-gray-800';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (progressList.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>まだ進捗が登録されていません</p>
        <p className="text-sm mt-2">「新しい進捗を追加」ボタンから追加してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {progressList.map((progress) => (
        <div
          key={progress.id}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSubjectColor(progress.subject)}`}>
                  {progress.subject}
                </span>
                <h3 className="text-xl font-bold text-gray-800">{progress.topic}</h3>
              </div>
              {progress.notes && (
                <p className="text-gray-600 text-sm mb-3">{progress.notes}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(progress)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                編集
              </button>
              <button
                onClick={() => onDelete(progress.id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                削除
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">進捗率</span>
              <span className="text-sm font-semibold text-gray-800">{progress.progress_percent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${getProgressColor(progress.progress_percent)}`}
                style={{ width: `${progress.progress_percent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>学習時間: {progress.study_hours.toFixed(1)}時間</span>
              <span>更新日: {new Date(progress.updated_at || progress.created_at).toLocaleDateString('ja-JP')}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

