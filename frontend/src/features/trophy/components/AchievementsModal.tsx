import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import { Trophy, Zap, Sparkle, ScrollText, Clock, Flame, Lock } from 'lucide-react';
import { useTrophySystemContext } from '../../../contexts/TrophySystemContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';
import { ANIMATION_THEME } from '../../../config/appConfig';

// 新着判定（獲得から24時間以内）
const isNewTrophy = (unlockedAt: string | null): boolean => {
  if (!unlockedAt) return false;
  const unlockedTime = new Date(unlockedAt).getTime();
  const now = Date.now();
  const hours24 = 24 * 60 * 60 * 1000;
  return now - unlockedTime < hours24;
};
import type { Trophy as TrophyType } from '../../../types/trophy';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// アイコン名からLucideアイコンコンポーネントを取得
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Trophy,
    Zap,
    Sparkle,
    ScrollText,
    Clock,
    Flame,
  };
  return iconMap[iconName] || Trophy;
};

export function AchievementsModal({ isOpen, onClose }: AchievementsModalProps) {
  const { trophies } = useTrophySystemContext();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  // Escキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // 獲得済みと未獲得でソート（獲得済みを先に表示）
  const sortedTrophies = useMemo(() => {
    return [...trophies].sort((a, b) => {
      if (a.unlockedAt && !b.unlockedAt) return -1;
      if (!a.unlockedAt && b.unlockedAt) return 1;
      return 0;
    });
  }, [trophies]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={true} onClose={onClose} className="relative z-[60]">
          {/* オーバーレイ */}
          <motion.div
            className="fixed inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_THEME.DURATIONS_S.FADE }}
            onClick={onClose}
          />

          {/* モーダルコンテンツ */}
          <div className="fixed inset-0 flex items-center justify-center p-4" onClick={onClose}>
            <Dialog.Panel
              as={motion.div}
              className="w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{
                backgroundColor: 'rgba(8, 14, 28, 0.92)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={ANIMATION_THEME.SPRINGS.MODAL}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="px-8 py-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.10)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <Dialog.Title className="text-2xl font-extrabold" style={{ color: '#FFB800' }}>
                      実績一覧
                    </Dialog.Title>
                    <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                      {trophies.filter((t) => t.unlockedAt).length} / {trophies.length} 獲得
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: colors.textSecondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.cardHover;
                      e.currentTarget.style.color = colors.textPrimary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = colors.textSecondary;
                    }}
                    aria-label="閉じる"
                  >
                    <span className="text-2xl leading-none">×</span>
                  </button>
                </div>
              </div>

              {/* コンテンツ */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedTrophies.map((trophy) => {
                    const isUnlocked = Boolean(trophy.unlockedAt);
                    const isNew = isUnlocked && isNewTrophy(trophy.unlockedAt);
                    const isSecret = trophy.isSecret && !isUnlocked;
                    const IconComponent = isSecret ? Lock : getIconComponent(trophy.icon);

                    return (
                      <motion.div
                        key={trophy.id}
                        className="rounded-xl border overflow-hidden transition-all relative"
                        style={{
                          borderLeft: isUnlocked ? '2px solid #FFB800' : '1px solid rgba(255, 255, 255, 0.10)',
                          borderTop: '1px solid rgba(255, 255, 255, 0.10)',
                          borderRight: '1px solid rgba(255, 255, 255, 0.10)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.10)',
                          backgroundColor: isUnlocked
                            ? 'rgba(255, 184, 0, 0.05)'
                            : 'rgba(15, 23, 42, 0.45)',
                          opacity: isUnlocked ? 1 : 0.6,
                        }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >

                        <div className="p-4">
                          {/* アイコン */}
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center border mb-3"
                            style={{
                              borderColor: isUnlocked ? '#FFB800' : 'rgba(255, 255, 255, 0.10)',
                              backgroundColor: isUnlocked
                                ? 'rgba(255, 184, 0, 0.10)'
                                : 'rgba(255, 255, 255, 0.05)',
                              color: isUnlocked ? '#FFB800' : colors.textTertiary,
                            }}
                          >
                            <IconComponent size={24} />
                          </div>

                          {/* タイトル */}
                          <div className="flex items-start gap-2 mb-1">
                            <h3
                              className="text-sm font-extrabold flex-1"
                              style={{
                                color: isUnlocked ? colors.textPrimary : colors.textTertiary,
                              }}
                            >
                              {isSecret ? '？？？' : trophy.title}
                            </h3>
                            {/* 新着バッジ */}
                            {isNew && (
                              <span
                                className="text-xs leading-none mt-0.5"
                                style={{ color: '#FFB800' }}
                              >
                                ●
                              </span>
                            )}
                          </div>

                          {/* 説明 */}
                          <p
                            className="text-xs leading-relaxed"
                            style={{
                              color: isUnlocked
                                ? 'rgba(226, 232, 240, 0.78)'
                                : colors.textTertiary,
                            }}
                          >
                            {isSecret ? '隠し実績（未解放）' : trophy.description}
                          </p>

                          {/* 獲得日時（獲得済みの場合） */}
                          {isUnlocked && trophy.unlockedAt && (
                            <p
                              className="text-[10px] mt-2"
                              style={{ color: colors.textTertiary }}
                            >
                              {new Date(trophy.unlockedAt).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

