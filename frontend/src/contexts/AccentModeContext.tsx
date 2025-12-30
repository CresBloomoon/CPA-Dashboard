import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AccentMode = 'normal' | 'report';

type AccentModeContextType = {
  accentMode: AccentMode;
  setAccentMode: (mode: AccentMode) => void;
};

const AccentModeContext = createContext<AccentModeContextType | undefined>(undefined);

const REPORT_AMBER = '#FFB800';

export function AccentModeProvider({ children }: { children: ReactNode }) {
  const [accentMode, setAccentMode] = useState<AccentMode>('normal');

  useEffect(() => {
    // アプリ全体のアクセント（既存の colors.accent / accentHover をCSS変数で上書き）
    const root = document.documentElement;
    if (accentMode === 'report') {
      // 報告モード：静止・単色ゴールドに固定（グラデ/アニメは使わない）
      root.style.setProperty('--app-accent', REPORT_AMBER);
      root.style.setProperty('--app-accent-hover', '#E6A600');
      root.style.setProperty('--app-accent-light', 'rgba(255, 184, 0, 0.22)');
    } else {
      // 通常モード：従来の青（単色）
      root.style.setProperty('--app-accent', '#2563eb'); // blue-600
      root.style.setProperty('--app-accent-hover', '#3b82f6'); // blue-500
      root.style.setProperty('--app-accent-light', 'rgba(59, 130, 246, 0.18)');
    }
  }, [accentMode]);

  const value = useMemo(
    () => ({
      accentMode,
      setAccentMode,
    }),
    [accentMode]
  );

  return <AccentModeContext.Provider value={value}>{children}</AccentModeContext.Provider>;
}

export function useAccentMode() {
  const ctx = useContext(AccentModeContext);
  if (!ctx) throw new Error('useAccentMode must be used within AccentModeProvider');
  return ctx;
}


