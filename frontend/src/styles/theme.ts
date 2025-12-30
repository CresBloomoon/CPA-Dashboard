/**
 * Design Tokens for Theme System
 * 
 * テーマシステム用のデザイントークン定義。
 * 将来的な「トロフィーによるテーマ解放機能」に対応するため、
 * UI（見た目）とロジックを分離し、テーマごとのスタイルを一元管理します。
 */

export type Theme = 'light' | 'modern';

interface ColorPalette {
  // Background colors
  background: string;
  backgroundSecondary: string;
  card: string;
  cardGlass: string;
  cardHover: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Border colors
  border: string;
  borderSecondary: string;
  borderFocus: string;
  
  // Accent colors (共通で使用)
  accent: string;
  accentHover: string;
  accentLight: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Interactive elements
  button: string;
  buttonHover: string;
  buttonActive: string;
  buttonDisabled: string;
  
  // Overlay
  overlay: string;
  overlayDark: string;
}

interface ThemeTokens {
  colors: ColorPalette;
}

export const themes: Record<Theme, ThemeTokens> = {
  light: {
    colors: {
      // Background colors
      background: '#ffffff',
      backgroundSecondary: '#f9fafb', // gray-50
      card: '#ffffff',
      cardGlass: 'rgba(255, 255, 255, 0.95)',
      cardHover: '#f3f4f6', // gray-100
      
      // Text colors
      textPrimary: '#111827', // gray-900
      textSecondary: '#374151', // gray-700
      textTertiary: '#6b7280', // gray-500
      textInverse: '#ffffff',
      
      // Border colors
      border: '#e5e7eb', // gray-200
      borderSecondary: '#d1d5db', // gray-300
      borderFocus: '#3b82f6', // blue-500
      
      // Accent colors
      accent: '#3b82f6', // blue-500
      accentHover: '#2563eb', // blue-600
      accentLight: '#dbeafe', // blue-100
      
      // Status colors
      success: '#10b981', // green-500
      warning: '#f59e0b', // amber-500
      error: '#ef4444', // red-500
      info: '#3b82f6', // blue-500
      
      // Interactive elements
      button: '#3b82f6', // blue-500
      buttonHover: '#2563eb', // blue-600
      buttonActive: '#1d4ed8', // blue-700
      buttonDisabled: '#9ca3af', // gray-400
      
      // Overlay
      overlay: 'rgba(0, 0, 0, 0.5)',
      overlayDark: 'rgba(0, 0, 0, 0.75)',
    },
  },
  modern: {
    colors: {
      // Background colors (ダークテーマ)
      background: '#0f172a', // slate-900
      backgroundSecondary: '#1e293b', // slate-800
      card: 'rgba(30, 41, 59, 0.5)', // slate-800/50
      cardGlass: 'rgba(255, 255, 255, 0.05)',
      cardHover: 'rgba(30, 41, 59, 0.6)', // slate-800/60
      
      // Text colors
      textPrimary: '#f1f5f9', // slate-100
      textSecondary: '#e2e8f0', // slate-200
      textTertiary: '#cbd5e1', // slate-300
      textInverse: '#0f172a', // slate-900
      
      // Border colors
      border: 'rgba(226, 232, 240, 0.2)', // slate-200/20
      borderSecondary: 'rgba(148, 163, 184, 0.3)', // slate-400/30
      borderFocus: 'rgba(56, 189, 248, 0.5)', // sky-400/50
      
      // Accent colors (sky系で統一)
      accent: '#38bdf8', // sky-400
      accentHover: '#0ea5e9', // sky-500
      accentLight: 'rgba(56, 189, 248, 0.18)', // sky-400/18
      
      // Status colors
      success: '#22c55e', // green-500
      warning: '#f59e0b', // amber-500
      error: '#ef4444', // red-500
      info: '#38bdf8', // sky-400
      
      // Interactive elements
      button: 'rgba(30, 41, 59, 0.5)', // slate-800/50
      buttonHover: 'rgba(30, 41, 59, 0.6)', // slate-800/60
      buttonActive: 'rgba(15, 23, 42, 0.45)', // slate-900/45
      buttonDisabled: 'rgba(148, 163, 184, 0.3)', // slate-400/30
      
      // Overlay
      overlay: 'rgba(0, 0, 0, 0.5)',
      overlayDark: 'rgba(0, 0, 0, 0.85)',
    },
  },
} as const;

/**
 * テーマに応じたカラーパレットを取得
 */
export function getThemeColors(theme: Theme): ColorPalette {
  const base = themes[theme].colors;
  // Accentはモード（通常/報告）で動的に切り替えられるようCSS変数を優先
  return {
    ...base,
    accent: `var(--app-accent, ${base.accent})`,
    accentHover: `var(--app-accent-hover, ${base.accentHover})`,
    accentLight: `var(--app-accent-light, ${base.accentLight})`,
  };
}

/**
 * CSS変数として使用できる形式に変換
 * (将来的にCSS変数を使用する場合のヘルパー)
 */
export function themeToCSSVariables(theme: Theme): Record<string, string> {
  const colors = themes[theme].colors;
  return {
    '--color-background': colors.background,
    '--color-background-secondary': colors.backgroundSecondary,
    '--color-card': colors.card,
    '--color-card-glass': colors.cardGlass,
    '--color-card-hover': colors.cardHover,
    '--color-text-primary': colors.textPrimary,
    '--color-text-secondary': colors.textSecondary,
    '--color-text-tertiary': colors.textTertiary,
    '--color-text-inverse': colors.textInverse,
    '--color-border': colors.border,
    '--color-border-secondary': colors.borderSecondary,
    '--color-border-focus': colors.borderFocus,
    '--color-accent': colors.accent,
    '--color-accent-hover': colors.accentHover,
    '--color-accent-light': colors.accentLight,
    '--color-success': colors.success,
    '--color-warning': colors.warning,
    '--color-error': colors.error,
    '--color-info': colors.info,
    '--color-button': colors.button,
    '--color-button-hover': colors.buttonHover,
    '--color-button-active': colors.buttonActive,
    '--color-button-disabled': colors.buttonDisabled,
    '--color-overlay': colors.overlay,
    '--color-overlay-dark': colors.overlayDark,
  };
}

