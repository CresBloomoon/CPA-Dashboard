import type { Subject } from '../api/types';

/**
 * 科目カラーのパレット（設定画面・各画面で共通利用）
 * - Tailwindの色名ではなくHEXで統一（DB保存/インラインstyleに安全）
 */
export const SUBJECT_COLOR_PALETTE: readonly string[] = [
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

/** 色が不明な場合のフォールバック（UIが壊れないことを最優先） */
export const SUBJECT_COLOR_FALLBACK = '#9ca3af'; // gray-400相当

/**
 * DB初期化時/設定未取得時のデフォルト科目（id/name/color）
 * - ここを変えるだけでアプリ全体の初期値が変わるようにする
 */
export const DEFAULT_SUBJECTS: readonly Subject[] = [
  { id: 1, name: '財務会計', color: SUBJECT_COLOR_PALETTE[0] },
  { id: 2, name: '管理会計', color: SUBJECT_COLOR_PALETTE[1] },
  { id: 3, name: '監査論', color: SUBJECT_COLOR_PALETTE[2] },
  { id: 4, name: '企業法', color: SUBJECT_COLOR_PALETTE[3] },
  { id: 5, name: '租税法', color: SUBJECT_COLOR_PALETTE[4] },
];

/**
 * 過去の保存データ（LocalStorage等）との互換のための科目名エイリアス
 * - DBの科目名（DEFAULT_SUBJECTS/設定画面）に寄せる
 */
export const SUBJECT_NAME_ALIASES: Record<string, string> = {
  財計: '財務会計',
  財理: '財務会計',
  管計: '管理会計',
  管理: '管理会計',
};


