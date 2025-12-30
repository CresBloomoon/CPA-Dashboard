import { toLocalDateKey } from '../../../utils/dateKey';

export const STUDY_TIME_SYNC_STORAGE_KEY = 'studyTimerSyncState';

export type StudyTimeSyncSessionState = {
  clientSessionId: string;
  lastSyncedTotalMs: number;
  lastSyncAtMs: number;
};

export type StudyTimeSyncState = {
  /** yyyy-MM-dd（端末ローカル） */
  dateKey: string;
  /** subjectごとの同期セッション */
  sessions: Record<string, StudyTimeSyncSessionState>;
};

export function createEmptySyncState(now = new Date()): StudyTimeSyncState {
  return { dateKey: toLocalDateKey(now), sessions: {} };
}

export function getOrCreateSession(
  state: StudyTimeSyncState,
  subject: string,
  nowMs: number
): { next: StudyTimeSyncState; session: StudyTimeSyncSessionState } {
  const existing = state.sessions[subject];
  if (existing) return { next: state, session: existing };

  const clientSessionId =
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sess_${nowMs}_${Math.random().toString(16).slice(2)}`);

  const session: StudyTimeSyncSessionState = {
    clientSessionId,
    lastSyncedTotalMs: 0,
    lastSyncAtMs: 0,
  };

  return {
    next: { ...state, sessions: { ...state.sessions, [subject]: session } },
    session,
  };
}

export function loadSyncState(now = new Date()): StudyTimeSyncState {
  const todayKey = toLocalDateKey(now);
  try {
    const raw = localStorage.getItem(STUDY_TIME_SYNC_STORAGE_KEY);
    if (!raw) return createEmptySyncState(now);
    const parsed = JSON.parse(raw) as Partial<StudyTimeSyncState>;
    if (!parsed || typeof parsed !== 'object') return createEmptySyncState(now);
    const dateKey = typeof parsed.dateKey === 'string' ? parsed.dateKey : todayKey;
    const sessions = parsed.sessions && typeof parsed.sessions === 'object' ? (parsed.sessions as any) : {};
    // 日付が変わっていたらリセット（studyTimerState自体は触らない）
    if (dateKey !== todayKey) return createEmptySyncState(now);
    return { dateKey, sessions };
  } catch {
    return createEmptySyncState(now);
  }
}

export function saveSyncState(state: StudyTimeSyncState): void {
  try {
    localStorage.setItem(STUDY_TIME_SYNC_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
}


