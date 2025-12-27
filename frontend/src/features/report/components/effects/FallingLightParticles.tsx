import { useMemo } from 'react';
import { motion } from 'framer-motion';

type Particle = {
  id: string;
  leftPct: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  opacity: number;
};

export function FallingLightParticles({
  runKey,
  heightPx = 220,
}: {
  runKey: number;
  heightPx?: number;
}) {
  const particles = useMemo<Particle[]>(() => {
    const list: Particle[] = [];
    for (let i = 0; i < 42; i += 1) {
      list.push({
        id: `${runKey}-${i}`,
        leftPct: Math.random() * 100,
        size: 3 + Math.random() * 5,
        delay: Math.random() * 0.25,
        duration: 0.9 + Math.random() * 0.9,
        drift: (Math.random() - 0.5) * 40,
        opacity: 0.35 + Math.random() * 0.35,
      });
    }
    return list;
  }, [runKey]);

  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none overflow-hidden" style={{ height: heightPx }}>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute -top-6 rounded-full"
          style={{
            left: `${p.leftPct}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            background: 'rgba(253, 224, 71, 0.95)',
            filter: 'drop-shadow(0 0 10px rgba(253, 224, 71, 0.55))',
          }}
          initial={{ y: -12, x: 0 }}
          animate={{ y: heightPx + 60, x: p.drift, opacity: [0, p.opacity, p.opacity, 0] }}
          transition={{ delay: p.delay, duration: p.duration, ease: 'easeOut' }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}


