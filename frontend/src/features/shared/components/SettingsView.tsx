import { useState, useEffect, useRef } from 'react';
import Sidebar, { type SidebarItem } from './Sidebar';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { settingsApi } from '../../../api/api';
import type { Subject, ReviewTiming } from '../../../api/types';
import { APP_LIMITS } from '../../../config/appConfig';
import { DEFAULT_SUBJECTS, SUBJECT_COLOR_PALETTE } from '../../../config/subjects';

interface SettingsViewProps {
  onSubjectsChange: (subjects: string[]) => void;
  onSubjectsWithColorsChange?: (subjects: Subject[]) => void;
  onDataUpdate?: () => void;
  onSettingsUpdate?: () => void;
}

// 色パレットは共通定数に一元化（アプリ全体の整合性を担保）
const DEFAULT_COLORS = [...SUBJECT_COLOR_PALETTE];

type SettingsMenu = 'subjects' | 'review-timing';

// ソート可能な科目アイテムコンポーネント
function SortableSubjectItem({
  subject,
  index,
  editingIndex,
  editingValue,
  setEditingValue,
  colorPickerIndex,
  colorPickerPosition,
  colorButtonRefs,
  subjectNameRefs,
  isSaving,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onColorButtonClick,
  onColorChange,
  onDelete,
  onCloseColorPicker,
  DEFAULT_COLORS,
}: {
  subject: Subject;
  index: number;
  editingIndex: number | null;
  editingValue: string;
  setEditingValue: (value: string) => void;
  colorPickerIndex: number | null;
  colorPickerPosition: { top: number; left: number } | null;
  colorButtonRefs: React.MutableRefObject<{ [key: number]: HTMLButtonElement | null }>;
  subjectNameRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  isSaving: boolean;
  onEdit: (index: number) => void;
  onSaveEdit: (index: number) => void;
  onCancelEdit: () => void;
  onColorButtonClick: (e: React.MouseEvent, index: number) => void;
  onColorChange: (index: number, color: string) => void;
  onDelete: (index: number) => void;
  onCloseColorPicker: () => void;
  DEFAULT_COLORS: string[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id, disabled: editingIndex === index || colorPickerIndex === index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 ${
        editingIndex === null && colorPickerIndex === null ? 'cursor-move' : 'cursor-default'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-gray-400 cursor-grab active:cursor-grabbing"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      {editingIndex === index ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onSaveEdit(index);
              } else if (e.key === 'Escape') {
                onCancelEdit();
              }
            }}
            className="flex-1 px-3 py-2 bg-white rounded border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            disabled={isSaving}
          />
          <button
            onClick={() => onSaveEdit(index)}
            disabled={isSaving}
            className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="保存"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={onCancelEdit}
            disabled={isSaving}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="キャンセル"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <button
              ref={(el) => { colorButtonRefs.current[index] = el; }}
              onClick={(e) => onColorButtonClick(e, index)}
              className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors"
              style={{ backgroundColor: subject.color }}
              title="色を変更"
            />
          </div>
          {colorPickerIndex === index && colorPickerPosition && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={onCloseColorPicker}
              />
              <div
                className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-3"
                style={{
                  top: `${colorPickerPosition.top}px`,
                  left: `${colorPickerPosition.left}px`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-6 gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={(e) => {
                        e.stopPropagation();
                        onColorChange(index, color);
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        subject.color === color ? 'border-gray-800 scale-110' : 'border-gray-300 hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
          <div
            ref={(el) => { subjectNameRefs.current[index] = el; }}
            className="flex-1 px-3 py-2 bg-white rounded border border-gray-200 cursor-text hover:border-blue-300 transition-colors"
            onClick={() => onEdit(index)}
            title="クリックして編集"
          >
            {subject.name}
          </div>
          <button
            onClick={() => onEdit(index)}
            disabled={isSaving}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="編集"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(index)}
            disabled={isSaving}
            className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="削除"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

export default function SettingsView({ onSubjectsChange, onSubjectsWithColorsChange, onDataUpdate, onSettingsUpdate }: SettingsViewProps) {
  const [activeMenu, setActiveMenu] = useState<SettingsMenu>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ top: number; left: number } | null>(null);
  const colorButtonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
  const subjectNameRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [reviewTimings, setReviewTimings] = useState<ReviewTiming[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());

  // 設定を読み込む
  useEffect(() => {
    loadSettings();
  }, []);

  // 科目が読み込まれたら復習タイミングも読み込む
  useEffect(() => {
    if (subjects.length > 0) {
      loadReviewTimings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await settingsApi.getAll();
      const subjectsSetting = settings.find(s => s.key === 'subjects');
      
      if (subjectsSetting) {
        try {
          const parsedSubjects = JSON.parse(subjectsSetting.value);
          if (Array.isArray(parsedSubjects)) {
            // 空配列も正常な状態として扱う（ユーザーが全削除した場合）
            if (parsedSubjects.length === 0) {
              setSubjects([]);
              onSubjectsChange([]);
              if (onSubjectsWithColorsChange) {
                onSubjectsWithColorsChange([]);
              }
            } else {
              // Subject型の配列か、文字列の配列かを判定
              if (parsedSubjects[0] && typeof parsedSubjects[0] === 'object' && 'id' in parsedSubjects[0]) {
                setSubjects(parsedSubjects as Subject[]);
                onSubjectsChange((parsedSubjects as Subject[]).map(s => s.name));
                if (onSubjectsWithColorsChange) {
                  onSubjectsWithColorsChange(parsedSubjects as Subject[]);
                }
              } else {
                // 文字列配列の場合はSubject型に変換
                const convertedSubjects: Subject[] = (parsedSubjects as string[]).map((name, index) => ({
                  id: index + 1,
                  name,
                  color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                }));
                setSubjects(convertedSubjects);
                onSubjectsChange(convertedSubjects.map(s => s.name));
                if (onSubjectsWithColorsChange) {
                  onSubjectsWithColorsChange(convertedSubjects);
                }
                // 変換したデータを保存
                await saveSubjects(convertedSubjects);
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing subjects:', parseError);
          // デフォルト値を使用
          const defaultSubjects: Subject[] = [...DEFAULT_SUBJECTS];
          setSubjects(defaultSubjects);
          onSubjectsChange(defaultSubjects.map(s => s.name));
          if (onSubjectsWithColorsChange) {
            onSubjectsWithColorsChange(defaultSubjects);
          }
          await saveSubjects(defaultSubjects);
        }
      } else {
        // デフォルト値を使用
        const defaultSubjects: Subject[] = [...DEFAULT_SUBJECTS];
        setSubjects(defaultSubjects);
        onSubjectsChange(defaultSubjects.map(s => s.name));
        if (onSubjectsWithColorsChange) {
          onSubjectsWithColorsChange(defaultSubjects);
        }
        await saveSubjects(defaultSubjects);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // デフォルト値を使用
      const defaultSubjects: Subject[] = [...DEFAULT_SUBJECTS];
      setSubjects(defaultSubjects);
      onSubjectsChange(defaultSubjects.map(s => s.name));
      if (onSubjectsWithColorsChange) {
        onSubjectsWithColorsChange(defaultSubjects);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveSubjects = async (subjectsToSave: Subject[]) => {
    try {
      setIsSaving(true);
      console.log('[SettingsView] Saving subjects:', subjectsToSave);
      const result = await settingsApi.createOrUpdate({
        key: 'subjects',
        value: JSON.stringify(subjectsToSave),
      });
      console.log('[SettingsView] Save result:', result);
      onSubjectsChange(subjectsToSave.map(s => s.name));
      if (onSubjectsWithColorsChange) {
        onSubjectsWithColorsChange(subjectsToSave);
      }
    } catch (error: any) {
      console.error('[SettingsView] Error saving settings:', error);
      const message = error.userMessage || '科目の保存に失敗しました。ネットワークを確認してください。';
      alert(message);
      throw error; // エラーを再スローして、呼び出し元で処理できるようにする
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.trim() || subjects.some(s => s.name === newSubject.trim())) {
      return;
    }
    const newId = subjects.length > 0 ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
    const newSubjectObj: Subject = {
      id: newId,
      name: newSubject.trim(),
      color: DEFAULT_COLORS[subjects.length % DEFAULT_COLORS.length],
    };
    const updatedSubjects = [...subjects, newSubjectObj];
    setSubjects(updatedSubjects);
    setNewSubject('');
    await saveSubjects(updatedSubjects);
    
    // 新しく追加した科目の復習セットリストが存在しない場合は、デフォルト値（1日後）で初期化
    const existingTiming = reviewTimings.find(t => t.subject_id === newId);
    if (!existingTiming) {
      const updatedReviewTimings = [...reviewTimings, {
        subject_id: newId,
        subject_name: newSubjectObj.name,
        review_days: [1], // デフォルトは1日後
      }];
      await saveReviewTimings(updatedReviewTimings);
    }
  };

  const handleRemoveSubject = async (index: number) => {
    console.log('[SettingsView] Deleting subject at index:', index);
    const subjectToRemove = subjects[index];
    console.log('[SettingsView] Subject to remove:', subjectToRemove);
    const updatedSubjects = subjects.filter((_, i) => i !== index);
    console.log('[SettingsView] Updated subjects:', updatedSubjects);
    setSubjects(updatedSubjects);
    await saveSubjects(updatedSubjects);
    
    // 復習セットリストからも削除
    const updatedReviewTimings = reviewTimings.filter(t => t.subject_id !== subjectToRemove.id);
    await saveReviewTimings(updatedReviewTimings);
    
    // 削除後、他の画面にも反映させるため設定を再読み込み
    if (onSettingsUpdate) {
      console.log('[SettingsView] Calling onSettingsUpdate');
      onSettingsUpdate();
    } else {
      console.warn('[SettingsView] onSettingsUpdate is not defined');
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(subjects[index].name);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleSaveEdit = async (index: number) => {
    const oldName = subjects[index].name;
    const newName = editingValue.trim();
    
    if (!newName || newName === oldName) {
      handleCancelEdit();
      return;
    }

    // 重複チェック
    if (subjects.some(s => s.name === newName && subjects.indexOf(s) !== index)) {
      return;
    }

    try {
      setIsSaving(true);
      
      // 科目名を更新（関連するToDoとStudyProgressも更新）
      await settingsApi.updateSubjectName(oldName, newName);
      
      // ローカルの科目リストを更新
      const updatedSubjects = [...subjects];
      updatedSubjects[index] = { ...updatedSubjects[index], name: newName };
      setSubjects(updatedSubjects);
      
      // 設定も保存
      await saveSubjects(updatedSubjects);
      
      // データを再取得（ToDoやStudyProgressの更新を反映）
      if (onDataUpdate) {
        onDataUpdate();
      }
      
      setEditingIndex(null);
      setEditingValue('');
    } catch (error) {
      console.error('Error updating subject name:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleColorChange = async (index: number, color: string) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[index] = { ...updatedSubjects[index], color };
    setSubjects(updatedSubjects);
    await saveSubjects(updatedSubjects);
    setColorPickerIndex(null);
    setColorPickerPosition(null);
  };

  // 復習タイミング設定を読み込む
  const loadReviewTimings = async () => {
    try {
      const settings = await settingsApi.getAll();
      const reviewTimingSetting = settings.find(s => s.key === 'review_timing');
      
      if (reviewTimingSetting) {
        try {
          const parsed = JSON.parse(reviewTimingSetting.value);
          if (Array.isArray(parsed)) {
            // 現在存在する科目の復習セットリストのみを保持
            const validSubjectIds = new Set(subjects.map(s => s.id));
            const filteredTimings = parsed.filter((t: ReviewTiming) => validSubjectIds.has(t.subject_id));
            
            // 存在する科目で復習セットリストがない場合は、デフォルト値で追加
            const existingSubjectIds = new Set(filteredTimings.map((t: ReviewTiming) => t.subject_id));
            const missingSubjects = subjects.filter(s => !existingSubjectIds.has(s.id));
            const defaultTimings = missingSubjects.map(subject => ({
              subject_id: subject.id,
              subject_name: subject.name,
              review_days: [1], // デフォルトは1日後
            }));
            
            const allTimings = [...filteredTimings, ...defaultTimings];
            setReviewTimings(allTimings);
            
            // フィルタリングや追加があった場合は保存
            if (filteredTimings.length !== parsed.length || defaultTimings.length > 0) {
              await saveReviewTimings(allTimings);
            }
            return;
          }
        } catch (error) {
          console.error('Error parsing review timings:', error);
        }
      }
      
      // デフォルト値：科目ごとに初期化（1回目のみ、1日後）
      const defaultTimings: ReviewTiming[] = subjects.map(subject => ({
        subject_id: subject.id,
        subject_name: subject.name,
        review_days: [1], // デフォルトは1日後
      }));
      setReviewTimings(defaultTimings);
    } catch (error) {
      console.error('Error loading review timings:', error);
    }
  };

  // 復習タイミング設定を保存
  const saveReviewTimings = async (timings: ReviewTiming[]) => {
    try {
      setIsSaving(true);
      await settingsApi.createOrUpdate({
        key: 'review_timing',
        value: JSON.stringify(timings),
      });
      setReviewTimings(timings);
    } catch (error) {
      console.error('Error saving review timings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 復習日数を更新
  const handleReviewDayChange = async (subjectId: number, index: number, value: number) => {
    let updated = [...reviewTimings];
    const existingIndex = updated.findIndex(t => t.subject_id === subjectId);
    
    if (existingIndex >= 0) {
      const newReviewDays = [...updated[existingIndex].review_days];
      newReviewDays[index] = value;
      updated[existingIndex] = { ...updated[existingIndex], review_days: newReviewDays };
    } else {
      // 科目が存在しない場合は追加
      const subject = subjects.find(s => s.id === subjectId);
      if (subject) {
        updated.push({
          subject_id: subjectId,
          subject_name: subject.name,
          review_days: [value],
        });
      }
    }
    
    await saveReviewTimings(updated);
  };

  // 復習項目を追加
  const handleAddReviewDay = async (subjectId: number) => {
    let updated = [...reviewTimings];
    const existingIndex = updated.findIndex(t => t.subject_id === subjectId);
    
    if (existingIndex >= 0) {
      const newReviewDays = [...updated[existingIndex].review_days];
      // 最後の日数に1を加えた値をデフォルトとする
      const lastDay = newReviewDays.length > 0 ? newReviewDays[newReviewDays.length - 1] : 1;
      newReviewDays.push(lastDay + 1);
      updated[existingIndex] = { ...updated[existingIndex], review_days: newReviewDays };
    } else {
      const subject = subjects.find(s => s.id === subjectId);
      if (subject) {
        updated.push({
          subject_id: subjectId,
          subject_name: subject.name,
          review_days: [1, 2],
        });
      }
    }
    
    await saveReviewTimings(updated);
  };

  // 復習項目を削除
  const handleRemoveReviewDay = async (subjectId: number, index: number) => {
    let updated = [...reviewTimings];
    const existingIndex = updated.findIndex(t => t.subject_id === subjectId);
    
    if (existingIndex >= 0) {
      const newReviewDays = updated[existingIndex].review_days.filter((_, i) => i !== index);
      // 最低1つは残す
      if (newReviewDays.length === 0) {
        newReviewDays.push(1);
      }
      updated[existingIndex] = { ...updated[existingIndex], review_days: newReviewDays };
    }
    
    await saveReviewTimings(updated);
  };

  const handleColorButtonClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const subjectNameElement = subjectNameRefs.current[index];
    if (subjectNameElement) {
      const rect = subjectNameElement.getBoundingClientRect();
      // 科目名の左側に表示
      setColorPickerPosition({ 
        top: rect.top, 
        left:
          rect.left -
          APP_LIMITS.SETTINGS.COLOR_PICKER.WIDTH_PX -
          APP_LIMITS.SETTINGS.COLOR_PICKER.GAP_PX 
      });
    }
    setColorPickerIndex(colorPickerIndex === index ? null : index);
  };

  // dnd-kitのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // active.idとover.idが数値であることを確認
    const activeId = typeof active.id === 'number' ? active.id : parseInt(String(active.id));
    const overId = typeof over.id === 'number' ? over.id : parseInt(String(over.id));

    const oldIndex = subjects.findIndex((s) => s.id === activeId);
    const newIndex = subjects.findIndex((s) => s.id === overId);

    // インデックスが見つからない場合は処理を中断
    if (oldIndex === -1 || newIndex === -1) {
      console.warn('Subject not found:', { activeId, overId, oldIndex, newIndex });
      return;
    }

    // 楽観的更新：即座にUIを更新
    const updatedSubjects = arrayMove(subjects, oldIndex, newIndex);
    setSubjects(updatedSubjects);

    // バックエンドに保存
    try {
      await saveSubjects(updatedSubjects);
    } catch (error) {
      console.error('Error saving subjects order:', error);
      // エラーが発生した場合は元に戻す
      setSubjects(subjects);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const handleMenuClick = (itemId: string) => {
    const menu = itemId as SettingsMenu;
    setActiveMenu(menu);
    
    // メニューに応じた追加処理
    if (menu === 'review-timing') {
      loadReviewTimings();
    }
  };

  return (
    <div className="flex h-full min-h-[600px]">
      {/* 左側サイドバー - 画面左端に配置 */}
      <Sidebar
        title="設定"
        items={[
          { id: 'subjects', label: '科目' },
          { id: 'review-timing', label: '復習セットリスト' },
        ]}
        activeItemId={activeMenu}
        onItemClick={handleMenuClick}
      />

      {/* 右側コンテンツエリア - 独立したカード */}
      <div className="flex-1">
        {activeMenu === 'subjects' && (
          <div className="bg-white rounded-lg shadow-lg p-6 h-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">科目リスト</h3>
        
        {/* 新規追加フォーム */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
            placeholder="新しい科目名を入力..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSaving}
          />
          <button
            onClick={handleAddSubject}
            disabled={isSaving || !newSubject.trim() || subjects.some(s => s.name === newSubject.trim())}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            追加
          </button>
        </div>

        {/* 科目リスト */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={subjects.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {subjects.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">科目が登録されていません</p>
              ) : (
                subjects.map((subject, index) => (
                  <SortableSubjectItem
                    key={subject.id}
                    subject={subject}
                    index={index}
                    editingIndex={editingIndex}
                    editingValue={editingValue}
                    setEditingValue={setEditingValue}
                    colorPickerIndex={colorPickerIndex}
                    colorPickerPosition={colorPickerPosition}
                    colorButtonRefs={colorButtonRefs}
                    subjectNameRefs={subjectNameRefs}
                    isSaving={isSaving}
                    onEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onColorButtonClick={handleColorButtonClick}
                    onColorChange={handleColorChange}
                    onDelete={handleRemoveSubject}
                    onCloseColorPicker={() => {
                      setColorPickerIndex(null);
                      setColorPickerPosition(null);
                    }}
                    DEFAULT_COLORS={DEFAULT_COLORS}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>

            {isSaving && (
              <p className="text-sm text-gray-500 mt-2">保存中...</p>
            )}
          </div>
        )}

        {activeMenu === 'review-timing' && (
          <div className="bg-white rounded-lg shadow-lg p-6 h-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">復習セットリスト設定</h3>
            <p className="text-sm text-gray-600 mb-6">科目ごとに復習日数を個別に設定できます</p>
            
            <div className="space-y-4">
              {subjects.map((subject) => {
                const timing = reviewTimings.find(t => t.subject_id === subject.id) || {
                  subject_id: subject.id,
                  subject_name: subject.name,
                  review_days: [1],
                };
                
                const isExpanded = expandedSubjects.has(subject.id);
                
                return (
                  <div
                    key={subject.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <button
                      onClick={() => {
                        setExpandedSubjects(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(subject.id)) {
                            newSet.delete(subject.id);
                          } else {
                            newSet.add(subject.id);
                          }
                          return newSet;
                        });
                      }}
                      className="w-full flex items-center gap-3 mb-4 hover:bg-gray-100 rounded-lg p-2 -m-2 transition-colors"
                    >
                      <span
                        className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      >
                        ▶
                      </span>
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: subject.color }}
                      />
                      <h4 className="font-semibold text-gray-700 text-left">{subject.name}</h4>
                    </button>
                    
                    {isExpanded && (
                      <div className="space-y-2">
                        {timing.review_days.map((day, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 w-20">
                              {index + 1}回目
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={day}
                              onChange={(e) => handleReviewDayChange(subject.id, index, parseInt(e.target.value) || 1)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={isSaving}
                              placeholder="日数"
                            />
                            <span className="text-sm text-gray-600 w-12">日後</span>
                            {index > 0 && (
                              <button
                                onClick={() => handleRemoveReviewDay(subject.id, index)}
                                disabled={isSaving}
                                className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="削除"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                        
                        <button
                          onClick={() => handleAddReviewDay(subject.id)}
                          disabled={isSaving}
                          className="mt-2 px-4 py-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          追加
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
