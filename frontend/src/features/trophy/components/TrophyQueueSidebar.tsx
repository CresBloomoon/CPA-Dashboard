import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Trophy, Zap, Sparkle, ScrollText, Clock, Flame, Lock, Moon, CheckCircle2, XCircle } from 'lucide-react';
import { useTrophySystemContext } from '../../../contexts/TrophySystemContext';
import { ToastStack, type ToastStackItem } from '../../../components/ui/ToastStack';
import { TROPHY_CONFIG } from '../config/trophyConfig';

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

type ToastVisibleItem = {
  instanceId: string;
  exiting: boolean;
  kind: 'toast';
  variant: 'success' | 'error' | 'achievement';
  message: string;
  subMessage?: string;
};

type VisibleItem = ToastVisibleItem;

export function TrophyQueueSidebar({ topOffsetPx = 96 }: { topOffsetPx?: number }) {
  const { toastQueue } = useTrophySystemContext();

  const [visibleItems, setVisibleItems] = useState<VisibleItem[]>([]);
  const timersRef = useRef<{ start?: number; interval?: number }>({});

  // dequeueToast は使わない（取りこぼし防止のためイベントログ扱いにする）
  // StrictMode/連打でも「処理済み」をrefで追跡し、二重処理を防ぐ
  const processedToastIdsRef = useRef<Set<string>>(new Set());

  // toastQueue を走査し、未処理のみ visibleItems に追加する（dequeueしない）
  useEffect(() => {
    if (!toastQueue.length) return;

    const availableSlots = Math.max(0, TROPHY_CONFIG.MAX_VISIBLE - visibleItems.length);
    if (availableSlots <= 0) return;

    const combined: Array<{
      createdAtMs: number;
      toastId: string;
      variant: 'success' | 'error' | 'achievement';
      message: string;
      subMessage?: string;
    }> = [];

    for (const t of toastQueue) {
      // toastQueue は event.id がインスタンスID
      if (processedToastIdsRef.current.has(t.id)) continue;
      combined.push({
        createdAtMs: t.createdAtMs,
        toastId: t.id,
        variant: t.variant,
        message: t.message,
        subMessage: t.subMessage,
      });
    }

    if (!combined.length) return;

    combined.sort((a, b) => a.createdAtMs - b.createdAtMs);

    const picked = combined.slice(0, availableSlots);
    if (!picked.length) return;

    // ここで processed を先に更新（StrictModeの二重effectでも重複追加しない）
    for (const ev of picked) {
      processedToastIdsRef.current.add(ev.toastId);
    }

    setVisibleItems((prev) => {
      const next = [...prev];
      const slots = TROPHY_CONFIG.MAX_VISIBLE - next.length;
      if (slots <= 0) return prev;

      for (const ev of picked.slice(0, slots)) {
        // toastQueueは event.id をそのまま instanceId として使う（処理済みキーとも一致）
        next.push({
          instanceId: ev.toastId,
          kind: 'toast',
          variant: ev.variant,
          message: ev.message,
          subMessage: ev.subMessage,
          exiting: false,
        });
      }
      return next;
    });
  }, [toastQueue, visibleItems.length]);

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
        // 先頭から順に exit を開始（exit完了後にDOM削除する＝最後の1個もカットアウトしない）
        setVisibleItems((prev) => {
          if (!prev.length) return prev;
          const idx = prev.findIndex((x) => !x.exiting);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], exiting: true };
          return next;
        });
      }, TROPHY_CONFIG.STEP_MS);
    }, TROPHY_CONFIG.WAIT_MS);

    return () => {
      if (timersRef.current.start) window.clearTimeout(timersRef.current.start);
      if (timersRef.current.interval) window.clearInterval(timersRef.current.interval);
      timersRef.current = {};
    };
  }, [visibleItems.length]);

  const stackItems: ToastStackItem[] = useMemo(() => {
    return visibleItems.map((item) => {
      if (item.variant === 'achievement') {
        const title = item.message || '実績を獲得しました';
        const subtitle = item.subMessage || '';
        const Icon = Trophy;
        return {
          id: item.instanceId,
          exiting: Boolean(item.exiting),
          node: (
            <div
              className="rounded-xl border border-white/10 border-l-4 border-l-[#FFB800] shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden"
              style={{
                backgroundColor: 'rgba(8, 14, 28, 0.95)',
                backgroundImage: 'radial-gradient(120px 60px at 18% 30%, rgba(255,184,0,0.14), rgba(255,184,0,0.00) 65%)',
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
                  {subtitle && (
                    <p className="text-[11px] font-extrabold mt-0.5" style={{ color: 'rgba(255,184,0,0.92)' }}>
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ),
        };
      }

      const isSuccess = item.variant === 'success';
      const accent = isSuccess ? '#22c55e' : '#ef4444';
      const Icon = isSuccess ? CheckCircle2 : XCircle;
      const defaultSub = isSuccess ? '保存しました' : '保存に失敗しました';
      const sub = item.subMessage ?? defaultSub;
      return {
        id: item.instanceId,
        exiting: Boolean(item.exiting),
        node: (
          <div
            className="rounded-xl border border-white/10 border-l-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden"
            style={{
              borderLeftColor: accent,
              backgroundColor: 'rgba(8, 14, 28, 0.95)',
              backgroundImage: `radial-gradient(120px 60px at 18% 30%, ${accent}26, rgba(0,0,0,0.00) 65%)`,
            }}
          >
            <div className="px-3 py-3 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
                style={{
                  borderColor: `${accent}59`,
                  backgroundColor: `${accent}1A`,
                  color: accent,
                }}
                aria-hidden="true"
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black truncate" style={{ color: 'rgba(226,232,240,0.94)' }}>
                  {item.message}
                </p>
                <p className="text-[11px] font-extrabold mt-0.5" style={{ color: `${accent}E6` }}>
                  {sub}
                </p>
              </div>
            </div>
          </div>
        ),
      };
    });
  }, [visibleItems]);

  return (
    <ToastStack
      topOffsetPx={topOffsetPx}
      items={stackItems}
      onExited={(id) => {
        setVisibleItems((prev) => prev.filter((x) => x.instanceId !== id));
      }}
    />
  );
}


