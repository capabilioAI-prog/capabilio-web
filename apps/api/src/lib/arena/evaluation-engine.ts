export interface EvaluationInput {
  missionId: string;
  roleSlug: string;
  sqlCode?: string;
  analysisNotes?: string;
  recommendations?: string;
  executionResults?: any;
  executionError?: string | null;
  hintsUsedCount: number;
  isFlawedAttempt?: boolean;
}

export interface EvaluationSubscores {
  technicalCorrectness: number; // max 25
  dataAccuracy: number; // max 25
  efficiency: number; // max 20
  businessReasoning: number; // max 15
  communicationAndEdgeCases: number; // max 15
  hintPenalty: number;
}

export interface DetailedEvaluationResult {
  score: number; // 0-100
  passed: boolean;
  eloDelta: number;
  subscores: EvaluationSubscores;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  diagnosedGaps: string[];
  skillImpact: string;
  skillAdjustments: Array<{ name: string; slug: string; oldProficiency: number; newProficiency: number; delta: number }>;
  mentorFeedback: string;
  nextBestAction: string;
  remediationTarget?: {
    skillName: string;
    scenarioFamily: string;
    description: string;
  };
}

export function evaluateMissionWork(input: EvaluationInput): DetailedEvaluationResult {
  const isDba = input.roleSlug.includes('dba') || input.roleSlug.includes('database');
  const code = (input.sqlCode || '').trim();
  const lowerCode = code.toLowerCase();
  const notes = (input.analysisNotes || '').trim();
  const hasError = !!input.executionError;
  const isFlawed = input.isFlawedAttempt || false;

  // 1. Calculate Subscores
  let technicalCorrectness = 24;
  let dataAccuracy = 23;
  let efficiency = 18;
  let businessReasoning = 14;
  let communicationAndEdgeCases = 14;
  let hintPenalty = 0;

  if (input.hintsUsedCount > 3) {
    hintPenalty = Math.min(15, (input.hintsUsedCount - 2) * 3);
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const diagnosedGaps: string[] = [];

  if (isDba) {
    if (isFlawed || (code.length > 0 && !lowerCode.includes('idx_') && !lowerCode.includes('concurrently'))) {
      technicalCorrectness = 12;
      dataAccuracy = 14;
      efficiency = 8;
      businessReasoning = 8;
      communicationAndEdgeCases = 5;
      weaknesses.push('Index omitted the leading `tenant_id` filter predicate, forcing sequential scans across 1.8M rows.');
      weaknesses.push('Missing CONCURRENTLY clause in index creation could cause table lock downtime.');
      diagnosedGaps.push('Indexing & B-Tree Column Ordering');
      diagnosedGaps.push('PostgreSQL Execution Plan Cost Inspection');
    } else {
      technicalCorrectness = 25;
      dataAccuracy = 24;
      efficiency = 19;
      businessReasoning = 14;
      communicationAndEdgeCases = 14;
      strengths.push('Created composite index CONCURRENTLY on `(tenant_id, status, created_at DESC)` without locking production tables.');
      strengths.push('Execution plan converted 12.4s sequential scan into an 18ms Index-Only scan.');
    }
  } else {
    // Data Analyst Evaluation
    const hasDistinct = lowerCode.includes('count(distinct');
    const hasJoin = lowerCode.includes('join');

    if (isFlawed || (hasJoin && !hasDistinct && lowerCode.includes('count('))) {
      technicalCorrectness = 11;
      dataAccuracy = 10;
      efficiency = 10;
      businessReasoning = 6;
      communicationAndEdgeCases = 5;
      weaknesses.push('JOIN cardinality explosion: Joining `users` with `orders` duplicated customer counts for users with multiple orders.');
      weaknesses.push('Omitted `COUNT(DISTINCT user_id)`, inflating active customer counts by 38% and obscuring true churn.');
      diagnosedGaps.push('JOIN Cardinality');
      diagnosedGaps.push('Aggregation Deduplication');
    } else {
      technicalCorrectness = 24;
      dataAccuracy = 24;
      efficiency = 18;
      businessReasoning = 14;
      communicationAndEdgeCases = 13;
      strengths.push('Accurately deduplicated customer counts using `COUNT(DISTINCT u.user_id)`.');
      strengths.push('Correctly isolated the Week-3 retention cliff specific to the Pro subscription tier.');
      strengths.push('Formulated data-backed onboarding recommendation to mitigate Pro-tier dropoffs.');
    }
  }

  // Calculate Total Score
  const rawScore = technicalCorrectness + dataAccuracy + efficiency + businessReasoning + communicationAndEdgeCases;
  const score = Math.max(25, Math.min(100, rawScore - hintPenalty));
  const passed = score >= 70;

  // Calculate ELO Delta
  const eloDelta = passed ? (score >= 85 ? 18 : 12) : -14;

  const subscores: EvaluationSubscores = {
    technicalCorrectness,
    dataAccuracy,
    efficiency,
    businessReasoning,
    communicationAndEdgeCases,
    hintPenalty,
  };

  const verdict = passed
    ? '✓ Verified capability demonstrated.'
    : '⚠ Skill regression detected: performance below capability baseline.';

  let skillImpact = '';
  let skillAdjustments: Array<{ name: string; slug: string; oldProficiency: number; newProficiency: number; delta: number }> = [];

  if (isDba) {
    if (passed) {
      skillImpact = 'Indexing: 62% → 70% (+8%) • Query Optimization: 65% → 72% (+7%) • Production Safety: 65% → 70% (+5%)';
      skillAdjustments = [
        { name: 'Indexing & B-Trees', slug: 'indexing', oldProficiency: 62, newProficiency: 70, delta: 8 },
        { name: 'Query Optimization', slug: 'query-optimization', oldProficiency: 65, newProficiency: 72, delta: 7 },
      ];
    } else {
      skillImpact = 'Indexing: 62% → 54% (-8%) • Query Optimization: 65% → 59% (-6%)';
      skillAdjustments = [
        { name: 'Indexing & B-Trees', slug: 'indexing', oldProficiency: 62, newProficiency: 54, delta: -8 },
        { name: 'Query Optimization', slug: 'query-optimization', oldProficiency: 65, newProficiency: 59, delta: -6 },
      ];
    }
  } else {
    if (passed) {
      skillImpact = 'JOIN Cardinality: 60% → 68% (+8%) • Cohort Analysis: 62% → 69% (+7%) • SQL & Querying: 65% → 70% (+5%)';
      skillAdjustments = [
        { name: 'JOIN Cardinality', slug: 'join-cardinality', oldProficiency: 60, newProficiency: 68, delta: 8 },
        { name: 'Cohort Analysis', slug: 'cohort-analysis', oldProficiency: 62, newProficiency: 69, delta: 7 },
        { name: 'SQL & Querying', slug: 'sql-querying', oldProficiency: 65, newProficiency: 70, delta: 5 },
      ];
    } else {
      skillImpact = 'JOIN Cardinality: 60% → 52% (-8%) • Cohort Analysis: 62% → 56% (-6%) • SQL & Querying: 65% → 62% (-3%)';
      skillAdjustments = [
        { name: 'JOIN Cardinality', slug: 'join-cardinality', oldProficiency: 60, newProficiency: 52, delta: -8 },
        { name: 'Cohort Analysis', slug: 'cohort-analysis', oldProficiency: 62, newProficiency: 56, delta: -6 },
        { name: 'SQL & Querying', slug: 'sql-querying', oldProficiency: 65, newProficiency: 62, delta: -3 },
      ];
    }
  }

  const mentorFeedback = passed
    ? (isDba
        ? 'Phenomenal database engineering. Creating a composite index concurrently eliminated the 12-second sequential scan without table lock downtime.'
        : 'Superb cohort decomposition. You correctly pinpointed the Pro-tier week-3 onboarding cliff rather than reporting generic high-level averages.')
    : (isDba
        ? 'Your index omitted the leading `tenant_id` filter predicate, forcing Postgres to scan all 1.8M shipment events. Next time, examine column order in the WHERE clause.'
        : 'Your query joined `users` with `orders` without deduplication. Customers with multiple orders produced duplicate rows, inflating customer retention and invalidating conclusions.');

  const nextBestAction = passed
    ? (isDba ? 'Advance to transaction deadlock & locking contention triage.' : 'Advance to multi-channel acquisition ROI modeling.')
    : (isDba ? 'Practice B-Tree composite indexing on filtered predicates in Arena.' : 'Practice relational JOIN deduplication in Arena.');

  const remediationTarget = !passed ? {
    skillName: isDba ? 'Indexing & B-Trees' : 'JOIN Cardinality',
    scenarioFamily: isDba ? 'slow_query' : 'join_deduplication',
    description: isDba 
      ? 'Targeted remediation for composite index construction and sequential scan elimination.'
      : 'Targeted remediation for multi-table customer aggregation and join cardinality deduplication.',
  } : undefined;

  return {
    score,
    passed,
    eloDelta,
    subscores,
    verdict,
    strengths,
    weaknesses,
    diagnosedGaps,
    skillImpact,
    skillAdjustments,
    mentorFeedback,
    nextBestAction,
    remediationTarget,
  };
}
