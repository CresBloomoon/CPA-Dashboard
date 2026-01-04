import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Sidebar, { type SidebarItem } from './Sidebar';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DropResult,
} from '@hello-pangea/dnd';
import { settingsApi, reviewSetApi } from '../../../api/api';
import type { Subject, ReviewTiming, ReviewSetList } from '../../../api/types';
import { APP_LIMITS } from '../../../config/appConfig';
import { DEFAULT_SUBJECTS, SUBJECT_COLOR_PALETTE } from '../../../config/subjects';
import { SUBJECT_SETTINGS_TIP } from '../../../constants/tips';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';

interface SettingsViewProps {
  onSubjectsChange: (subjects: string[]) => void;
  onSubjectsWithColorsChange?: (subjects: Subject[]) => void;
  onDataUpdate?: () => void;
  onSettingsUpdate?: () => void;
}

// 色パレットは共通定数に一元化（アプリ全体の整合性を担保）
const DEFAULT_COLORS = [...SUBJECT_COLOR_PALETTE];

type SettingsMenu = 'subjects' | 'review-timing';

const arrayMove = <T,>(arr: T[], from: number, to: number): T[] => {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

// ソート可能な科目アイテムコンポーネント
function SortableSubjectItem({
  subject,
  index,
  colorPickerIndex,
  colorPickerPosition,
  colorButtonRefs,
  subjectNameRefs,
  isSaving,
  onColorButtonClick,
  onColorChange,
  onToggleVisible,
  onCloseColorPicker,
  DEFAULT_COLORS,
  colors,
  draggableProvided,
  draggableSnapshot,
}: {
  subject: Subject;
  index: number;
  colorPickerIndex: number | null;
  colorPickerPosition: { top: number; left: number } | null;
  colorButtonRefs: React.MutableRefObject<{ [key: number]: HTMLButtonElement | null }>;
  subjectNameRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  isSaving: boolean;
  onColorButtonClick: (e: React.MouseEvent, index: number) => void;
  onColorChange: (index: number, color: string) => void;
  onToggleVisible: (index: number) => void;
  onCloseColorPicker: () => void;
  DEFAULT_COLORS: string[];
  colors: ReturnType<typeof getThemeColors>;
  draggableProvided: DraggableProvided;
  draggableSnapshot: DraggableStateSnapshot;
}) {
  const isDragging = draggableSnapshot.isDragging;
  const isVisible = subject.visible !== false;
  const pickerOpen = colorPickerIndex === index && !!colorPickerPosition;

  return (
    <div
      ref={draggableProvided.innerRef}
      {...draggableProvided.draggableProps}
      className={`group flex items-center gap-4 px-4 py-4 rounded-xl border backdrop-blur-md transition-all duration-300 ${
        colorPickerIndex === null ? 'cursor-move' : 'cursor-default'
      } ${
        isDragging
          ? 'bg-white/10 border-white/30 shadow-2xl backdrop-blur-lg'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'
      }`}
    >
      <div
        {...draggableProvided.dragHandleProps}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing p-2 -m-2 rounded-lg hover:bg-white/5 transition-colors"
        style={{ color: colors.textTertiary }}
        title="並び替え"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* 科目カラー */}
      <div className="relative flex-shrink-0">
          <button
            ref={(el) => { colorButtonRefs.current[index] = el; }}
            onClick={(e) => onColorButtonClick(e, index)}
            className="w-9 h-9 rounded-full border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-300 hover:scale-[1.03]"
            style={{
              backgroundColor: subject.color,
            }}
            title="色を変更"
            disabled={isSaving}
          />
      </div>

        {pickerOpen && colorPickerPosition &&
          createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={onCloseColorPicker} />
              <div
                className="fixed z-[9999] rounded-xl shadow-2xl p-3 bg-slate-900/70 backdrop-blur-lg border border-white/20"
                style={{
                  top: `${colorPickerPosition.top}px`,
                  left: `${colorPickerPosition.left}px`,
                  width: `${APP_LIMITS.SETTINGS.COLOR_PICKER.WIDTH_PX}px`,
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
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                        subject.color === color ? 'scale-110' : ''
                      }`}
                      style={{
                        borderColor: subject.color === color ? 'rgba(226,232,240,0.9)' : 'rgba(255,255,255,0.18)',
                        backgroundColor: color,
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </>,
            document.body
          )}

      {/* 科目名 */}
      <div className="flex-1 min-w-0">
        <div
          ref={(el) => { subjectNameRefs.current[index] = el; }}
          className={`truncate text-base font-medium transition-colors duration-300 ${
            isVisible ? 'text-slate-100' : 'text-slate-400'
          }`}
          title={isVisible ? '表示中' : '非表示（全画面の科目候補から除外されます）'}
        >
          {subject.name}
        </div>
      </div>

      {/* 表示チェック（大きめカスタム） */}
      <button
        type="button"
        disabled={isSaving}
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible(index);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-all duration-300 ${
          isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'
        } ${
          isVisible ? 'border-white/25' : 'bg-white/5 border-white/15'
        }`}
        title={isVisible ? '表示中（クリックで非表示）' : '非表示（クリックで表示）'}
        aria-pressed={isVisible}
        style={
          isVisible
            ? {
                backgroundColor: `${subject.color}26`, // 15%程度
                borderColor: `${subject.color}66`, // 40%程度
              }
            : undefined
        }
      >
        <svg
          className={`w-5 h-5 transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: 'rgba(226,232,240,0.95)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}

export default function SettingsView({ onSubjectsChange, onSubjectsWithColorsChange, onDataUpdate, onSettingsUpdate }: SettingsViewProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [activeMenu, setActiveMenu] = useState<SettingsMenu>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // 財務報告：報告開始曜日（0=日〜6=土、デフォルト=月）
  const [reportStartDay, setReportStartDay] = useState<number>(1);
  const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ top: number; left: number } | null>(null);
  const colorButtonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
  const subjectNameRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [reviewTimings, setReviewTimings] = useState<ReviewTiming[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());
  const [reviewSetLists, setReviewSetLists] = useState<ReviewSetList[]>([]);
  const [reviewSetError, setReviewSetError] = useState<string | null>(null);
  const [useLegacyReviewSets, setUseLegacyReviewSets] = useState<boolean>(true);
  const [newSetListName, setNewSetListName] = useState('');
  const [newSetListOffsets, setNewSetListOffsets] = useState('1,3,7');
  const [openReviewSetListId, setOpenReviewSetListId] = useState<number | null>(null);

  type EditItem = { key: string; id?: number; offsetRaw: string };
  type ReviewSetEditState = {
    name: string;
    items: EditItem[];
    original: { name: string; offsets: number[]; itemIds: number[] };
    saving: boolean;
    error: string | null;
  };
  const [reviewSetEdits, setReviewSetEdits] = useState<Record<number, ReviewSetEditState>>({});

  const _normalizeOffsets = (items: EditItem[]): { ok: boolean; offsets: number[]; error?: string } => {
    const parsed: number[] = [];
    for (const it of items) {
      const raw = it.offsetRaw.trim();
      if (raw === '') return { ok: false, offsets: [], error: '日数が未入力です' };
      const n = Number(raw);
      if (!Number.isFinite(n)) return { ok: false, offsets: [], error: '日数は数値で入力してください' };
      const i = Math.floor(n);
      if (i < 0) return { ok: false, offsets: [], error: '日数は0以上の整数です' };
      parsed.push(i);
    }
    const sorted = [...parsed].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1]) return { ok: false, offsets: [], error: '日数が重複しています' };
    }
    return { ok: true, offsets: sorted };
  };

  const _isDirty = (id: number): boolean => {
    const st = reviewSetEdits[id];
    if (!st) return false;
    const name = st.name.trim();
    const origName = st.original.name.trim();
    if (name !== origName) return true;
    const norm = _normalizeOffsets(st.items);
    if (!norm.ok) return true; // 不正値は未保存扱い
    const a = norm.offsets;
    const b = [...st.original.offsets].sort((x, y) => x - y);
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
    return false;
  };

  // 設定を読み込む
  useEffect(() => {
    loadSettings();
  }, []);

  // 科目が読み込まれたら復習タイミングも読み込む
  useEffect(() => {
    if (subjects.length > 0) {
      // 旧データの読み込みは、use_legacy_review_sets が true のときだけ
      void loadUseLegacyReviewSets().then((useLegacy) => {
        if (useLegacy) loadReviewTimings();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await settingsApi.getAll();
      const subjectsSetting = settings.find(s => s.key === 'subjects');
      const reportStartDaySetting = settings.find(s => s.key === 'reportStartDay');

      // 財務報告設定（存在しない場合はデフォルト）
      if (reportStartDaySetting) {
        try {
          const parsed = JSON.parse(reportStartDaySetting.value) as unknown;
          const next =
            typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0 && parsed <= 6
              ? Math.floor(parsed)
              : 1;
          setReportStartDay(next);
        } catch {
          setReportStartDay(1);
        }
      } else {
        setReportStartDay(1);
      }
      
      if (subjectsSetting) {
        try {
          const parsedSubjects = JSON.parse(subjectsSetting.value);
          if (Array.isArray(parsedSubjects)) {
            // 空配列も正常な状態として扱う（ユーザーが全削除した場合）
            if (parsedSubjects.length === 0) {
              const seeded = DEFAULT_SUBJECTS.map((s) => ({ ...s, visible: true }));
              setSubjects(seeded);
              const visible = seeded.filter((s) => s.visible !== false);
              onSubjectsChange(visible.map((s) => s.name));
              if (onSubjectsWithColorsChange) onSubjectsWithColorsChange(seeded);
            } else {
            // Subject型の配列か、文字列の配列かを判定
            if (parsedSubjects[0] && typeof parsedSubjects[0] === 'object' && 'id' in parsedSubjects[0]) {
              setSubjects(parsedSubjects as Subject[]);
              const visible = (parsedSubjects as Subject[]).filter((s) => s.visible !== false);
              onSubjectsChange(visible.map((s) => s.name));
              if (onSubjectsWithColorsChange) onSubjectsWithColorsChange(parsedSubjects as Subject[]);
            } else {
              // 文字列配列の場合はSubject型に変換
              const convertedSubjects: Subject[] = (parsedSubjects as string[]).map((name, index) => ({
                id: index + 1,
                name,
                color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                visible: true,
              }));
              setSubjects(convertedSubjects);
              const visible = convertedSubjects.filter((s) => s.visible !== false);
              onSubjectsChange(visible.map((s) => s.name));
              if (onSubjectsWithColorsChange) onSubjectsWithColorsChange(convertedSubjects);
              // 変換したデータを保存
              await saveSubjects(convertedSubjects);
            }
            }
          }
        } catch (parseError) {
          console.error('Error parsing subjects:', parseError);
          // エラー時は空配列のまま（ユーザーが設定画面で追加する）
          const seeded = DEFAULT_SUBJECTS.map((s) => ({ ...s, visible: true }));
          setSubjects(seeded);
          const visible = seeded.filter((s) => s.visible !== false);
          onSubjectsChange(visible.map((s) => s.name));
          if (onSubjectsWithColorsChange) onSubjectsWithColorsChange(seeded);
        }
      } else {
        // 設定が存在しない場合はデフォルト科目を保存して開始（追加/削除は禁止のため）
        const seeded = DEFAULT_SUBJECTS.map((s) => ({ ...s, visible: true }));
        setSubjects(seeded);
        const visible = seeded.filter((s) => s.visible !== false);
        onSubjectsChange(visible.map((s) => s.name));
        if (onSubjectsWithColorsChange) onSubjectsWithColorsChange(seeded);
        await saveSubjects(seeded);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // エラー時も空配列を維持（ユーザーが設定画面で追加する）
      const seeded = DEFAULT_SUBJECTS.map((s) => ({ ...s, visible: true }));
      setSubjects(seeded);
      const visible = seeded.filter((s) => s.visible !== false);
      onSubjectsChange(visible.map((s) => s.name));
      if (onSubjectsWithColorsChange) onSubjectsWithColorsChange(seeded);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReportStartDay = async (day: number) => {
    try {
      setIsSaving(true);
      await settingsApi.createOrUpdate({
        key: 'reportStartDay',
        value: JSON.stringify(day),
      });
      setReportStartDay(day);
      if (onSettingsUpdate) onSettingsUpdate();
    } catch (error: any) {
      console.error('[SettingsView] Error saving reportStartDay:', error);
      const message = error.userMessage || '報告開始曜日の保存に失敗しました。ネットワークを確認してください。';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const saveSubjects = async (subjectsToSave: Subject[], opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setIsSaving(true);
      console.log('[SettingsView] Saving subjects:', subjectsToSave);
      const result = await settingsApi.createOrUpdate({
        key: 'subjects',
        value: JSON.stringify(subjectsToSave),
      });
      console.log('[SettingsView] Save result:', result);
      const visible = subjectsToSave.filter((s) => s.visible !== false);
      onSubjectsChange(visible.map((s) => s.name));
      if (onSubjectsWithColorsChange) onSubjectsWithColorsChange(subjectsToSave);
    } catch (error: any) {
      console.error('[SettingsView] Error saving settings:', error);
      if (!opts?.silent) {
        const message = error.userMessage || '科目の保存に失敗しました。ネットワークを確認してください。';
        alert(message);
      }
      throw error;
    } finally {
      if (!opts?.silent) setIsSaving(false);
    }
  };

  const handleToggleVisible = async (index: number) => {
    const updatedSubjects = [...subjects];
    const current = updatedSubjects[index];
    if (!current) return;
    updatedSubjects[index] = { ...current, visible: current.visible === false ? true : false };
    setSubjects(updatedSubjects);
    void saveSubjects(updatedSubjects, { silent: true }).catch(() => {
      // サイレント保存失敗時はUIを元に戻す（操作を妨げない）
      setSubjects(subjects);
    });
    if (onSettingsUpdate) onSettingsUpdate();
  };

  const handleColorChange = async (index: number, color: string) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[index] = { ...updatedSubjects[index], color };
    setSubjects(updatedSubjects);
    void saveSubjects(updatedSubjects, { silent: true }).catch(() => {
      setSubjects(subjects);
    });
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

  // 新: 復習セットリスト（名前付き）を読み込む
  const loadReviewSetLists = async () => {
    try {
      setReviewSetError(null);
      const allowLegacy = await loadUseLegacyReviewSets();
      const lists = await reviewSetApi.getAll();
      setReviewSetLists(lists);
      // 編集stateを初期化（既にdirtyのものは上書きしない）
      setReviewSetEdits((prev) => {
        const next = { ...prev };
        const isDirtyState = (st: ReviewSetEditState): boolean => {
          const name = st.name.trim();
          const origName = st.original.name.trim();
          if (name !== origName) return true;
          const norm = _normalizeOffsets(st.items);
          if (!norm.ok) return true;
          const a = norm.offsets;
          const b = [...st.original.offsets].sort((x, y) => x - y);
          if (a.length !== b.length) return true;
          for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
          return false;
        };
        for (const l of lists) {
          const existing = next[l.id];
          const itemsSorted = [...(l.items || [])].sort((a, b) => a.offset_days - b.offset_days);
          const orig = {
            name: l.name ?? '',
            offsets: itemsSorted.map((i) => i.offset_days),
            itemIds: itemsSorted.map((i) => i.id),
          };
          const shouldInit = !existing || (!existing.saving && !isDirtyState(existing));
          if (shouldInit) {
            next[l.id] = {
              name: l.name ?? '',
              items: itemsSorted.map((i) => ({ key: `id-${i.id}`, id: i.id, offsetRaw: String(i.offset_days) })),
              original: orig,
              saving: false,
              error: null,
            };
          }
        }
        return next;
      });
    } catch (error: any) {
      console.error('[SettingsView] Error loading review set lists:', error);
      // 後方互換: 旧データへのフォールバックは use_legacy_review_sets=true のときだけ
      const allowLegacy = await loadUseLegacyReviewSets();
      if (allowLegacy) {
        setReviewSetError(error.userMessage || '復習セットリストの読み込みに失敗しました（旧設定へフォールバックします）');
        await loadReviewTimings();
      } else {
        setReviewSetError(error.userMessage || '復習セットリストの読み込みに失敗しました');
      }
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
    const btn = colorButtonRefs.current[index];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const gap = 10;
      const width = APP_LIMITS.SETTINGS.COLOR_PICKER.WIDTH_PX;
      const estimatedHeight = 120; // ざっくり（6x? のカラーパレット）

      let top = rect.bottom + gap;
      let left = rect.left;

      // 画面外に出ないようにクランプ
      const maxLeft = Math.max(8, window.innerWidth - width - 8);
      left = Math.min(Math.max(8, left), maxLeft);

      const maxTop = Math.max(8, window.innerHeight - estimatedHeight - 8);
      if (top > maxTop) top = Math.max(8, rect.top - gap - estimatedHeight);

      setColorPickerPosition({ top, left });
    }
    setColorPickerIndex(colorPickerIndex === index ? null : index);
  };

  // NOTE: 科目並び替えは @hello-pangea/dnd を使用（旧 dnd-kit 実装は撤去）

  if (isLoading) {
    return (
      <div 
        className="rounded-lg shadow-lg p-6"
        style={{
          backgroundColor: colors.card,
        }}
      >
        <div className="text-center py-12">
          <div 
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: colors.accent }}
          ></div>
          <p className="mt-4" style={{ color: colors.textSecondary }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  const handleMenuClick = (itemId: string) => {
    const menu = itemId as SettingsMenu;
    setActiveMenu(menu);
    
    // メニューに応じた追加処理
    if (menu === 'review-timing') {
      loadReviewSetLists();
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
          <div 
            className="rounded-lg shadow-lg p-6 h-full"
            style={{
              backgroundColor: colors.card,
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: colors.textSecondary }}
            >
              科目リスト
            </h3>
        
        <div className="mb-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 px-4 py-3 text-sm text-slate-200/80">
          {SUBJECT_SETTINGS_TIP}
        </div>

        {/* 科目リスト */}
        <div className="space-y-3">
          {subjects.length === 0 ? (
            <p 
              className="text-sm py-4"
              style={{ color: colors.textTertiary }}
            >
              科目が登録されていません
            </p>
          ) : (
            <DragDropContext
              onDragEnd={async (result: DropResult) => {
                const { destination, source } = result;
                if (!destination) return;
                if (destination.index === source.index) return;
                const updatedSubjects = arrayMove(subjects, source.index, destination.index);
                setSubjects(updatedSubjects);
                try {
                  await saveSubjects(updatedSubjects);
                } catch (error) {
                  console.error('Error saving subjects order:', error);
                  setSubjects(subjects);
                }
              }}
            >
              <Droppable droppableId="subjects-droppable">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {subjects.map((subject, index) => (
                      <Draggable key={subject.id} draggableId={String(subject.id)} index={index}>
                        {(draggableProvided, snapshot) => (
                          <SortableSubjectItem
                            subject={subject}
                            index={index}
                            colorPickerIndex={colorPickerIndex}
                            colorPickerPosition={colorPickerPosition}
                            colorButtonRefs={colorButtonRefs}
                            subjectNameRefs={subjectNameRefs}
                            isSaving={isSaving}
                            onColorButtonClick={handleColorButtonClick}
                            onColorChange={handleColorChange}
                            onToggleVisible={handleToggleVisible}
                            onCloseColorPicker={() => {
                              setColorPickerIndex(null);
                              setColorPickerPosition(null);
                            }}
                            DEFAULT_COLORS={DEFAULT_COLORS}
                            colors={colors}
                            draggableProvided={draggableProvided}
                            draggableSnapshot={snapshot}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

            {/* 保存中表示はUX上ノイズになるため非表示（操作はdisableで担保） */}
          </div>
        )}

        {activeMenu === 'review-timing' && (
          <div 
            className="rounded-lg shadow-lg p-6 h-full"
            style={{
              backgroundColor: colors.card,
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: colors.textSecondary }}
            >
              復習セットリスト設定
            </h3>
            <p 
              className="text-sm mb-6"
              style={{ color: colors.textSecondary }}
            >
              名前付きの汎用セットリストとして復習日数（オフセット日数）を管理できます
            </p>

            {/* 後方互換: 新API/テーブルが使えない場合は旧UI（科目別）を表示 */}
            {reviewSetError ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 px-4 py-3 text-sm text-amber-100/90">
                  {reviewSetError}
                </div>

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
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: colors.backgroundSecondary,
                          borderColor: colors.border,
                        }}
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
                          className="w-full flex items-center gap-3 mb-4 rounded-lg p-2 -m-2 transition-colors"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.cardHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span
                            className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            style={{ color: colors.textSecondary }}
                          >
                            ▶
                          </span>
                          <span
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: subject.color }}
                          />
                          <h4 
                            className="font-semibold text-left"
                            style={{ color: colors.textSecondary }}
                          >
                            {subject.name}
                          </h4>
                        </button>
                        
                        {isExpanded && (
                          <div className="space-y-2">
                            {timing.review_days.map((day, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <label 
                                  className="text-sm font-medium w-20"
                                  style={{ color: colors.textSecondary }}
                                >
                                  {index + 1}回目
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="365"
                                  value={day}
                                  onChange={(e) => handleReviewDayChange(subject.id, index, parseInt(e.target.value) || 1)}
                                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                                  style={{
                                    borderColor: colors.border,
                                    backgroundColor: colors.card,
                                    color: colors.textPrimary,
                                  }}
                                  onFocus={(e) => {
                                    e.currentTarget.style.borderColor = colors.accent;
                                    e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.accentLight}`;
                                  }}
                                  onBlur={(e) => {
                                    e.currentTarget.style.borderColor = colors.border;
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                  disabled={isSaving}
                                  placeholder="日数"
                                />
                                <span 
                                  className="text-sm w-12"
                                  style={{ color: colors.textSecondary }}
                                >
                                  日後
                                </span>
                                {index > 0 && (
                                  <button
                                    onClick={() => handleRemoveReviewDay(subject.id, index)}
                                    disabled={isSaving}
                                    className="p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                      color: colors.error,
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSaving) {
                                        e.currentTarget.style.backgroundColor = `${colors.error}1A`; // 10% opacity
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
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
                              className="mt-2 px-4 py-2 rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              style={{
                                color: colors.accent,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSaving) {
                                  e.currentTarget.style.backgroundColor = colors.accentLight;
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
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
            ) : (
              <div className="space-y-4">
                {/* 新規作成 */}
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  }}
                >
                  <div className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                    新しいセットリスト
                  </div>
                  <div className="flex flex-col gap-3">
                    <input
                      value={newSetListName}
                      onChange={(e) => setNewSetListName(e.target.value)}
                      placeholder="例: 短期復習セット"
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        color: colors.textPrimary,
                      }}
                      disabled={isSaving}
                    />
                    <input
                      value={newSetListOffsets}
                      onChange={(e) => setNewSetListOffsets(e.target.value)}
                      placeholder="オフセット日数（例: 1,3,7,14）"
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        color: colors.textPrimary,
                      }}
                      disabled={isSaving}
                    />
                    <button
                      onClick={async () => {
                        try {
                          setIsSaving(true);
                          const offsets = newSetListOffsets
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .map((s) => Number(s))
                            .filter((n) => Number.isFinite(n) && n >= 0)
                            .map((n) => Math.floor(n));

                          await reviewSetApi.create({
                            name: newSetListName.trim(),
                            items: offsets.map((o) => ({ offset_days: o })),
                          });
                          // 新運用に移行したら、旧セットへのフォールバックは禁止
                          try {
                            await settingsApi.createOrUpdate({
                              key: 'use_legacy_review_sets',
                              value: 'false',
                            });
                            setUseLegacyReviewSets(false);
                          } catch {
                            // backend側でも同等の制御をしているため無視してOK
                          }
                          setNewSetListName('');
                          setNewSetListOffsets('1,3,7');
                          await loadReviewSetLists();
                        } catch (e: any) {
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving || !newSetListName.trim()}
                      className="px-4 py-2 rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: colors.accent,
                        color: '#fff',
                      }}
                    >
                      作成
                    </button>
                  </div>
                </div>

                {/* 一覧（アコーディオン） */}
                {reviewSetLists.length === 0 ? (
                  <div className="text-sm" style={{ color: colors.textSecondary }}>
                    セットリストがありません
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewSetLists.map((list) => {
                      const st = reviewSetEdits[list.id];
                      const name = (st?.name ?? list.name) || '';
                      const isOpen = openReviewSetListId === list.id;
                      const saving = Boolean(st?.saving);

                      return (
                        <div
                          key={list.id}
                          className="rounded-xl border overflow-hidden"
                          style={{ borderColor: colors.border, backgroundColor: colors.backgroundSecondary }}
                        >
                          <button
                            type="button"
                            className="w-full px-4 py-3 flex items-center justify-between gap-3"
                            onClick={() => setOpenReviewSetListId((prev) => (prev === list.id ? null : list.id))}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.cardHover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div className="min-w-0 text-left">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="font-semibold truncate" style={{ color: colors.textPrimary }}>
                                  {name || '（名称未設定）'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                style={{ color: colors.textSecondary }}
                              >
                                ▼
                              </span>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-4 pb-4">
                              {/* name */}
                              <div className="mt-3">
                                <label className="block text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
                                  セットリスト名
                                </label>
                                <input
                                  value={st?.name ?? list.name}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setReviewSetEdits((prev) => ({
                                      ...prev,
                                      [list.id]: {
                                        ...(prev[list.id] ?? {
                                          name: list.name,
                                          items: (list.items || []).map((i) => ({ key: `id-${i.id}`, id: i.id, offsetRaw: String(i.offset_days) })),
                                          original: { name: list.name, offsets: list.items.map((i) => i.offset_days), itemIds: list.items.map((i) => i.id) },
                                          saving: false,
                                          error: null,
                                        }),
                                        name: v,
                                      },
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                                  style={{ borderColor: colors.border, backgroundColor: colors.card, color: colors.textPrimary }}
                                  disabled={saving}
                                />
                              </div>

                              {/* items */}
                              <div className="mt-4">
                                <label className="block text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
                                  オフセット日数
                                </label>
                                <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
                                  {(st?.items ?? []).map((it, idx) => (
                                    <div
                                      key={it.key}
                                      className="grid grid-cols-[72px_88px_44px_1fr] items-center gap-2"
                                    >
                                      <div className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                                        {idx + 1}回目
                                      </div>
                                      <input
                                        value={it.offsetRaw}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setReviewSetEdits((prev) => ({
                                            ...prev,
                                            [list.id]: {
                                              ...prev[list.id],
                                              items: prev[list.id].items.map((x) => (x.key === it.key ? { ...x, offsetRaw: v } : x)),
                                            },
                                          }));
                                        }}
                                        inputMode="numeric"
                                        className="px-3 py-2 border rounded-lg text-right tabular-nums focus:ring-2 focus:outline-none"
                                        style={{ borderColor: colors.border, backgroundColor: colors.card, color: colors.textPrimary }}
                                        disabled={saving}
                                      />
                                      <div className="text-sm" style={{ color: colors.textSecondary }}>
                                        {Number(it.offsetRaw) === 0 ? '当日' : '日後'}
                                      </div>
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          className="p-2 rounded-lg transition-colors"
                                          style={{ color: 'rgba(239,68,68,0.85)' }}
                                          disabled={saving || (st?.items?.length ?? 0) <= 1}
                                          title={(st?.items?.length ?? 0) <= 1 ? '最低1つは必要です' : '削除'}
                                          onClick={() => {
                                            setReviewSetEdits((prev) => ({
                                              ...prev,
                                              [list.id]: {
                                                ...prev[list.id],
                                                items: prev[list.id].items.filter((x) => x.key !== it.key),
                                              },
                                            }));
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!saving) e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                          }}
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {st?.error && (
                                  <div className="mt-3 rounded-lg border px-3 py-2 text-sm"
                                    style={{ borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.10)', color: 'rgba(254,202,202,0.95)' }}
                                  >
                                    {st.error}
                                  </div>
                                )}
                              </div>

                              {/* footer actions */}
                              <div className="mt-4 pt-3 border-t flex items-center justify-between gap-3"
                                style={{ borderColor: colors.border }}
                              >
                                <button
                                  type="button"
                                  className="px-3 py-2 rounded-lg font-semibold flex items-center gap-2"
                                  style={{ color: colors.accent }}
                                  disabled={saving}
                                  onClick={() => {
                                    setReviewSetEdits((prev) => {
                                      const cur = prev[list.id];
                                      const key = `new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                                      const last = cur.items[cur.items.length - 1]?.offsetRaw ?? '1';
                                      const nextDefault = String(Math.max(0, Math.floor(Number(last) + 1 || 1)));
                                      return {
                                        ...prev,
                                        [list.id]: { ...cur, items: [...cur.items, { key, offsetRaw: nextDefault }] },
                                      };
                                    });
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!saving) e.currentTarget.style.backgroundColor = colors.accentLight;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  ＋追加
                                </button>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg font-semibold"
                                    style={{ color: colors.textSecondary }}
                                    disabled={saving}
                                    onClick={() => {
                                      setReviewSetEdits((prev) => {
                                        const cur = prev[list.id];
                                        return {
                                          ...prev,
                                          [list.id]: {
                                            ...cur,
                                            name: cur.original.name,
                                            items: cur.original.offsets.map((o, idx) => ({
                                              key: `id-${cur.original.itemIds[idx]}`,
                                              id: cur.original.itemIds[idx],
                                              offsetRaw: String(o),
                                            })),
                                            error: null,
                                          },
                                        };
                                      });
                                    }}
                                  >
                                    リセット
                                  </button>
                                  <button
                                    type="button"
                                    className="px-4 py-2 rounded-lg font-semibold"
                                    style={{ backgroundColor: colors.accent, color: '#fff', opacity: saving ? 0.6 : 1 }}
                                    disabled={saving}
                                    onClick={async () => {
                                      setReviewSetEdits((prev) => ({
                                        ...prev,
                                        [list.id]: { ...prev[list.id], saving: true, error: null },
                                      }));
                                      try {
                                        const cur = reviewSetEdits[list.id];
                                        const nameTrim = cur.name.trim();
                                        if (!nameTrim) throw new Error('名称を入力してください');
                                        const norm = _normalizeOffsets(cur.items);
                                        if (!norm.ok) throw new Error(norm.error || '入力内容が不正です');

                                        // 1) name
                                        if (nameTrim !== cur.original.name.trim()) {
                                          await reviewSetApi.update(list.id, { name: nameTrim });
                                        }

                                        // 2) items diff
                                        // - 昇順で保存（UIも揃う）
                                        const sortedItems = [...cur.items]
                                          .map((it) => ({ ...it, offset: Math.floor(Number(it.offsetRaw)) }))
                                          .sort((a, b) => a.offset - b.offset);

                                        const existing = sortedItems.filter((i) => typeof i.id === 'number') as Array<EditItem & { id: number; offset: number }>;
                                        const toDelete = cur.original.itemIds.filter((id) => !existing.some((e) => e.id === id));
                                        for (const id of toDelete) await reviewSetApi.deleteItem(id);

                                        for (const it of existing) {
                                          // originalのoffsetを引いて更新判定
                                          const origIdx = cur.original.itemIds.indexOf(it.id);
                                          const origOffset = origIdx >= 0 ? cur.original.offsets[origIdx] : null;
                                          if (origOffset == null || origOffset !== it.offset) {
                                            await reviewSetApi.updateItem(it.id, it.offset);
                                          }
                                        }

                                        const newOnes = sortedItems.filter((i) => typeof i.id !== 'number') as Array<EditItem & { offset: number }>;
                                        for (const it of newOnes) {
                                          await reviewSetApi.createItem(list.id, it.offset);
                                        }

                                        await settingsApi.createOrUpdate({ key: 'use_legacy_review_sets', value: 'false' });
                                        setUseLegacyReviewSets(false);

                                        await loadReviewSetLists();
                                      } catch (e: any) {
                                        const msg = e?.userMessage || e?.message || '保存に失敗しました';
                                        setReviewSetEdits((prev) => ({
                                          ...prev,
                                          [list.id]: { ...prev[list.id], error: msg },
                                        }));
                                      } finally {
                                        setReviewSetEdits((prev) => ({
                                          ...prev,
                                          [list.id]: { ...prev[list.id], saving: false },
                                        }));
                                      }
                                    }}
                                  >
                                    保存
                                  </button>
                                  <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg font-semibold"
                                    style={{ color: colors.error }}
                                    disabled={saving}
                                    onClick={async () => {
                                      if (!confirm('このセットリストを削除しますか？')) return;
                                      try {
                                        setReviewSetEdits((prev) => ({
                                          ...prev,
                                          [list.id]: { ...prev[list.id], saving: true, error: null },
                                        }));
                                        await reviewSetApi.delete(list.id);
                                        await loadReviewSetLists();
                                        // 全削除後は旧フォールバックを無効化（復活防止）
                                        if (reviewSetLists.length <= 1) {
                                          await settingsApi.createOrUpdate({ key: 'use_legacy_review_sets', value: 'false' });
                                          setUseLegacyReviewSets(false);
                                        }
                                      } catch (err: any) {
                                      } finally {
                                        setReviewSetEdits((prev) => ({
                                          ...prev,
                                          [list.id]: { ...prev[list.id], saving: false },
                                        }));
                                      }
                                    }}
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 財務報告設定（復習セットリストの下に配置） */}
            <div className="mt-10 pt-6 border-t" style={{ borderColor: colors.border }}>
              <h4 className="text-lg font-semibold mb-2" style={{ color: colors.textSecondary }}>
                財務報告
              </h4>
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                設定した曜日にのみホーム画面で「財務報告」の通知が表示されます。
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                    報告開始曜日
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                    0=日曜〜6=土曜（デフォルトは月曜）
                  </p>
                </div>

                <select
                  value={reportStartDay}
                  disabled={isSaving}
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    if (Number.isNaN(next)) return;
                    saveReportStartDay(next);
                  }}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    color: colors.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.accentLight}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value={0}>日曜日</option>
                  <option value={1}>月曜日</option>
                  <option value={2}>火曜日</option>
                  <option value={3}>水曜日</option>
                  <option value={4}>木曜日</option>
                  <option value={5}>金曜日</option>
                  <option value={6}>土曜日</option>
                </select>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
