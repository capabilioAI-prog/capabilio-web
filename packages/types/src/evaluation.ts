import type { TestResult } from './workspace';

export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface EvaluationCriterionResult {
  criterionId: string;
  criterionName: string;
  passed: boolean;
  score: number; // 0-100
  evidence: string;
  details: string | null;
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number; // ms
  memoryUsed: number; // bytes
  timedOut: boolean;
}

export interface AiFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  mentorNote: string;
  skillInsights: Record<string, string>; // skill -> insight
}

export interface Evaluation {
  id: string;
  submissionId: string;
  status: EvaluationStatus;
  deterministicScore: number; // 0-100
  aiScore: number | null; // 0-100
  totalScore: number; // 0-100 weighted
  passed: boolean;
  criteriaResults: EvaluationCriterionResult[];
  testResults: TestResult[] | null;
  codeExecutionResult: CodeExecutionResult | null;
  aiFeedback: AiFeedback | null;
  eloDelta: number | null;
  evaluatedAt: Date | null;
}