import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, Zap, Sparkle, ScrollText, Clock, Flame, Lock, Moon } from 'lucide-react';
import { useTrophySystemContext } from '../../../contexts/TrophySystemContext';
import { TROPHY_CONFIG } from '../config/trophyConfig';

const itemVariants = {
  initial: { opacity: 0, x: '100vw' as const, scale: 0.9 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 420, damping: 34 },
  },
  exit: {
    opacity: 0,
    x: '100vw' as const,
    scale: 0.98,
    transition: { duration: TROPHY_CONFIG.EXIT_S, ease: [0.16, 1, 0.3, 1] },
  },
};

// アイコン名からLucideアイコンコンポーネントを取得
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

// インスタンスIDを生成（trophyId + タイムスタンプ + ランダム値）
const generateInstanceId = (trophyId: string): string => {
  return `${trophyId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export function TrophyQueueSidebar({ topOffsetPx = 96 }: { topOffsetPx?: number }) {
  const { trophies, fxQueue, dequeueFx } = useTrophySystemContext();
  const trophyById = useMemo(() => new Map(trophies.map((t) => [t.id, t])), [trophies]);

  const [visibleItems, setVisibleItems] = useState<Array<{ instanceId: string; trophyId: string }>>([]);
  const timersRef = useRef<{ start?: number; interval?: number }>({});

  // fxQueue から一括で取り込み（ディレイなしで全員表示）
  // 各トロフィーIDに対してユニークなインスタンスIDを生成して追加
  useEffect(() => {
    if (!fxQueue.length) return;
    
    // fxQueueから最大MAX_VISIBLE個まで取り込む
    const incoming = fxQueue.slice(0, TROPHY_CONFIG.MAX_VISIBLE);
    dequeueFx(incoming.length);

    // 関数型アップデートで、前の状態を保持しながら新しいインスタンスを追加
    setVisibleItems((prev) => {
      const next = [...prev];
      
      // 現在の表示数と追加可能数を計算
      const currentCount = next.length;
      const availableSlots = TROPHY_CONFIG.MAX_VISIBLE - currentCount;
      
      if (availableSlots <= 0) return prev;
      
      // 追加可能な分だけ、各トロフィーIDに対してユニークなインスタンスIDを生成
      const toAdd = incoming.slice(0, availableSlots);
      for (const ev of toAdd) {
        const instanceId = generateInstanceId(ev.id);
        next.push({ instanceId, trophyId: ev.id });
      }
      
      return next;
    });
  }, [dequeueFx, fxQueue]);

  // 表示後：一定待機→上から順に一定間隔で消滅
  useEffect(() => {
    // visibleIds が変わるたびに、必ずタイマーを再始動する
    // - 複数同時獲得や追加獲得が続いた場合でも、最新の visibleIds.length に基づいて待機→消滅を安定させる
    if (timersRef.current.start) window.clearTimeout(timersRef.current.start);
    if (timersRef.current.interval) window.clearInterval(timersRef.current.interval);
    timersRef.current = {};

    if (!visibleItems.length) return;

    timersRef.current.start = window.setTimeout(() => {
      timersRef.current.interval = window.setInterval(() => {
        // 関数型アップデートで競合を避ける
        setVisibleItems((prev) => (prev.length ? prev.slice(1) : prev));
      }, TROPHY_CONFIG.STEP_MS);
    }, TROPHY_CONFIG.WAIT_MS);

    return () => {
      if (timersRef.current.start) window.clearTimeout(timersRef.current.start);
      if (timersRef.current.interval) window.clearInterval(timersRef.current.interval);
      timersRef.current = {};
    };
  }, [visibleItems.length]);

  if (!visibleItems.length) return null;

  return (
    <div className="fixed right-4 z-[70] w-[280px] pointer-events-none" style={{ top: topOffsetPx }}>
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {visibleItems.map(({ instanceId, trophyId }) => {
            const t = trophyById.get(trophyId);
            const title = t?.title ?? trophyId;
            const Icon = getIconComponent(t?.icon ?? 'Trophy');
            return (
              <motion.div
                key={instanceId}
                layout
                variants={itemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="rounded-xl border border-white/10 border-l-4 border-l-[#FFB800] shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden"
                style={{
                  backgroundColor: 'rgba(8, 14, 28, 0.95)',
                  backgroundImage:
                    'radial-gradient(120px 60px at 18% 30%, rgba(255,184,0,0.14), rgba(255,184,0,0.00) 65%)',
                }}
              >
                <div className="px-3 py-3 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center border"
                    style={{
                      borderColor: 'rgba(255,184,0,0.35)',
                      backgroundColor: 'rgba(255,184,0,0.08)',
                      color: '#FFB800',
                    }}
                    aria-hidden="true"
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black truncate" style={{ color: 'rgba(226,232,240,0.94)' }}>
                        {title}
                      </p>
                    </div>
                    <p className="text-[11px] font-extrabold mt-0.5" style={{ color: 'rgba(255,184,0,0.92)' }}>
                      実績獲得！
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}


