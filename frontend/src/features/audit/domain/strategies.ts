import type { AuditInputs, AuditOpinion, AuditOpinionStrategy, AuditThresholds, ProfessionalSkepticismLevel } from './types';
import { assertValidProgressPercent } from './validation';

function evaluateByThresholds(progressPercent: number, t: AuditThresholds): AuditOpinion {
  if (progressPercent >= t.unqualifiedMin) return 'unqualified';
  if (progressPercent >= t.qualifiedMin) return 'qualified';
  if (progressPercent >= t.adverseMin) return 'adverse';
  return 'disclaimer';
}

function makeStrategy(name: ProfessionalSkepticismLevel, thresholds: AuditThresholds): AuditOpinionStrategy {
  return {
    name,
    thresholds,
    evaluate(inputs: AuditInputs): AuditOpinion {
      assertValidProgressPercent(inputs.progressPercent);
      return evaluateByThresholds(inputs.progressPercent, thresholds);
    },
  };
}

/**
 * 職業的懐疑心レベル別の判定戦略。
 * - maintain: やや寛容（閾値が低い）
 * - exercise: 標準
 * - enhance: 厳格（閾値が高い）
 */
export const AUDIT_STRATEGIES: Record<ProfessionalSkepticismLevel, AuditOpinionStrategy> = {
  maintain: makeStrategy('maintain', { unqualifiedMin: 85, qualifiedMin: 65, adverseMin: 45 }),
  exercise: makeStrategy('exercise', { unqualifiedMin: 90, qualifiedMin: 70, adverseMin: 50 }),
  enhance: makeStrategy('enhance', { unqualifiedMin: 95, qualifiedMin: 75, adverseMin: 55 }),
};


