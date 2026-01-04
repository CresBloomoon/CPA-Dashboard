import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type ToastStackItem = {
  id: string;
  /** exitアニメ中は true（exit完了後に onExited を呼んで親が削除する） */
  exiting?: boolean;
  node: ReactNode;
};

type Props = {
  items: ToastStackItem[];
  onExited: (id: string) => void;
  topOffsetPx?: number;
  widthPx?: number;
  gapPx?: number;
};

const ENTER_MS = 280;
const EXIT_MS = 220;
const DEFAULT_ITEM_HEIGHT_PX = 74;

export function ToastStack({ items, onExited, topOffsetPx = 96, widthPx = 280, gapPx = 12 }: Props) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const [enteredIds, setEnteredIds] = useState<Set<string>>(() => new Set());
  const [yById, setYById] = useState<Record<string, number>>({});

  const setCardRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(id, el);
      else cardRefs.current.delete(id);
    },
    []
  );

  const idsKey = useMemo(() => items.map((i) => i.id).join('|'), [items]);

  useLayoutEffect(() => {
    // 高さ計測→スタック位置(y)を算出（transformのみで詰める）
    const next: Record<string, number> = {};
    let y = 0;
    for (const it of items) {
      next[it.id] = y;
      const h = cardRefs.current.get(it.id)?.getBoundingClientRect().height ?? 0;
      y += (h || DEFAULT_ITEM_HEIGHT_PX) + gapPx;
    }
    setYById(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, gapPx]);

  return (
    <div
      className="toast-stack-root"
      style={{
        top: topOffsetPx,
        width: widthPx,
      }}
    >
      <div className="toast-stack-inner">
        {items.map((it) => {
          const y = yById[it.id] ?? 0;
          const isExiting = Boolean(it.exiting);
          const hasEntered = enteredIds.has(it.id);
          const animClass = isExiting ? 'toast-stack-card--exit' : hasEntered ? '' : 'toast-stack-card--enter';
          const animMs = isExiting ? EXIT_MS : ENTER_MS;

          return (
            <div
              key={it.id}
              className="toast-stack-item"
              style={{
                transform: `translate3d(0, ${y}px, 0)`,
              }}
            >
              <div
                ref={setCardRef(it.id)}
                className={['toast-stack-card', animClass].filter(Boolean).join(' ')}
                style={{ animationDuration: `${animMs}ms` }}
                onAnimationEnd={() => {
                  if (isExiting) {
                    onExited(it.id);
                    return;
                  }
                  if (!hasEntered) {
                    setEnteredIds((prev) => {
                      const next = new Set(prev);
                      next.add(it.id);
                      return next;
                    });
                  }
                }}
              >
                {it.node}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


