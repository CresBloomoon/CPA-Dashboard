import { useState } from 'react';
import { settingsApi } from '../api/api';
import type { Subject } from '../api/types';
import { DEFAULT_SUBJECTS, SUBJECT_COLOR_PALETTE } from '../config/subjects';

/**
 * アプリの設定読み込みロジック
 */
export const useAppSettings = () => {
  // 空配列から開始し、DBの最新状態を正として扱う（デフォルト値での上書きを防止）
  const [subjectsWithColors, setSubjectsWithColors] = useState<Subject[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  // 財務報告：報告開始曜日（0=日〜6=土、デフォルト=月）
  const [reportStartDay, setReportStartDay] = useState<number>(1);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  const loadSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const settings = await settingsApi.getAll();
      const subjectsSetting = settings.find(s => s.key === 'subjects');
      const reportStartDaySetting = settings.find(s => s.key === 'reportStartDay');

      if (reportStartDaySetting) {
        try {
          const parsed: unknown = JSON.parse(reportStartDaySetting.value);
          const next =
            typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0 && parsed <= 6
              ? Math.floor(parsed)
              : 1;
          setReportStartDay(next);
        } catch (error) {
          console.error('Error parsing reportStartDay:', error);
          setReportStartDay(1);
        }
      } else {
        setReportStartDay(1);
      }
      if (subjectsSetting) {
        const parsedSubjects: unknown = JSON.parse(subjectsSetting.value);
        // Subject型の配列か、文字列の配列かを判定
        if (Array.isArray(parsedSubjects)) {
          // 空配列も正常な状態として扱う（ユーザーが全削除した場合）
          if (parsedSubjects.length === 0) {
            setSubjectsWithColors([]);
            setSubjects([]);
          } else {
            const first = parsedSubjects[0] as unknown;
            if (first && typeof first === 'object' && first !== null && 'id' in (first as Record<string, unknown>)) {
              const nextSubjects = parsedSubjects as Subject[];
              const visibleSubjects = nextSubjects.filter((s) => s.visible !== false);
              setSubjectsWithColors(nextSubjects);
              setSubjects(visibleSubjects.map((s) => s.name));
          } else {
            // 文字列配列の場合は名前のみを設定（色情報なし）
              const names = parsedSubjects as string[];
              const converted: Subject[] = names.map((name, index) => ({
                id: index + 1,
                name,
                color: SUBJECT_COLOR_PALETTE[index % SUBJECT_COLOR_PALETTE.length] ?? SUBJECT_COLOR_PALETTE[0]!,
                visible: true,
              }));
              const visibleSubjects = converted.filter((s) => s.visible !== false);
              setSubjectsWithColors(converted);
              setSubjects(visibleSubjects.map((s) => s.name));
            }
          }
        }
      } else {
        // 設定が存在しない場合はデフォルト科目を使用（追加/削除を禁止したため）
        const seeded = DEFAULT_SUBJECTS.map((s) => ({ ...s, visible: true }));
        setSubjectsWithColors(seeded);
        setSubjects(seeded.map((s) => s.name));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // エラー時はデフォルト科目にフォールバック
      const seeded = DEFAULT_SUBJECTS.map((s) => ({ ...s, visible: true }));
      setSubjectsWithColors(seeded);
      setSubjects(seeded.map((s) => s.name));
    } finally {
      setIsLoadingSettings(false);
    }
  };

  return {
    subjects,
    subjectsWithColors,
    setSubjects,
    setSubjectsWithColors,
    reportStartDay,
    setReportStartDay,
    loadSettings,
    isLoadingSettings,
  };
};


