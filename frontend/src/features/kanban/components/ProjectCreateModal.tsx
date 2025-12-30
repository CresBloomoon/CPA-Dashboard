import { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ANIMATION_THEME } from '../../../config/appConfig';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { projectApi } from '../../../api/api';
import type { ProjectCreate } from '../../../api/types';

registerLocale('ja', ja);

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void; // プロジェクト作成後に呼ばれるコールバック（データ更新用）
}

export default function ProjectCreateModal({
  isOpen,
  onClose,
  onSubmit,
}: ProjectCreateModalProps) {
  const [projectName, setProjectName] = useState('');
  const [projectDueDate, setProjectDueDate] = useState<Date | null>(null);
  const [projectDescription, setProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);


  // フォームをリセット
  const resetForm = () => {
    setProjectName('');
    setProjectDueDate(null);
    setProjectDescription('');
  };

  // プロジェクト作成
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      return;
    }

    try {
      setIsCreating(true);
      const projectData: ProjectCreate = {
        name: projectName.trim(),
        due_date: projectDueDate ? projectDueDate.toISOString() : undefined,
        description: projectDescription.trim() || undefined,
      };

      await projectApi.create(projectData);
      // フォームをリセット
      resetForm();
      
      // 親コンポーネントのコールバックを呼び出し
      onSubmit();
      
      // モーダルを閉じる
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // モーダルを閉じる
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Escキーで閉じる（明示的なハンドラ）
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={true} onClose={handleClose} className="relative z-50">
          {/* オーバーレイ（背景クリックで閉じる） */}
          <motion.div
            className="fixed inset-0 bg-black/50"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_THEME.DURATIONS_S.FADE }}
            onClick={handleClose}
          />

          {/* モーダルコンテンツ */}
          <div className="fixed inset-0 flex items-center justify-center p-4" onClick={handleClose}>
            <Dialog.Panel
              as={motion.div}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={ANIMATION_THEME.SPRINGS.MODAL}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-700">新規プロジェクト</h3>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プロジェクト名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="例: 租税法レギュラー答練1回目"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isCreating}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  期限日
                </label>
                <DatePicker
                  selected={projectDueDate}
                  onChange={(date: Date | null) => setProjectDueDate(date)}
                  dateFormat="yyyy年MM月dd日"
                  locale="ja"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholderText="期限日を選択"
                  isClearable
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="プロジェクトの説明（任意）"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isCreating}
                />
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isCreating || !projectName.trim()}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isCreating ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
      )}
    </AnimatePresence>
  );
}

