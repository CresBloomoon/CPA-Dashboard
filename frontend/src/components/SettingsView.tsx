import { useState, useEffect, useRef } from 'react';
import { settingsApi } from '../api';
import type { Subject, ReviewTiming } from '../types';

interface SettingsViewProps {
  onSubjectsChange: (subjects: string[]) => void;
  onSubjectsWithColorsChange?: (subjects: Subject[]) => void;
  onDataUpdate?: () => void;
}

// デフォルトの色パレット（Googleカレンダー風）
const DEFAULT_COLORS = [
  '#4285F4', // 青
  '#EA4335', // 赤
  '#FBBC04', // 黄
  '#34A853', // 緑
  '#FF6D01', // オレンジ
  '#9334E6', // 紫
  '#E67C73', // ピンク
  '#7CB342', // ライムグリーン
  '#039BE5', // ライトブルー
  '#616161', // グレー
  '#F06292', // ピンク
  '#AB47BC', // パープル
];

type SettingsMenu = 'subjects' | 'review-timing' | 'google-calendar';

export default function SettingsView({ onSubjectsChange, onSubjectsWithColorsChange, onDataUpdate }: SettingsViewProps) {
  const [activeMenu, setActiveMenu] = useState<SettingsMenu>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState('primary');
  const [newSubject, setNewSubject] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
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
      const googleCalendarSetting = settings.find(s => s.key === 'google_calendar_enabled');
      if (googleCalendarSetting) {
        setGoogleCalendarEnabled(googleCalendarSetting.value === 'true');
      }
      const googleCalendarIdSetting = settings.find(s => s.key === 'google_calendar_id');
      if (googleCalendarIdSetting) {
        setGoogleCalendarId(googleCalendarIdSetting.value);
      }
      
      if (subjectsSetting) {
        try {
          const parsedSubjects = JSON.parse(subjectsSetting.value);
          if (Array.isArray(parsedSubjects) && parsedSubjects.length > 0) {
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
          } else {
            // デフォルト値を使用
            const defaultSubjects: Subject[] = ['財計', '財理', '管計', '管理', '企業法', '監査論', '租税法', '経営学'].map((name, index) => ({
              id: index + 1,
              name,
              color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
            }));
            setSubjects(defaultSubjects);
            onSubjectsChange(defaultSubjects.map(s => s.name));
            if (onSubjectsWithColorsChange) {
              onSubjectsWithColorsChange(defaultSubjects);
            }
          }
        } catch (parseError) {
          console.error('Error parsing subjects:', parseError);
          // デフォルト値を使用
          const defaultSubjects: Subject[] = ['財務会計', '管理会計', '監査論', '企業法', '租税法'].map((name, index) => ({
            id: index + 1,
            name,
            color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          }));
          setSubjects(defaultSubjects);
          onSubjectsChange(defaultSubjects.map(s => s.name));
        }
      } else {
        // デフォルト値を使用
        const defaultSubjects: Subject[] = ['財務会計', '管理会計', '監査論', '企業法', '租税法'].map((name, index) => ({
          id: index + 1,
          name,
          color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        }));
        setSubjects(defaultSubjects);
        onSubjectsChange(defaultSubjects.map(s => s.name));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // デフォルト値を使用
      const defaultSubjects: Subject[] = ['財務会計', '管理会計', '監査論', '企業法', '租税法'].map((name, index) => ({
        id: index + 1,
        name,
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      }));
      setSubjects(defaultSubjects);
      onSubjectsChange(defaultSubjects.map(s => s.name));
    } finally {
      setIsLoading(false);
    }
  };

  const saveSubjects = async (subjectsToSave: Subject[]) => {
    try {
      setIsSaving(true);
      await settingsApi.createOrUpdate({
        key: 'subjects',
        value: JSON.stringify(subjectsToSave),
      });
      onSubjectsChange(subjectsToSave.map(s => s.name));
      if (onSubjectsWithColorsChange) {
        onSubjectsWithColorsChange(subjectsToSave);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
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
  };

  const handleRemoveSubject = async (index: number) => {
    const updatedSubjects = subjects.filter((_, i) => i !== index);
    setSubjects(updatedSubjects);
    await saveSubjects(updatedSubjects);
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
            setReviewTimings(parsed as ReviewTiming[]);
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
      const popupWidth = 200; // カラーピッカーの幅（おおよそ）
      // 科目名の左側に表示
      setColorPickerPosition({ 
        top: rect.top, 
        left: rect.left - popupWidth - 8 
      });
    }
    setColorPickerIndex(colorPickerIndex === index ? null : index);
  };

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      return;
    }
    
    setDragOverIndex(index);
  };

  // ドラッグリーブ
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return;
    }
    setDragOverIndex(null);
  };

  // ドロップ
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updatedSubjects = [...subjects];
    const [removed] = updatedSubjects.splice(draggedIndex, 1);
    updatedSubjects.splice(dropIndex, 0, removed);
    setSubjects(updatedSubjects);
    await saveSubjects(updatedSubjects);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ドラッグ終了
  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
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

  return (
    <div className="flex h-full min-h-[600px]">
      {/* 左側サイドバー - 画面左端に配置 */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">設定</h2>
            <nav className="space-y-2">
              <button
                onClick={() => setActiveMenu('subjects')}
                className={`w-full text-left px-6 py-4 rounded-lg transition-colors text-lg ${
                  activeMenu === 'subjects'
                    ? 'bg-blue-500 text-white font-semibold shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                科目
              </button>
              <button
                onClick={() => {
                  setActiveMenu('review-timing');
                  loadReviewTimings();
                }}
                className={`w-full text-left px-6 py-4 rounded-lg transition-colors text-lg ${
                  activeMenu === 'review-timing'
                    ? 'bg-blue-500 text-white font-semibold shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                復習セットリスト
              </button>
              <button
                onClick={() => {
                  setActiveMenu('google-calendar');
                  loadSettings();
                }}
                className={`w-full text-left px-6 py-4 rounded-lg transition-colors text-lg ${
                  activeMenu === 'google-calendar'
                    ? 'bg-blue-500 text-white font-semibold shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Googleカレンダー連携
              </button>
              {/* 今後追加する設定項目はここに追加 */}
            </nav>
        </div>
      </div>

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
        <div className="space-y-2">
          {subjects.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">科目が登録されていません</p>
          ) : (
            subjects.map((subject, index) => (
              <div
                key={subject.id}
                draggable={editingIndex === null && colorPickerIndex === null}
                onDragStart={(e) => {
                  if (editingIndex === null && colorPickerIndex === null) {
                    handleDragStart(e, index);
                  } else {
                    e.preventDefault();
                  }
                }}
                onDragOver={(e) => {
                  if (editingIndex === null && colorPickerIndex === null) {
                    handleDragOver(e, index);
                  } else {
                    e.preventDefault();
                  }
                }}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  if (editingIndex === null && colorPickerIndex === null) {
                    handleDrop(e, index);
                  } else {
                    e.preventDefault();
                  }
                }}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 ${
                  editingIndex === null && colorPickerIndex === null ? 'cursor-move' : 'cursor-default'
                } ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverIndex === index && draggedIndex !== index ? 'bg-blue-100 border-2 border-blue-400 transform translate-y-0' : ''
                }`}
              >
                <div className="flex-shrink-0 text-gray-400">
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
                          handleSaveEdit(index);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white rounded border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      disabled={isSaving}
                    />
                    <button
                      onClick={() => handleSaveEdit(index)}
                      disabled={isSaving}
                      className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="保存"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCancelEdit}
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
                        onClick={(e) => handleColorButtonClick(e, index)}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: subject.color }}
                        title="色を変更"
                      />
                    </div>
                    {colorPickerIndex === index && colorPickerPosition && (
                      <>
                        {/* オーバーレイ（背景クリックで閉じる） */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => {
                            setColorPickerIndex(null);
                            setColorPickerPosition(null);
                          }}
                        />
                        {/* カラーピッカー - fixedポジショニングで重なりを防ぐ */}
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
                                  handleColorChange(index, color);
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
                      onClick={() => handleStartEdit(index)}
                      title="クリックして編集"
                    >
                      {subject.name}
                    </div>
                    <button
                      onClick={() => handleStartEdit(index)}
                      disabled={isSaving}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="編集"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveSubject(index)}
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
            ))
          )}
        </div>

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

        {activeMenu === 'google-calendar' && (
          <div className="bg-white rounded-lg shadow-lg p-6 h-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Googleカレンダー連携</h3>
            <p className="text-sm text-gray-600 mb-6">
              リマインダを作成すると、自動的にGoogleカレンダーにイベントとして追加されます。
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Googleカレンダー連携を有効にする
                  </label>
                  <p className="text-xs text-gray-500">
                    有効にすると、リマインダ作成時にGoogleカレンダーに自動でイベントが追加されます
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={googleCalendarEnabled}
                    onChange={async (e) => {
                      const newValue = e.target.checked;
                      setGoogleCalendarEnabled(newValue);
                      try {
                        setIsSaving(true);
                        await settingsApi.createOrUpdate({
                          key: 'google_calendar_enabled',
                          value: newValue.toString(),
                        });
                      } catch (error) {
                        console.error('Error saving Google Calendar setting:', error);
                        setGoogleCalendarEnabled(!newValue); // エラー時は元に戻す
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  カレンダーID
                </label>
                <input
                  type="text"
                  value={googleCalendarId}
                  onChange={(e) => setGoogleCalendarId(e.target.value)}
                  onBlur={async () => {
                    try {
                      setIsSaving(true);
                      await settingsApi.createOrUpdate({
                        key: 'google_calendar_id',
                        value: googleCalendarId || 'primary',
                      });
                    } catch (error) {
                      console.error('Error saving calendar ID:', error);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  placeholder="primary（デフォルト）またはカレンダーID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSaving || !googleCalendarEnabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  デフォルトは「primary」（プライマリカレンダー）です。他のカレンダーを使用する場合は、カレンダーIDを入力してください。
                </p>
              </div>

              {googleCalendarEnabled && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">初回セットアップ（1回のみ）</h4>
                  <ol className="text-xs text-blue-700 space-y-2 list-decimal list-inside">
                    <li>Google Cloud Consoleでプロジェクトを作成</li>
                    <li>Google Calendar APIを有効化</li>
                    <li>OAuth 2.0認証情報を作成（デスクトップアプリ）</li>
                    <li>credentials.jsonをダウンロードして、バックエンドのルートディレクトリに配置</li>
                    <li>バックエンドを再起動すると、初回のみブラウザで認証が求められます</li>
                    <li>認証後は自動で同期されます</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
