import { createContext, useContext, type ReactNode } from 'react';
import { TROPHIES } from '../constants/trophies';
import { useTrophySystem } from '../hooks/useTrophySystem';
import type { Trophy, TrophyTrigger } from '../types/trophy';

type TrophySystemContextValue = {
  trophies: Trophy[];
  fxQueue: Array<{ id: string; kind: 'unlock' }>;
  dequeueFx: (count: number) => void;
  unlockTrophy: (id: string, patch?: { metadata?: Record<string, any>; unlockedAt?: string }) => void;
  checkTrophies: (appState: any, opts?: { trigger?: TrophyTrigger }) => string[];
  handleTrophyEvent: (eventId: string, context?: any) => void;
  resetTrophies: () => void;
};

const TrophySystemContext = createContext<TrophySystemContextValue | undefined>(undefined);

export function TrophySystemProvider({ children }: { children: ReactNode }) {
  const sys = useTrophySystem({ trophies: TROPHIES, allowRepeatUnlock: false });
  const value: TrophySystemContextValue = {
    trophies: sys.trophies,
    fxQueue: sys.fxQueue,
    dequeueFx: sys.dequeueFx,
    unlockTrophy: sys.unlockTrophy,
    checkTrophies: sys.checkTrophies,
    handleTrophyEvent: sys.handleTrophyEvent,
    resetTrophies: sys.resetTrophies,
  };
  return <TrophySystemContext.Provider value={value}>{children}</TrophySystemContext.Provider>;
}

export function useTrophySystemContext() {
  const ctx = useContext(TrophySystemContext);
  if (!ctx) throw new Error('useTrophySystemContext must be used within TrophySystemProvider');
  return ctx;
}


