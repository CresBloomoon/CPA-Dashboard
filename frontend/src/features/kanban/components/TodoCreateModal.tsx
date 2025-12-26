import { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ANIMATION_THEME } from '../../../config/appConfig';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale';
import { addDays, format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import { todoApi, settingsApi } from '../../../api/api';
import type { TodoCreate, Subject, ReviewTiming } from '../../../api/types';

registerLocale('ja', ja);

interface TodoCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void; // リマインダ作成後に呼ばれるコールバック（データ更新用）
  subjects: string[];
  subjectsWithColors?: Subject[];
  initialProjectId?: number | null; // プロジェクトIDを初期値として設定
}

export default function TodoCreateModal({
  isOpen,
  onClose,
  onSubmit,
  subjects,
  subjectsWithColors = [],
  initialProjectId,
}: TodoCreateModalProps) {
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoSubject, setNewTodoSubject] = useState<string>('');
  const [newTodoDueDate, setNewTodoDueDate] = useState<Date>(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [reviewTimings, setReviewTimings] = useState<ReviewTiming[]>([]);
  const [isUsingSetList, setIsUsingSetList] = useState(false);
  const [selectedSetListTiming, setSelectedSetListTiming] = useState<number | null>(null);
  const [isSetListDropdownOpen, setIsSetListDropdownOpen] = useState(false);

  // 科目名から色を取得
  const getSubjectColor = (subjectName?: string): string | undefined => {
    if (!subjectName) return undefined;
    const subject = subjectsWithColors.find(s => s.name === subjectName);
    return subject?.color;
  };

  // 復習タイミング設定を読み込む
  useEffect(() => {
    if (isOpen) {
      loadReviewTimings();
    }
  }, [isOpen, subjectsWithColors]);

  const loadReviewTimings = async () => {
    try {
      const settings = await settingsApi.getAll();
      const reviewTimingSetting = settings.find(s => s.key === 'review_timing');
      
      if (reviewTimingSetting) {
        try {
          const parsed = JSON.parse(reviewTimingSetting.value);
          if (Array.isArray(parsed)) {
            setReviewTimings(parsed as ReviewTiming[]);
          }
        } catch (error) {
          console.error('Error parsing review timings:', error);
        }
      }
    } catch (error) {
      console.error('Error loading review timings:', error);
    }
  };

  // 通知を表示

  // 復習リマインダを一括作成（セットリストから）
  const handleCreateReviewSet = async (timing: ReviewTiming, title: string) => {
    if (!timing || timing.review_days.length === 0) {
      return;
    }

    if (!title || !title.trim()) {
      return;
    }

    try {
      setIsAdding(true);
      const startDate = new Date(newTodoDueDate);
      startDate.setHours(0, 0, 0, 0);

      // 復習リマインダを作成
      const todosToCreate: TodoCreate[] = [];
      timing.review_days.forEach((day, index) => {
        const dueDate = addDays(startDate, day);
        const timezoneOffset = dueDate.getTimezoneOffset();
        const utcDate = new Date(dueDate.getTime() - timezoneOffset * 60 * 1000);
        
        todosToCreate.push({
          title: `${title.trim()}_復習${index + 1}回目`,
          subject: timing.subject_name,
          due_date: utcDate.toISOString(),
          project_id: initialProjectId !== undefined ? initialProjectId : undefined,
        });
      });

      // 一括作成
      for (const todo of todosToCreate) {
        await todoApi.create(todo);
      }

      // フォームをリセット
      setNewTodoTitle('');
      setNewTodoSubject('');
      setNewTodoDueDate(new Date());
      setIsUsingSetList(false);
      setSelectedSetListTiming(null);
      onSubmit();
      // トースト表示は不要
    } catch (error) {
      console.error('Error creating review todos:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // モーダルを閉じる
  const closeModal = () => {
    setNewTodoTitle('');
    setNewTodoSubject('');
    setNewTodoDueDate(new Date());
    setIsUsingSetList(false);
    setSelectedSetListTiming(null);
    onClose();
  };

  // Escキーで閉じる（明示的なハンドラ）
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // セットリストから生成する場合
    if (isUsingSetList && selectedSetListTiming !== null) {
      const timing = reviewTimings.find(t => t.subject_id === selectedSetListTiming);
      if (!timing) return;
      
      const title = newTodoTitle.trim();
      if (!title) {
        return;
      }
      
      await handleCreateReviewSet(timing, title);
      closeModal();
      return;
    }
    
    // 通常の単発リマインダ作成
    if (!newTodoTitle.trim() || !newTodoDueDate) {
      return;
    }

    try {
      setIsAdding(true);
      // 日付のみを扱うため、ローカル時間で00:00:00に設定
      const selectedDate = new Date(newTodoDueDate);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      const localDate = new Date(year, month, day, 0, 0, 0, 0);
      
      // タイムゾーンオフセットを考慮してUTC時間に変換
      const timezoneOffset = localDate.getTimezoneOffset();
      const utcDate = new Date(localDate.getTime() - timezoneOffset * 60 * 1000);
      
      const todoData: TodoCreate = {
        title: newTodoTitle.trim(),
        subject: newTodoSubject || undefined,
        due_date: utcDate.toISOString(),
        project_id: initialProjectId !== undefined ? initialProjectId : undefined,
      };
      
      await todoApi.create(todoData);
      onSubmit();
      closeModal();
      // トースト表示は不要
    } catch (error) {
      console.error('Error adding todo:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={true} onClose={closeModal} className="relative z-50">
          {/* オーバーレイ（背景クリックで閉じる） */}
          <motion.div
            className="fixed inset-0 bg-black/50"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_THEME.DURATIONS_S.FADE }}
            onClick={closeModal}
          />

          {/* モーダルコンテンツ */}
          <div className="fixed inset-0 flex items-center justify-center p-4" onClick={closeModal}>
            <Dialog.Panel
              as={motion.div}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] min-h-[600px] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={ANIMATION_THEME.SPRINGS.MODAL}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-700">新規リマインダ</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 新規追加フォーム */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* セットリスト使用の切り替え */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUsingSetList}
                    onChange={(e) => {
                      setIsUsingSetList(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedSetListTiming(null);
                        setNewTodoSubject('');
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">復習セットリストから一括生成</span>
                </label>
              </div>

              {isUsingSetList ? (
                /* セットリストモード */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      セットリスト
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsSetListDropdownOpen(!isSetListDropdownOpen)}
                        className={`w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                          isAdding ? 'disabled:bg-gray-100' : ''
                        }`}
                        disabled={isAdding}
                      >
                        <span className="flex items-center gap-2">
                          {selectedSetListTiming !== null && (() => {
                            const timing = reviewTimings.find(t => t.subject_id === selectedSetListTiming);
                            const currentSubject = timing ? subjectsWithColors.find(s => s.id === timing.subject_id) : null;
                            const displaySubjectName = currentSubject ? currentSubject.name : (timing ? timing.subject_name : '');
                            const color = displaySubjectName ? getSubjectColor(displaySubjectName) : undefined;
                            return color ? (
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            ) : null;
                          })()}
                          {selectedSetListTiming !== null ?
                            (() => {
                              const timing = reviewTimings.find(t => t.subject_id === selectedSetListTiming);
                              if (!timing) return '選択してください';
                              const currentSubject = subjectsWithColors.find(s => s.id === timing.subject_id);
                              const displaySubjectName = currentSubject ? currentSubject.name : timing.subject_name;
                              return `${displaySubjectName} (${timing.review_days.length}回: ${timing.review_days.map(d => `${d}日後`).join(', ')})`;
                            })()
                            : '選択してください'}
                        </span>
                        <svg className={`w-4 h-4 transition-transform ${isSetListDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isSetListDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsSetListDropdownOpen(false)}
                          />
                          <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                            <div
                              onClick={() => {
                                setSelectedSetListTiming(null);
                                setNewTodoSubject('');
                                setIsSetListDropdownOpen(false);
                              }}
                              className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                                selectedSetListTiming === null ? 'bg-blue-100' : ''
                              }`}
                            >
                              <span className="w-3 h-3" />
                              <span>選択してください</span>
                            </div>
                            {reviewTimings
                              .filter((timing) => {
                                // 現在存在する科目のみを表示
                                return subjectsWithColors.some(s => s.id === timing.subject_id);
                              })
                              .map((timing) => {
                                // subjectsWithColorsから最新の科目名を取得
                                const currentSubject = subjectsWithColors.find(s => s.id === timing.subject_id);
                                const displaySubjectName = currentSubject ? currentSubject.name : timing.subject_name;
                                const color = getSubjectColor(displaySubjectName);
                                return (
                                  <div
                                    key={timing.subject_id}
                                    onClick={() => {
                                      setSelectedSetListTiming(timing.subject_id);
                                      setNewTodoSubject(displaySubjectName);
                                      setIsSetListDropdownOpen(false);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                                      selectedSetListTiming === timing.subject_id ? 'bg-blue-100' : ''
                                    }`}
                                  >
                                    {color ? (
                                      <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: color }}
                                      />
                                    ) : (
                                      <span className="w-3 h-3" />
                                    )}
                                    <span>{displaySubjectName} ({timing.review_days.length}回: {timing.review_days.map(d => `${d}日後`).join(', ')})</span>
                                  </div>
                                );
                              })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedSetListTiming && (() => {
                    const timing = reviewTimings.find(t => t.subject_id === selectedSetListTiming);
                    if (!timing) return null;
                    return (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            タイトル
                          </label>
                          <input
                            type="text"
                            value={newTodoTitle}
                            onChange={(e) => setNewTodoTitle(e.target.value)}
                            placeholder="例: 3章"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isAdding}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            開始日
                          </label>
                          <DatePicker
                            selected={newTodoDueDate}
                            onChange={(date: Date | null) => date && setNewTodoDueDate(date)}
                            dateFormat="yyyy年MM月dd日"
                            customInput={
                              <button
                                type="button"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                disabled={isAdding}
                              >
                                {format(newTodoDueDate, 'yyyy年MM月dd日', { locale: ja })}
                              </button>
                            }
                            locale="ja"
                            calendarClassName="react-datepicker-custom"
                            showPopperArrow={false}
                          />
                        </div>

                        {newTodoTitle.trim() && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm font-medium text-blue-800 mb-2">生成されるタイトル:</div>
                            <div className="space-y-1">
                              {timing.review_days.map((day, index) => {
                                const dueDate = addDays(newTodoDueDate, day);
                                return (
                                  <div key={index} className="text-sm text-blue-700">
                                    {newTodoTitle.trim()}_復習{index + 1}回目 ({dueDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })})
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                /* 通常モード */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル
                    </label>
                    <input
                      type="text"
                      value={newTodoTitle}
                      onChange={(e) => setNewTodoTitle(e.target.value)}
                      placeholder="新しいリマインダを追加..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isAdding}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        科目（任意）
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                          className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center gap-2 ${
                            newTodoSubject && getSubjectColor(newTodoSubject) ? 'pl-8 pr-4 py-2' : 'px-4 py-2'
                          } ${isAdding ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                          disabled={isAdding}
                        >
                          {newTodoSubject && getSubjectColor(newTodoSubject) && (
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getSubjectColor(newTodoSubject) || '#ccc' }}
                            />
                          )}
                          <span className="flex-1">
                            {newTodoSubject || '選択してください'}
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
                        
                        {isSubjectDropdownOpen && !isAdding && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setIsSubjectDropdownOpen(false)}
                            />
                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewTodoSubject('');
                                  setIsSubjectDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                                  !newTodoSubject ? 'bg-blue-50' : ''
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
                                      setNewTodoSubject(subject);
                                      setIsSubjectDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                                      newTodoSubject === subject ? 'bg-blue-50' : ''
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
                        期限
                      </label>
                      <DatePicker
                        selected={newTodoDueDate}
                        onChange={(date: Date | null) => date && setNewTodoDueDate(date)}
                        dateFormat="yyyy年MM月dd日"
                        customInput={
                          <button
                            type="button"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={isAdding}
                          >
                            {format(newTodoDueDate, 'yyyy年MM月dd日', { locale: ja })}
                          </button>
                        }
                        minDate={new Date()}
                        locale="ja"
                        calendarClassName="react-datepicker-custom"
                        showPopperArrow={false}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isAdding || !newTodoTitle.trim() || !newTodoDueDate || (isUsingSetList && !selectedSetListTiming)}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isAdding ? (isUsingSetList ? '作成中...' : '追加中...') : (isUsingSetList ? '一括生成' : '作成')}
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

