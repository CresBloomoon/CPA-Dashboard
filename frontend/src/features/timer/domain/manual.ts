export function clampInt(value: number, min: number, max: number): number {
  const v = Number.isFinite(value)
    ? Math.trunc(value)
    : value === Infinity
      ? max
      : min;
  return Math.min(max, Math.max(min, v));
}

/**
 * マウスホイール入力を「増減」に正規化する。
 * - deltaY > 0 なら「下スクロール」＝数値を減らす（現行仕様に合わせる）
 */
export function wheelDeltaToStep(deltaY: number): -1 | 1 {
  return deltaY > 0 ? -1 : 1;
}

export function adjustByStep(current: number, deltaSteps: number, min: number, max: number): number {
  return clampInt(current + deltaSteps, min, max);
}


