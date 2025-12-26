import { useState } from 'react';
import { settingsApi } from '../api';
import type { Subject } from '../types';

/**
 * アプリの設定読み込みロジック
 */
export const useAppSettings = () => {
  const [subjects, setSubjects] = useState<string[]>(['財計', '財理', '管計', '管理', '企業法', '監査論', '租税法', '経営学']);
  const [subjectsWithColors, setSubjectsWithColors] = useState<Subject[]>([]);

  const loadSettings = async () => {
    try {
      const settings = await settingsApi.getAll();
      const subjectsSetting = settings.find(s => s.key === 'subjects');
      if (subjectsSetting) {
        const parsedSubjects = JSON.parse(subjectsSetting.value);
        // Subject型の配列か、文字列の配列かを判定
        if (Array.isArray(parsedSubjects) && parsedSubjects.length > 0) {
          if (parsedSubjects[0] && typeof parsedSubjects[0] === 'object' && 'id' in parsedSubjects[0]) {
            setSubjectsWithColors(parsedSubjects as Subject[]);
            setSubjects((parsedSubjects as Subject[]).map(s => s.name));
          } else {
            // 文字列配列の場合は名前のみを設定（色情報なし）
            setSubjects(parsedSubjects as string[]);
            setSubjectsWithColors([]);
          }
        }
      } else {
        // 設定が存在しない場合は空にする
        setSubjectsWithColors([]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // エラー時はデフォルト値を使用
      setSubjectsWithColors([]);
    }
  };

  return {
    subjects,
    subjectsWithColors,
    setSubjects,
    setSubjectsWithColors,
    loadSettings,
  };
};


