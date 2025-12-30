export type ProfessionalSkepticismLevel = 'maintain' | 'exercise' | 'enhance';

export type AuditOpinion = 'unqualified' | 'qualified' | 'adverse' | 'disclaimer';

export interface AuditInputs {
  /** 学習進捗（0..100） */
  progressPercent: number;
  /** 目標学習時間（時間） */
  targetHours?: number;
  /** 実績学習時間（時間） */
  actualHours?: number;
}

export interface AuditThresholds {
  unqualifiedMin: number;
  qualifiedMin: number;
  adverseMin: number;
}

export interface AuditOpinionStrategy {
  readonly name: ProfessionalSkepticismLevel;
  readonly thresholds: AuditThresholds;
  evaluate(inputs: AuditInputs): AuditOpinion;
}


