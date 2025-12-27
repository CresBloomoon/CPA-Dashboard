type Props = {
  value: number;
  decimals?: number;
  className?: string;
};

export function AnimatedCounter({ value, decimals = 0, className }: Props) {
  const n = Number.isFinite(value) ? value : 0;
  const text = n.toLocaleString('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={`text-[#FFB800] font-black tabular-nums ${className ?? ''}`}>{text}</span>
  );
}


