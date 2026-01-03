import { useEffect, useState } from 'react';
import type { FormEvent, MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ANIMATION_THEME } from '../../../config/appConfig';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale';
import { addDays, format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import { todoApi, settingsApi, reviewSetApi } from '../../../api/api';
import type { TodoCreate, Subject, ReviewTiming, ReviewSetList } from '../../../api/types';
import { SUBJECT_COLOR_FALLBACK } from '../../../config/subjects';
import { getSubjectColor as resolveSubjectColor } from '../../../utils/todoHelpers';
import { InfoTip } from '../../../components/ui/InfoTip';

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
  const [reviewSetLists, setReviewSetLists] = useState<ReviewSetList[]>([]);
  const [selectedReviewSetListId, setSelectedReviewSetListId] = useState<number | null>(null);
  const [reviewSetLoadError, setReviewSetLoadError] = useState(false);
  const [useLegacyReviewSets, setUseLegacyReviewSets] = useState(true);

  const loadUseLegacyReviewSets = async (): Promise<boolean> => {
    try {
      const s = await settingsApi.getByKey('use_legacy_review_sets');
      const raw = (s?.value ?? '').trim().toLowerCase();
      const next = raw === '' ? true : (raw === 'true' || raw === '1' || raw === 'yes');
      setUseLegacyReviewSets(next);
      return next;
    } catch {
      // 既存ユーザ保護: 未設定/取得失敗は true 扱い
      setUseLegacyReviewSets(true);
      return true;
    }
  };

  const TITLE_RANGE_REGEX_GLOBAL = /\{(\d+)-(\d+)\}/g;
  const MAX_BULK_CREATE_COUNT = 50;

  const popperToBody = ({ children }: { children: ReactNode }) => {
    return createPortal(children, document.body);
  };

  const getTitleExpansionInfo = (titleRaw: string) => {
    const title = titleRaw.trim();
    const matches = Array.from(title.matchAll(TITLE_RANGE_REGEX_GLOBAL));

    if (matches.length === 0) {
      return {
        hasExpansion: false as const,
        isValid: true as const,
        count: 1,
        titles: [title],
        errorMessage: null as string | null,
      };
    }

    const ranges = matches.map((m) => {
      const start = Number(m[1]);
      const end = Number(m[2]);
      const raw = m[0];
      const index = m.index ?? -1;
      return { start, end, raw, index };
    });

    for (const r of ranges) {
      if (!Number.isFinite(r.start) || !Number.isFinite(r.end) || r.index < 0) {
        return {
          hasExpansion: true as const,
          isValid: false as const,
          count: 0,
          titles: [] as string[],
          errorMessage: '範囲指定の形式が不正です。',
        };
      }
      if (r.end < r.start) {
        return {
          hasExpansion: true as const,
          isValid: false as const,
          count: 0,
          titles: [] as string[],
          errorMessage: '範囲指定は {開始-終了} の順で入力してください。',
        };
      }
    }

    // 生成件数（直積）を計算。上限超過は早期に検知する
    let count = 1;
    for (const r of ranges) {
      const rangeCount = r.end - r.start + 1;
      count *= rangeCount;
      if (count > MAX_BULK_CREATE_COUNT) break;
    }

    if (count > MAX_BULK_CREATE_COUNT) {
      return {
        hasExpansion: true as const,
        isValid: false as const,
        count,
        titles: [] as string[],
        errorMessage: '生成件数が多すぎます',
      };
    }

    // parts: rangeの前後の固定文字列を分割
    const parts: string[] = [];
    let cursor = 0;
    for (const r of ranges) {
      parts.push(title.slice(cursor, r.index));
      cursor = r.index + r.raw.length;
    }
    parts.push(title.slice(cursor));

    const titles: string[] = [];
    const build = (rangeIdx: number, acc: string) => {
      if (rangeIdx >= ranges.length) {
        titles.push(acc + parts[rangeIdx]);
        return;
      }
      const r = ranges[rangeIdx];
      for (let v = r.start; v <= r.end; v++) {
        build(rangeIdx + 1, acc + parts[rangeIdx] + String(v));
      }
    };
    build(0, '');

    return {
      hasExpansion: true as const,
      isValid: true as const,
      count: titles.length,
      titles,
      errorMessage: null as string | null,
    };
  };

  const titleExpansionInfo = getTitleExpansionInfo(newTodoTitle);

  // 科目名から色を取得（未定義ならグレーにフォールバック）
  const getSubjectColor = (subjectName?: string): string | undefined =>
    resolveSubjectColor(subjectName, subjectsWithColors, SUBJECT_COLOR_FALLBACK);

  // 復習タイミング設定を読み込む
  useEffect(() => {
    if (isOpen) {
      loadReviewTimings();
      loadReviewSetLists();
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

  const loadReviewSetLists = async () => {
    try {
      setReviewSetLoadError(false);
      const allowLegacy = await loadUseLegacyReviewSets();
      const lists = await reviewSetApi.getAll();
      setReviewSetLists(lists);
    } catch (error) {
      console.error('Error loading review set lists:', error);
      // 後方互換: 旧へフォールバックするかは use_legacy_review_sets で制御
      const allowLegacy = await loadUseLegacyReviewSets();
      setReviewSetLoadError(allowLegacy);
      setReviewSetLists([]);
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
    setSelectedReviewSetListId(null);
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
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // セットリストから生成する場合
    if (isUsingSetList) {
      const title = newTodoTitle.trim();
      if (!title) return;

      // 新API（推奨）
      if (!reviewSetLoadError) {
        if (selectedReviewSetListId === null) return;
        if (!newTodoSubject.trim()) return;
        try {
          setIsAdding(true);
          const startDate = new Date(newTodoDueDate);
          startDate.setHours(0, 0, 0, 0);
          const timezoneOffset = startDate.getTimezoneOffset();
          const utcDate = new Date(startDate.getTime() - timezoneOffset * 60 * 1000);

          await reviewSetApi.generate({
            set_list_id: selectedReviewSetListId,
            subject: newTodoSubject.trim(),
            base_title: title,
            start_date: utcDate.toISOString(),
            project_id: initialProjectId !== undefined ? initialProjectId : undefined,
          });

          onSubmit();
          closeModal();
        } catch (error) {
          console.error('Error generating review set todos:', error);
        } finally {
          setIsAdding(false);
        }
        return;
      }

      // 旧フォールバック（use_legacy_review_sets=true かつ API失敗時のみ）
      if (useLegacyReviewSets && selectedSetListTiming !== null) {
        const timing = reviewTimings.find(t => t.subject_id === selectedSetListTiming);
        if (!timing) return;
        await handleCreateReviewSet(timing, title);
        closeModal();
        return;
      }
      return;
    }
    
    // 通常の単発リマインダ作成
    if (!newTodoTitle.trim() || !newTodoDueDate) {
      return;
    }

    // タイトルに範囲指定がある場合は一括生成（最大50件・複数箇所の直積にも対応）
    const expansionInfo = getTitleExpansionInfo(newTodoTitle);
    if (expansionInfo.hasExpansion && !expansionInfo.isValid) {
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
      
      if (expansionInfo.hasExpansion) {
        for (const expandedTitle of expansionInfo.titles) {
          const todoData: TodoCreate = {
            title: expandedTitle,
            subject: newTodoSubject || undefined,
            due_date: utcDate.toISOString(),
            project_id: initialProjectId !== undefined ? initialProjectId : undefined,
          };
          await todoApi.create(todoData);
        }
      } else {
      const todoData: TodoCreate = {
          title: expansionInfo.titles[0] ?? newTodoTitle.trim(),
        subject: newTodoSubject || undefined,
        due_date: utcDate.toISOString(),
        project_id: initialProjectId !== undefined ? initialProjectId : undefined,
      };
        await todoApi.create(todoData);
      }
      
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
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_THEME.DURATIONS_S.FADE }}
            onClick={closeModal}
          />

          {/* モーダルコンテンツ */}
          <div className="fixed inset-0 overflow-y-auto" onClick={closeModal}>
            <div className="min-h-screen flex items-center justify-center p-4">
            <Dialog.Panel
              as={motion.div}
              className="max-w-2xl w-full min-h-[560px] overflow-visible rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/20 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: ANIMATION_THEME.DURATIONS_S.FADE, ease: 'easeOut' }}
              onClick={(e: MouseEvent) => e.stopPropagation()}
            >
              <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-100">新規リマインダ</h3>
            </div>

            {/* 新規追加フォーム */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* セットリスト使用の切り替え */}
              <div className="mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUsingSetList}
                    onChange={(e) => {
                      setIsUsingSetList(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedSetListTiming(null);
                        setSelectedReviewSetListId(null);
                        setNewTodoSubject('');
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-200/90">復習セットリストから一括生成</span>
                </label>
              </div>

              {isUsingSetList ? (
                /* セットリストモード */
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-200/90 mb-2">
                      セットリスト（必須）
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsSetListDropdownOpen(!isSetListDropdownOpen)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl ring-1 ring-white/20 bg-white/5 backdrop-blur-md text-slate-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 ${
                          isAdding ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'
                        }`}
                        disabled={isAdding}
                      >
                        <span className="flex-1 text-left">
                          {!reviewSetLoadError ? (
                            selectedReviewSetListId !== null
                              ? (() => {
                                  const selected = reviewSetLists.find((s) => s.id === selectedReviewSetListId);
                                  if (!selected) return '選択してください';
                                  const offsets = (selected.items || []).map((i) => `${i.offset_days}日後`).join(', ');
                                  return `${selected.name} (${selected.items.length}回: ${offsets})`;
                                })()
                              : '選択してください'
                          ) : (
                            selectedSetListTiming !== null
                              ? (() => {
                                  const timing = reviewTimings.find(t => t.subject_id === selectedSetListTiming);
                                  if (!timing) return '選択してください';
                                  const currentSubject = subjectsWithColors.find(s => s.id === timing.subject_id);
                                  const displaySubjectName = currentSubject ? currentSubject.name : timing.subject_name;
                                  return `${displaySubjectName}（旧） (${timing.review_days.length}回: ${timing.review_days.map(d => `${d}日後`).join(', ')})`;
                                })()
                              : '選択してください'
                          )}
                        </span>
                        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${isSetListDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isSetListDropdownOpen && !isAdding && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsSetListDropdownOpen(false)} />
                          <div className="absolute z-30 w-full mt-2 bg-slate-900/60 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl max-h-80 overflow-y-auto ring-1 ring-sky-200/15">
                            <div
                              onClick={() => {
                                setSelectedReviewSetListId(null);
                                setSelectedSetListTiming(null);
                                setIsSetListDropdownOpen(false);
                              }}
                              className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-white/10 text-slate-200/90 ${
                                selectedReviewSetListId === null && selectedSetListTiming === null ? 'bg-white/10' : ''
                              }`}
                            >
                              <span className="w-3 h-3" />
                              <span>選択してください</span>
                            </div>

                            {!reviewSetLoadError ? (
                              reviewSetLists.map((s) => (
                                <div
                                  key={s.id}
                                  onClick={() => {
                                    setSelectedReviewSetListId(s.id);
                                    setIsSetListDropdownOpen(false);
                                  }}
                                  className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-white/10 text-slate-200/90 ${
                                    selectedReviewSetListId === s.id ? 'bg-white/10' : ''
                                  }`}
                                >
                                  <span className="w-3 h-3 rounded-full bg-sky-400/60" />
                                  <span>{s.name} ({s.items.length}回)</span>
                                </div>
                              ))
                            ) : (
                              reviewTimings
                                .filter((timing) => subjectsWithColors.some(s => s.id === timing.subject_id))
                                .map((timing) => {
                                  const currentSubject = subjectsWithColors.find(s => s.id === timing.subject_id);
                                  const displaySubjectName = currentSubject ? currentSubject.name : timing.subject_name;
                                  const color = getSubjectColor(displaySubjectName);
                                  return (
                                    <div
                                      key={timing.subject_id}
                                      onClick={() => {
                                        setSelectedSetListTiming(timing.subject_id);
                                        setIsSetListDropdownOpen(false);
                                      }}
                                      className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-white/10 text-slate-200/90 ${
                                        selectedSetListTiming === timing.subject_id ? 'bg-white/10' : ''
                                      }`}
                                    >
                                      {color ? (
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                      ) : (
                                        <span className="w-3 h-3" />
                                      )}
                                      <span>{displaySubjectName}（旧） ({timing.review_days.length}回)</span>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {((!reviewSetLoadError && selectedReviewSetListId !== null) || (reviewSetLoadError && selectedSetListTiming !== null)) && (() => {
                    const timing = reviewSetLoadError
                      ? reviewTimings.find(t => t.subject_id === selectedSetListTiming!)
                      : null;
                    const selectedList = !reviewSetLoadError
                      ? reviewSetLists.find((s) => s.id === selectedReviewSetListId!)
                      : null;
                    if (reviewSetLoadError && !timing) return null;
                    if (!reviewSetLoadError && !selectedList) return null;
                    return (
                      <>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-200/90 mb-2">
                            <span>タイトル</span>
                            <InfoTip content="{1-10}のように入力すると、数字の部分を自動で展開して一括生成します。複数箇所（例: 3-{1-3}-{1-5}）の展開も可能です。" />
                          </label>
                          <input
                            type="text"
                            value={newTodoTitle}
                            onChange={(e) => setNewTodoTitle(e.target.value)}
                            placeholder="例: 3章"
                            className="w-full px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md text-slate-100 placeholder:text-slate-300/60 ring-1 ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
                            disabled={isAdding}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-200/90 mb-2">
                            開始日
                          </label>
                          <DatePicker
                            selected={newTodoDueDate}
                            onChange={(date: Date | null) => date && setNewTodoDueDate(date)}
                            dateFormat="yyyy年MM月dd日"
                            popperPlacement="bottom-start"
                            portalId="root"
                            popperContainer={popperToBody}
                            popperClassName="datepicker-glass-popper"
                            customInput={
                              <button
                                type="button"
                                className="w-full px-4 py-3 rounded-2xl text-left bg-white/5 backdrop-blur-md text-slate-100 ring-1 ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isAdding}
                              >
                                {format(newTodoDueDate, 'yyyy年MM月dd日', { locale: ja })}
                              </button>
                            }
                            locale="ja"
                            calendarClassName="react-datepicker-custom react-datepicker-glass"
                            showPopperArrow={false}
                          />
                        </div>

                        {newTodoTitle.trim() && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm font-medium text-blue-800 mb-2">生成されるタイトル:</div>
                            <div className="space-y-1">
                              {(!reviewSetLoadError ? selectedList!.items.map((i) => i.offset_days) : timing!.review_days).map((day, index) => {
                                const dueDate = addDays(newTodoDueDate, day as number);
                                return (
                                  <div key={index} className="text-sm text-blue-700">
                                    {newTodoTitle.trim()}_復習{index + 1}回目 ({dueDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })})
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 科目（必須） */}
                        <div>
                          <label className="block text-sm font-medium text-slate-200/90 mb-2">
                            科目（必須）
                          </label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => subjects.length > 0 && setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                              className={`w-full rounded-2xl text-left flex items-center gap-2 ring-1 ring-white/20 bg-white/5 backdrop-blur-md text-slate-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 ${
                                newTodoSubject && getSubjectColor(newTodoSubject) ? 'pl-8 pr-4 py-3' : 'px-4 py-3'
                              } ${isAdding || subjects.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                              disabled={isAdding || subjects.length === 0}
                            >
                              {newTodoSubject && (
                                <span
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: getSubjectColor(newTodoSubject) }}
                                />
                              )}
                              <span className="flex-1">
                                {subjects.length === 0 ? '科目が未登録です' : (newTodoSubject ? newTodoSubject : '選択してください')}
                              </span>
                              {subjects.length > 0 && (
                                <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </button>

                            {isSubjectDropdownOpen && !isAdding && subjects.length > 0 && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsSubjectDropdownOpen(false)} />
                                <div className="absolute z-30 w-full mt-2 bg-slate-900/60 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl max-h-80 overflow-y-auto ring-1 ring-sky-200/15">
                                  <div
                                    onClick={() => {
                                      setNewTodoSubject('');
                                      setIsSubjectDropdownOpen(false);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-white/10 text-slate-200/90 ${
                                      newTodoSubject === '' ? 'bg-white/10' : ''
                                    }`}
                                  >
                                    <span className="w-3 h-3" />
                                    <span>選択してください</span>
                                  </div>
                                  {subjects.map((subjectName) => {
                                    const color = getSubjectColor(subjectName);
                                    return (
                                      <div
                                        key={subjectName}
                                        onClick={() => {
                                          setNewTodoSubject(subjectName);
                                          setIsSubjectDropdownOpen(false);
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-white/10 text-slate-200/90 ${
                                          newTodoSubject === subjectName ? 'bg-white/10' : ''
                                        }`}
                                      >
                                        {color ? (
                                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                        ) : (
                                          <span className="w-3 h-3" />
                                        )}
                                        <span>{subjectName}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                /* 通常モード */
                <>
                  {/* 1. 科目（任意） */}
                  <div>
                    <label className="block text-sm font-medium text-slate-200/90 mb-2">
                        科目（任意）
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => subjects.length > 0 && setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                        className={`w-full rounded-2xl text-left flex items-center gap-2 ring-1 ring-white/20 bg-white/5 backdrop-blur-md text-slate-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 ${
                          newTodoSubject && getSubjectColor(newTodoSubject) ? 'pl-8 pr-4 py-3' : 'px-4 py-3'
                        } ${isAdding || subjects.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                          disabled={isAdding || subjects.length === 0}
                        >
                          {newTodoSubject && (
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getSubjectColor(newTodoSubject) || SUBJECT_COLOR_FALLBACK }}
                            />
                          )}
                          <span className="flex-1">
                            {subjects.length === 0 ? '科目が未登録です' : (newTodoSubject || '選択してください')}
                          </span>
                          {subjects.length > 0 && (
                            <svg
                              className={`w-4 h-4 transition-transform flex-shrink-0 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                        
                        {/* 科目0件時の誘導メッセージ */}
                        {subjects.length === 0 && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-amber-800 font-medium text-xs mb-1">科目を登録してください</p>
                                <p className="text-amber-700 text-xs mb-2">リマインダーを作成するには、まず科目を登録する必要があります。</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    closeModal();
                                    const settingsButton = document.querySelector('[title="設定"]') as HTMLButtonElement;
                                    if (settingsButton) settingsButton.click();
                                  }}
                                  className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 transition-colors"
                                >
                                  設定画面へ →
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {isSubjectDropdownOpen && !isAdding && subjects.length > 0 && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setIsSubjectDropdownOpen(false)}
                            />
                            <div className="absolute z-20 w-full mt-2 bg-slate-900/60 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl max-h-80 overflow-auto ring-1 ring-sky-200/15">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewTodoSubject('');
                                  setIsSubjectDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-2 text-slate-200/90 ${
                                  !newTodoSubject ? 'bg-white/10' : ''
                                }`}
                              >
                                <span className="w-3 h-3 flex-shrink-0" />
                                <span>選択してください</span>
                              </button>
                              {subjects.map((subject) => {
                                const color = getSubjectColor(subject) || SUBJECT_COLOR_FALLBACK;
                                return (
                                  <button
                                    key={subject}
                                    type="button"
                                    onClick={() => {
                                      setNewTodoSubject(subject);
                                      setIsSubjectDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-2 text-slate-200/90 ${
                                      newTodoSubject === subject ? 'bg-white/10' : ''
                                    }`}
                                  >
                                    <span
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span>{subject}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                  {/* 2. タイトル */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-200/90 mb-2">
                      <span>タイトル</span>
                      <InfoTip content="{1-10}のように入力すると、数字の部分を自動で展開して一括生成します。複数箇所（例: 3-{1-3}-{1-5}）の展開も可能です。" />
                    </label>
                    <input
                      type="text"
                      value={newTodoTitle}
                      onChange={(e) => setNewTodoTitle(e.target.value)}
                      placeholder="新しいリマインダを追加..."
                      className="w-full px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md text-slate-100 placeholder:text-slate-300/60 ring-1 ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
                      disabled={isAdding}
                      required
                    />
                  </div>

                  {/* 3. 期限 */}
                    <div>
                    <label className="block text-sm font-medium text-slate-200/90 mb-2">
                        期限
                      </label>
                      <DatePicker
                        selected={newTodoDueDate}
                        onChange={(date: Date | null) => date && setNewTodoDueDate(date)}
                        dateFormat="yyyy年MM月dd日"
                      popperPlacement="bottom-start"
                      portalId="root"
                      popperContainer={popperToBody}
                      popperClassName="datepicker-glass-popper"
                        customInput={
                          <button
                            type="button"
                          className="w-full px-4 py-3 rounded-2xl text-left bg-white/5 backdrop-blur-md text-slate-100 ring-1 ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isAdding}
                          >
                            {format(newTodoDueDate, 'yyyy年MM月dd日', { locale: ja })}
                          </button>
                        }
                        minDate={new Date()}
                        locale="ja"
                      calendarClassName="react-datepicker-custom react-datepicker-glass"
                        showPopperArrow={false}
                      />
                  </div>
                </>
              )}

              <div className="mt-6">
                {!isUsingSetList && titleExpansionInfo.hasExpansion && (
                  <div className="mb-3">
                    {titleExpansionInfo.isValid ? (
                      <div className="rounded-2xl bg-sky-500/10 ring-1 ring-sky-200/15 backdrop-blur-md px-4 py-3 text-sm text-sky-100/90">
                        リマインダを <span className="font-semibold text-sky-100">{titleExpansionInfo.count}</span> 件生成します
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-rose-500/10 ring-1 ring-rose-200/15 backdrop-blur-md px-4 py-3 text-sm text-rose-100/90">
                        {titleExpansionInfo.errorMessage}
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={
                    isAdding ||
                    !newTodoTitle.trim() ||
                    !newTodoDueDate ||
                    (isUsingSetList &&
                      (
                        // 新API: セットリスト + 科目 が必須
                        (!reviewSetLoadError && (selectedReviewSetListId === null || !newTodoSubject.trim())) ||
                        // 後方互換（API失敗時のみ）: 旧選択が必須（subjectは旧側から入る）
                        (reviewSetLoadError && !selectedSetListTiming)
                      )) ||
                    (!isUsingSetList && titleExpansionInfo.hasExpansion && !titleExpansionInfo.isValid)
                  }
                  className="w-full px-6 py-3 rounded-full font-semibold text-lg text-slate-200/90 bg-slate-800/50 hover:bg-slate-800/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative backdrop-blur-md ring-1 ring-sky-200/15 shadow-[0_16px_40px_rgba(0,0,0,0.50)]"
                >
                  {isAdding ? (isUsingSetList ? '作成中...' : '追加中...') : (isUsingSetList ? '一括生成' : '作成')}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
      </div>
    </Dialog>
      )}
    </AnimatePresence>
  );
}

