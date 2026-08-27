import { diagnoseSkillProfile, SkillDiagnosisResult, SkillVectorItem } from './skill-diagnosis';
import { getArenaRoleConfig, ARENA_ROLE_REGISTRY } from './role-registry';

export interface AdaptiveEngineInput {
  userId: string;
  roleSlug: string;
  currentElo: number;
  attempts: Array<{
    missionId: string;
    scenarioFamily?: string;
    score: number;
    passed: boolean;
    skills?: Array<{ name: string; score?: number }>;
    deliverables?: any;
    status?: string;
    createdAt?: Date | string;
  }>;
}

export interface AdaptiveAnalysisResult {
  roleSlug: string;
  currentElo: number;
  careerReadiness: number; // 0-100%
  diagnosis: SkillDiagnosisResult;
  currentAiFocus: {
    skillName: string;
    skillSlug: string;
    reason: string;
    recentPerformanceSignal: string;
  };
  recommendedNextDifficulty: 'entry' | 'junior' | 'mid' | 'senior';
  nextAdaptiveMissionConfig: {
    targetWeakness: string;
    scenarioFamily: string;
    suggestedTitle: string;
    suggestedCompany: string;
    estimatedMinutes: number;
    ratingReward: number;
  };
}

export function analyzeUserAdaptiveState(input: AdaptiveEngineInput): AdaptiveAnalysisResult {
  const normalizedRole = input.roleSlug.includes('dba') || input.roleSlug.includes('database')
    ? 'database-administrator'
    : 'data-analyst';

  // 1. Run dynamic skill diagnosis
  const diagnosis = diagnoseSkillProfile(normalizedRole, input.attempts);

  // 2. Calculate Career Readiness
  // Factors: overall skill proficiency (50%), verified pass rate (30%), ELO benchmark (20%)
  const totalAttempts = input.attempts.length;
  const passedAttempts = input.attempts.filter(a => a.passed).length;
  const passRate = totalAttempts > 0 ? passedAttempts / totalAttempts : 0.75;
  const eloFactor = Math.min(1, Math.max(0.3, input.currentElo / 600));

  const rawReadiness = Math.round(
    diagnosis.overallProficiency * 0.5 +
    (passRate * 100) * 0.3 +
    (eloFactor * 100) * 0.2
  );
  const careerReadiness = Math.min(95, Math.max(45, rawReadiness));

  // 3. Recommended Difficulty
  let recommendedNextDifficulty: 'entry' | 'junior' | 'mid' | 'senior' = 'entry';
  if (input.currentElo >= 540) {
    recommendedNextDifficulty = 'senior';
  } else if (input.currentElo >= 480) {
    recommendedNextDifficulty = 'mid';
  } else if (input.currentElo >= 440) {
    recommendedNextDifficulty = 'junior';
  }

  // 4. Current AI Focus based on latest attempt and diagnosed weakness
  const latestAttempt = input.attempts[0]; // newest attempt
  let focusReason = 'Your recent mission demonstrated an opportunity to improve relational aggregation accuracy.';
  let signal = 'Baseline capability diagnostic active.';

  if (latestAttempt) {
    if (!latestAttempt.passed) {
      if (normalizedRole === 'data-analyst') {
        focusReason = 'Your last mission showed repeated row multiplication during one-to-many customer joins and missing deduplication.';
        signal = `Flawed attempt (${latestAttempt.score}/100) on ${latestAttempt.missionId.slice(0, 12)}`;
      } else {
        focusReason = 'Your last mission omitted the leading equality filter column in the composite index, triggering sequential scans.';
        signal = `Flawed attempt (${latestAttempt.score}/100) on ${latestAttempt.missionId.slice(0, 12)}`;
      }
    } else {
      focusReason = `Strong performance on ${latestAttempt.missionId.slice(0, 12)}. Continuing targeted skill progression.`;
      signal = `Verified performance (${latestAttempt.score}/100)`;
    }
  }

  const currentAiFocus = {
    skillName: diagnosis.primaryWeakness.skillName,
    skillSlug: diagnosis.primaryWeakness.skillSlug,
    reason: focusReason,
    recentPerformanceSignal: signal,
  };

  // 5. Next Adaptive Remediation Mission Config
  let nextMissionConfig = {
    targetWeakness: 'JOIN Cardinality',
    scenarioFamily: 'join_deduplication',
    suggestedTitle: 'Prevent Customer Duplication in a Production Retention Pipeline',
    suggestedCompany: 'DataFlow Systems',
    estimatedMinutes: 35,
    ratingReward: 18,
  };

  if (normalizedRole === 'database-administrator') {
    nextMissionConfig = {
      targetWeakness: 'Indexing & B-Trees',
      scenarioFamily: 'slow_query',
      suggestedTitle: 'Eliminate Sequential Scans on High-Volume Merchant Orders',
      suggestedCompany: 'QuickPay Infrastructure',
      estimatedMinutes: 30,
      ratingReward: 18,
    };
  } else {
    // Check if the user already mastered JOIN Cardinality
    const joinSkill = diagnosis.skills.find(s => s.slug === 'join-cardinality');
    if (joinSkill && joinSkill.proficiency >= 68 && joinSkill.trend === 'improving') {
      nextMissionConfig = {
        targetWeakness: 'Business Analytics & Margin Erosion',
        scenarioFamily: 'sales_performance',
        suggestedTitle: 'Analyze Discount Variance & Sales Rep Margin Erosion',
        suggestedCompany: 'ApexRetail',
        estimatedMinutes: 40,
        ratingReward: 18,
      };
    }
  }

  return {
    roleSlug: normalizedRole,
    currentElo: input.currentElo,
    careerReadiness,
    diagnosis,
    currentAiFocus,
    recommendedNextDifficulty,
    nextAdaptiveMissionConfig: nextMissionConfig,
  };
}
