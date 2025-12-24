import { useState, useEffect } from 'react';
import { StudyProgress, StudyProgressCreate, Subject } from '../types';

interface ProgressFormProps {
  progress?: StudyProgress | null;
  onSubmit: (data: StudyProgressCreate) => Promise<void>;
  onCancel: () => void;
  subjects: string[];
  subjectsWithColors?: Subject[];
}

export default function ProgressForm({ progress, onSubmit, onCancel, subjects, subjectsWithColors = [] }: ProgressFormProps) {
  // 科目名から色を取得
  const getSubjectColor = (subjectName?: string): string | undefined => {
    if (!subjectName) return undefined;
    const subject = subjectsWithColors.find(s => s.name === subjectName);
    return subject?.color;
  };
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [formData, setFormData] = useState<StudyProgressCreate>({
    subject: '',
    topic: '',
    progress_percent: 0,
    study_hours: 0,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (progress) {
      setFormData({
        subject: progress.subject,
        topic: progress.topic,
        progress_percent: progress.progress_percent,
        study_hours: progress.study_hours,
        notes: progress.notes || '',
      });
    }
  }, [progress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        subject: '',
        topic: '',
        progress_percent: 0,
        study_hours: 0,
        notes: '',
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">
        {progress ? '進捗を編集' : '新しい進捗を追加'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            科目
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
              className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center gap-2 ${
                formData.subject && getSubjectColor(formData.subject) ? 'pl-8 pr-4 py-2' : 'px-4 py-2'
              } bg-white`}
            >
              {formData.subject && getSubjectColor(formData.subject) && (
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getSubjectColor(formData.subject) || '#ccc' }}
                />
              )}
              <span className="flex-1">
                {formData.subject || '選択してください'}
              </span>
              <svg
                className={`w-4 h-4 transition-transform flex-shrink-0 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isSubjectDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsSubjectDropdownOpen(false)}
                />
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, subject: '' });
                      setIsSubjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                      !formData.subject ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="w-3 h-3 flex-shrink-0" />
                    <span>選択してください</span>
                  </button>
                  {subjects.map((subject) => {
                    const color = getSubjectColor(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, subject });
                          setIsSubjectDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                          formData.subject === subject ? 'bg-blue-50' : ''
                        }`}
                      >
                        {color ? (
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                        ) : (
                          <span className="w-3 h-3 flex-shrink-0" />
                        )}
                        <span>{subject}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            トピック名
          </label>
          <input
            type="text"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 連結財務諸表"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              進捗率 (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.progress_percent}
              onChange={(e) => setFormData({ ...formData, progress_percent: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学習時間 (時間)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={formData.study_hours}
              onChange={(e) => setFormData({ ...formData, study_hours: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メモ
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="学習メモや気づきを記録..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '保存中...' : progress ? '更新' : '追加'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}

