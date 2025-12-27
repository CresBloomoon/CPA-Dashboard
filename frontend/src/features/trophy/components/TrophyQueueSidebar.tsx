import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTrophySystemContext } from '../../../contexts/TrophySystemContext';
import { TROPHY_CONFIG } from '../config/trophyConfig';

const itemVariants = {
  initial: { opacity: 0, x: '100vw' as const },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: TROPHY_CONFIG.ENTER_S, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    x: '100vw' as const,
    transition: { duration: TROPHY_CONFIG.EXIT_S, ease: [0.16, 1, 0.3, 1] },
  },
};

// インスタンスIDを生成（trophyId + タイムスタンプ + ランダム値）
const generateInstanceId = (trophyId: string): string => {
  return `${trophyId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// インスタンスIDからトロフィーIDを抽出
const extractTrophyId = (instanceId: string): string => {
  return instanceId.split('-')[0];
};

export function TrophyQueueSidebar() {
  const { trophies, fxQueue, dequeueFx } = useTrophySystemContext();
  const trophyById = useMemo(() => new Map(trophies.map((t) => [t.id, t])), [trophies]);

  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const timersRef = useRef<{ start?: number; interval?: number }>({});

  // fxQueue から一括で取り込み（ディレイなしで全員表示）
  // 各トロフィーIDに対してユニークなインスタンスIDを生成して追加
  useEffect(() => {
    if (!fxQueue.length) return;
    
    // fxQueueから最大MAX_VISIBLE個まで取り込む
    const incoming = fxQueue.slice(0, TROPHY_CONFIG.MAX_VISIBLE);
    dequeueFx(incoming.length);

    // 関数型アップデートで、前の状態を保持しながら新しいインスタンスを追加
    setVisibleIds((prev) => {
      const next = [...prev];
      
      // 現在の表示数と追加可能数を計算
      const currentCount = next.length;
      const availableSlots = TROPHY_CONFIG.MAX_VISIBLE - currentCount;
      
      if (availableSlots <= 0) return prev;
      
      // 追加可能な分だけ、各トロフィーIDに対してユニークなインスタンスIDを生成
      const toAdd = incoming.slice(0, availableSlots);
      for (const trophyId of toAdd) {
        const instanceId = generateInstanceId(trophyId);
        next.push(instanceId);
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

    if (!visibleIds.length) return;

    timersRef.current.start = window.setTimeout(() => {
      timersRef.current.interval = window.setInterval(() => {
        // 関数型アップデートで競合を避ける
        setVisibleIds((prev) => (prev.length ? prev.slice(1) : prev));
      }, TROPHY_CONFIG.STEP_MS);
    }, TROPHY_CONFIG.WAIT_MS);

    return () => {
      if (timersRef.current.start) window.clearTimeout(timersRef.current.start);
      if (timersRef.current.interval) window.clearInterval(timersRef.current.interval);
      timersRef.current = {};
    };
  }, [visibleIds.length]);

  if (!visibleIds.length) return null;

  return (
    <div className="fixed right-4 top-24 z-[70] w-[340px] pointer-events-none">
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {visibleIds.map((instanceId) => {
            const trophyId = extractTrophyId(instanceId);
            const t = trophyById.get(trophyId);
            const title = t?.title ?? trophyId;
            const description = t?.description ?? '';
            const icon = t?.icon ?? 'Trophy';
            return (
              <motion.div
                key={instanceId}
                layout
                variants={itemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="rounded-2xl border shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden"
                style={{ borderColor: '#FFB800', backgroundColor: 'rgba(8, 14, 28, 0.92)' }}
              >
                <div className="p-4 flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={{ borderColor: '#FFB800', backgroundColor: 'rgba(255,184,0,0.10)', color: '#FFB800' }}
                  >
                    <span className="text-[10px] font-bold leading-none">{icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold truncate" style={{ color: '#FFB800' }}>
                      {title}
                    </p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(226,232,240,0.78)' }}>
                      {description}
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


