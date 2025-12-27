export type ScoreRow = {
  name: string;
  score: string;
  fullScore: string;
};

export type ReportData = {
  reflection: string;
  scores: ScoreRow[];
  issues: string;
  solutions: string;
  nextWeekPlan: string;
  questions: string;
};

export type UpdateReportData = (patch: Partial<ReportData>) => void;


