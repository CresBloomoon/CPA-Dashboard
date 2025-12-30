import { describe, expect, it } from 'vitest';
import { formatClockFromSeconds } from '../time';

describe('formatClockFromSeconds', () => {
  it('formats under 1 hour as MM:SS', () => {
    expect(formatClockFromSeconds(0)).toBe('00:00');
    expect(formatClockFromSeconds(5)).toBe('00:05');
    expect(formatClockFromSeconds(65)).toBe('01:05');
    expect(formatClockFromSeconds(3599)).toBe('59:59');
  });

  it('formats 1 hour and above as HH:MM:SS', () => {
    expect(formatClockFromSeconds(3600)).toBe('01:00:00');
    expect(formatClockFromSeconds(3661)).toBe('01:01:01');
  });

  it('is defensive for invalid inputs', () => {
    expect(formatClockFromSeconds(-1)).toBe('00:00');
    // @ts-expect-error testing runtime input
    expect(formatClockFromSeconds(NaN)).toBe('00:00');
  });
});


