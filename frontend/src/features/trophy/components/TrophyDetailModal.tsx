import { AnimatePresence, motion } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import { Trophy, Zap, Sparkle, ScrollText, Clock, Flame, Lock, Moon } from 'lucide-react';
import type { ComponentType, MouseEvent as ReactMouseEvent } from 'react';
import type { Trophy as TrophyType } from '../../../types/trophy';

type Props = {
  isOpen: boolean;
  trophy: TrophyType | null;
  onClose: () => void;
};

const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, ComponentType<{ size?: number; className?: string }>> = {
    Trophy,
    Zap,
    Sparkle,
    ScrollText,
    Clock,
    Flame,
    Lock,
    Moon,
  };
  return iconMap[iconName] || Trophy;
};

export function TrophyDetailModal({ isOpen, trophy, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && trophy && (
        <Dialog open={true} onClose={onClose} className="relative z-[70]">
          {/* overlay */}
          <motion.div
            className="fixed inset-0"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ backgroundColor: 'rgba(0,0,0,0.62)' }}
            onClick={onClose}
          />

          {/* modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4" onClick={onClose}>
            <Dialog.Panel
              as={motion.div}
              className="w-full max-w-xl rounded-2xl border shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden"
              style={{
                backgroundColor: 'rgba(8, 14, 28, 0.96)',
                borderColor: 'rgba(255, 184, 0, 0.55)',
                backdropFilter: 'blur(12px)',
                backgroundImage:
                  'radial-gradient(320px 220px at 22% 18%, rgba(255,184,0,0.18), rgba(255,184,0,0.00) 60%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e: ReactMouseEvent) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center border"
                      style={{
                        borderColor: 'rgba(255,184,0,0.55)',
                        backgroundColor: 'rgba(255,184,0,0.10)',
                        color: '#FFB800',
                      }}
                      aria-hidden="true"
                    >
                      {(() => {
                        const Icon = getIconComponent(trophy.icon || 'Trophy');
                        return <Icon size={28} />;
                      })()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-start gap-2">
                        <Dialog.Title className="text-xl font-black truncate flex-1" style={{ color: 'rgba(226,232,240,0.96)' }}>
                          {trophy.title}
                        </Dialog.Title>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'rgba(226,232,240,0.70)' }}>
                        {trophy.unlockedAt
                          ? `獲得日: ${new Date(trophy.unlockedAt).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`
                          : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  {/* description */}
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(226,232,240,0.82)' }}>
                    {trophy.description}
                  </p>

                  {/* comment（ツッコミ吹き出し） */}
                  <div className="relative">
                    <div
                      className="absolute -top-1 left-10 w-2 h-2 rotate-45"
                      style={{
                        backgroundColor: 'rgba(255,184,0,0.10)',
                        borderLeft: '1px solid rgba(255,184,0,0.25)',
                        borderTop: '1px solid rgba(255,184,0,0.25)',
                      }}
                    />
                    <div
                      className="rounded-xl border px-4 py-3"
                      style={{
                        backgroundColor: 'rgba(255,184,0,0.08)',
                        borderColor: 'rgba(255,184,0,0.25)',
                      }}
                    >
                      <p className="text-sm italic leading-relaxed" style={{ color: 'rgba(226,232,240,0.92)' }}>
                        {trophy.comment || '（まーくんへの一言は未設定）'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}


