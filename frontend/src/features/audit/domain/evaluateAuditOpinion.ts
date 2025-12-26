import type { AuditInputs, AuditOpinion, AuditOpinionStrategy, ProfessionalSkepticismLevel } from './types';
import { AUDIT_STRATEGIES } from './strategies';

export interface EvaluateAuditOpinionDeps {
  getStrategy: (level: ProfessionalSkepticismLevel) => AuditOpinionStrategy;
}

export const defaultAuditDeps: EvaluateAuditOpinionDeps = {
  getStrategy: (level) => AUDIT_STRATEGIES[level],
};

/**
 * Strategyパターンにより、職業的懐疑心レベル（設定）で判定基準を差し替え可能。
 * - UI/Reactに依存しない純粋関数
 */
export function evaluateAuditOpinion(
  inputs: AuditInputs,
  level: ProfessionalSkepticismLevel,
  deps: EvaluateAuditOpinionDeps = defaultAuditDeps
): AuditOpinion {
  const strategy = deps.getStrategy(level);
  return strategy.evaluate(inputs);
}


