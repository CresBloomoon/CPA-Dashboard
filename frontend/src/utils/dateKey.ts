import { format, parseISO } from 'date-fns';

/**
 * API/DB由来の日時文字列を「UTCとして」解釈して Date に変換する。
 * - SQLite/サーバーがタイムゾーン無しでUTC相当の値を返すケースで、JST等のローカル日付が1日ズレるのを防ぐ。
 * - 既にタイムゾーン情報（Z / +09:00 等）が付いている場合はそのまま解釈する。
 */
export function parseApiDateTime(raw: string): Date {
  const s = String(raw ?? '').trim();
  if (!s) return new Date(NaN);

  // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
  const withT = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s;

  // 6桁以上の小数秒（SQLite/サーバー由来）をdate-fns/JSが解釈できる3桁に丸める
  // 例: 2025-12-27T15:00:00.123456 -> 2025-12-27T15:00:00.123
  const normalized = withT.replace(
    /(\.\d{3})\d+(?=([zZ]|[+-]\d{2}:?\d{2})?$)/,
    '$1'
  );

  // 末尾にTZが付いていればそのまま、無ければUTC扱いでZを付与
  const hasTZ = /([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized);
  const iso = hasTZ ? normalized : `${normalized}Z`;
  const d = parseISO(iso);
  if (!Number.isNaN(d.getTime())) return d;
  // 最終フォールバック（環境差・文字列揺れ対策）
  return new Date(iso);
}

/** ローカルタイムゾーン基準の yyyy-MM-dd キー */
export function toLocalDateKeyFromApi(raw: string): string {
  return format(parseApiDateTime(raw), 'yyyy-MM-dd');
}

/** ローカルタイムゾーン基準の yyyy-MM-dd キー（Date→key） */
export function toLocalDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}


