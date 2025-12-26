import { createContext, useContext, type ReactNode } from 'react';
import { useTimerController, type UseTimerControllerResult } from './useTimerController';

const TimerContext = createContext<UseTimerControllerResult | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const value = useTimerController();
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within a TimerProvider');
  return ctx;
}


