export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function assertValidProgressPercent(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error('progressPercent must be between 0 and 100');
  }
}


