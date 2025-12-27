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
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  const loadSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const settings = await settingsApi.getAll();
      const subjectsSetting = settings.find(s => s.key === 'subjects');
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
              setSubjectsWithColors(nextSubjects);
              setSubjects(nextSubjects.map(s => s.name));
            } else {
              // 文字列配列の場合は名前のみを設定（色情報なし）
              const names = parsedSubjects as string[];
              const converted: Subject[] = names.map((name, index) => ({
                id: index + 1,
                name,
                color: SUBJECT_COLOR_PALETTE[index % SUBJECT_COLOR_PALETTE.length] ?? SUBJECT_COLOR_PALETTE[0]!,
              }));
              setSubjectsWithColors(converted);
              setSubjects(converted.map((s) => s.name));
            }
          }
        }
      } else {
        // 設定が存在しない場合は空配列のまま（ユーザーが設定画面で追加する）
        setSubjectsWithColors([]);
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // エラー時も空配列を維持（ユーザーが設定画面で追加する）
      setSubjectsWithColors([]);
      setSubjects([]);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  return {
    subjects,
    subjectsWithColors,
    setSubjects,
    setSubjectsWithColors,
    loadSettings,
    isLoadingSettings,
  };
};


