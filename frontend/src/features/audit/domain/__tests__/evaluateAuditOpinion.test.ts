import { describe, expect, it } from 'vitest';
import { evaluateAuditOpinion } from '../evaluateAuditOpinion';
import type { AuditOpinionStrategy } from '../types';

describe('audit domain (strategy)', () => {
  it('evaluates opinion using default strategies', () => {
    expect(evaluateAuditOpinion({ progressPercent: 90 }, 'exercise')).toBe('unqualified');
    expect(evaluateAuditOpinion({ progressPercent: 70 }, 'exercise')).toBe('qualified');
    expect(evaluateAuditOpinion({ progressPercent: 50 }, 'exercise')).toBe('adverse');
    expect(evaluateAuditOpinion({ progressPercent: 0 }, 'exercise')).toBe('disclaimer');
  });

  it('is stricter when skepticism is enhanced', () => {
    expect(evaluateAuditOpinion({ progressPercent: 90 }, 'enhance')).toBe('qualified');
    expect(evaluateAuditOpinion({ progressPercent: 95 }, 'enhance')).toBe('unqualified');
  });

  it('allows dependency injection (custom strategy)', () => {
    const custom: AuditOpinionStrategy = {
      name: 'exercise',
      thresholds: { unqualifiedMin: 1, qualifiedMin: 1, adverseMin: 1 },
      evaluate: () => 'unqualified',
    };
    const result = evaluateAuditOpinion({ progressPercent: 0 }, 'exercise', {
      getStrategy: () => custom,
    });
    expect(result).toBe('unqualified');
  });

  it('throws for invalid progressPercent', () => {
    expect(() => evaluateAuditOpinion({ progressPercent: -1 }, 'exercise')).toThrow();
    expect(() => evaluateAuditOpinion({ progressPercent: 101 }, 'exercise')).toThrow();
  });
});


