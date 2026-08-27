import { ARENA_ROLE_REGISTRY, ArenaRoleDefinition, getArenaRoleConfig } from './role-registry';

export interface SkillVectorItem {
  name: string;
  slug: string;
  category: string;
  proficiency: number; // 0-100%
  confidence: number; // 0-100%
  trend: 'improving' | 'declining' | 'stable';
  demonstratedCount: number;
  lastDemonstratedScore?: number;
  lastAssessedAt?: Date;
  diagnosedGaps: string[];
}

export interface SkillDiagnosisResult {
  roleSlug: string;
  skills: SkillVectorItem[];
  strongestSkills: string[];
  weakestSkills: string[];
  decliningSkills: string[];
  improvingSkills: string[];
  primaryWeakness: {
    skillName: string;
    skillSlug: string;
    gapDescription: string;
    recommendedScenarioFamily: string;
  };
  overallProficiency: number;
}

/**
 * Baseline skill definitions per role
 */
export const ROLE_SKILL_BASELINES: Record<string, Array<{ name: string; slug: string; category: string; baselineProficiency: number }>> = {
  'data-analyst': [
    { name: 'SQL & Querying', slug: 'sql-querying', category: 'technical', baselineProficiency: 65 },
    { name: 'JOIN Cardinality', slug: 'join-cardinality', category: 'technical', baselineProficiency: 60 },
    { name: 'Data Aggregation', slug: 'data-aggregation', category: 'technical', baselineProficiency: 68 },
    { name: 'Cohort Analysis', slug: 'cohort-analysis', category: 'analytical', baselineProficiency: 62 },
    { name: 'Data Cleaning', slug: 'data-cleaning', category: 'technical', baselineProficiency: 72 },
    { name: 'Business Analytics', slug: 'business-analytics', category: 'domain', baselineProficiency: 70 },
    { name: 'Data Visualization', slug: 'data-visualization', category: 'analytical', baselineProficiency: 65 },
    { name: 'Executive Synthesis', slug: 'executive-synthesis', category: 'communication', baselineProficiency: 60 },
  ],
  'database-administrator': [
    { name: 'SQL & Querying', slug: 'sql-querying', category: 'technical', baselineProficiency: 70 },
    { name: 'Indexing & B-Trees', slug: 'indexing', category: 'technical', baselineProficiency: 62 },
    { name: 'Query Optimization', slug: 'query-optimization', category: 'technical', baselineProficiency: 65 },
    { name: 'Database Design', slug: 'database-design', category: 'technical', baselineProficiency: 68 },
    { name: 'Transactions & Locks', slug: 'transactions-locks', category: 'technical', baselineProficiency: 58 },
    { name: 'Performance Tuning', slug: 'performance-tuning', category: 'technical', baselineProficiency: 64 },
    { name: 'Troubleshooting', slug: 'troubleshooting', category: 'analytical', baselineProficiency: 70 },
    { name: 'Production Safety', slug: 'production-safety', category: 'domain', baselineProficiency: 65 },
  ],
};

/**
 * Computes dynamic skill vectors from user historical mission attempts
 */
export function diagnoseSkillProfile(
  roleSlug: string,
  attempts: Array<{
    missionId: string;
    scenarioFamily?: string | null;
    score: number;
    passed: boolean;
    skills?: Array<{ name: string; score?: number }> | null;
    deliverables?: any;
    status?: string | null;
    createdAt?: Date | string;
  }>
): SkillDiagnosisResult {
  const normalizedRole = roleSlug.includes('dba') || roleSlug.includes('database') 
    ? 'database-administrator' 
    : 'data-analyst';

  const baselineSkills = (ROLE_SKILL_BASELINES[normalizedRole] || ROLE_SKILL_BASELINES['data-analyst'])!;

  // Map of skills and their accumulated points
  const skillMap = new Map<string, SkillVectorItem>();

  for (const b of baselineSkills) {
    skillMap.set(b.slug, {
      name: b.name,
      slug: b.slug,
      category: b.category,
      proficiency: b.baselineProficiency,
      confidence: 50,
      trend: 'stable',
      demonstratedCount: 0,
      diagnosedGaps: [],
    });
  }

  // Process historical attempts chronologically (oldest to newest)
  const sortedAttempts = [...attempts].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  for (const attempt of sortedAttempts) {
    const isFlawed = !attempt.passed || attempt.score < 70;
    const score = attempt.score;

    if (normalizedRole === 'data-analyst') {
      const isCustomerChurn = attempt.scenarioFamily === 'customer_churn' || attempt.missionId.includes('da_01');
      const isSalesMargin = attempt.scenarioFamily === 'sales_performance' || attempt.missionId.includes('discount');

      if (isCustomerChurn) {
        const joinSkill = skillMap.get('join-cardinality');
        const cohortSkill = skillMap.get('cohort-analysis');
        const sqlSkill = skillMap.get('sql-querying');

        if (isFlawed) {
          if (joinSkill) {
            joinSkill.proficiency = Math.max(30, joinSkill.proficiency - 8);
            joinSkill.trend = 'declining';
            joinSkill.demonstratedCount += 1;
            joinSkill.diagnosedGaps.push('Duplicate row multiplication on one-to-many customer JOINs');
          }
          if (cohortSkill) {
            cohortSkill.proficiency = Math.max(30, cohortSkill.proficiency - 6);
            cohortSkill.trend = 'declining';
            cohortSkill.demonstratedCount += 1;
            cohortSkill.diagnosedGaps.push('Distorted cohort retention metrics due to missing COUNT(DISTINCT)');
          }
          if (sqlSkill) {
            sqlSkill.proficiency = Math.max(40, sqlSkill.proficiency - 3);
            sqlSkill.demonstratedCount += 1;
          }
        } else {
          if (joinSkill) {
            joinSkill.proficiency = Math.min(98, joinSkill.proficiency + 8);
            joinSkill.trend = 'improving';
            joinSkill.demonstratedCount += 1;
            joinSkill.lastDemonstratedScore = score;
          }
          if (cohortSkill) {
            cohortSkill.proficiency = Math.min(98, cohortSkill.proficiency + 7);
            cohortSkill.trend = 'improving';
            cohortSkill.demonstratedCount += 1;
            cohortSkill.lastDemonstratedScore = score;
          }
          if (sqlSkill) {
            sqlSkill.proficiency = Math.min(98, sqlSkill.proficiency + 5);
            sqlSkill.trend = 'improving';
            sqlSkill.demonstratedCount += 1;
          }
        }
      } else if (isSalesMargin) {
        const bizSkill = skillMap.get('business-analytics');
        const aggSkill = skillMap.get('data-aggregation');
        const synthSkill = skillMap.get('executive-synthesis');

        if (isFlawed) {
          if (aggSkill) { aggSkill.proficiency = Math.max(30, aggSkill.proficiency - 6); aggSkill.trend = 'declining'; aggSkill.demonstratedCount += 1; }
          if (bizSkill) { bizSkill.proficiency = Math.max(30, bizSkill.proficiency - 6); bizSkill.trend = 'declining'; bizSkill.demonstratedCount += 1; }
        } else {
          if (aggSkill) { aggSkill.proficiency = Math.min(98, aggSkill.proficiency + 6); aggSkill.trend = 'improving'; aggSkill.demonstratedCount += 1; }
          if (bizSkill) { bizSkill.proficiency = Math.min(98, bizSkill.proficiency + 6); bizSkill.trend = 'improving'; bizSkill.demonstratedCount += 1; }
          if (synthSkill) { synthSkill.proficiency = Math.min(98, synthSkill.proficiency + 5); synthSkill.trend = 'improving'; synthSkill.demonstratedCount += 1; }
        }
      }
    } else {
      // DBA role skill processing
      const isSlowQuery = attempt.scenarioFamily === 'slow_query' || attempt.missionId.includes('dba_01');
      if (isSlowQuery) {
        const indexSkill = skillMap.get('indexing');
        const queryOptSkill = skillMap.get('query-optimization');

        if (isFlawed) {
          if (indexSkill) {
            indexSkill.proficiency = Math.max(30, indexSkill.proficiency - 8);
            indexSkill.trend = 'declining';
            indexSkill.demonstratedCount += 1;
            indexSkill.diagnosedGaps.push('Omitted leading filter column in composite B-Tree index');
          }
          if (queryOptSkill) {
            queryOptSkill.proficiency = Math.max(30, queryOptSkill.proficiency - 6);
            queryOptSkill.trend = 'declining';
            queryOptSkill.demonstratedCount += 1;
          }
        } else {
          if (indexSkill) {
            indexSkill.proficiency = Math.min(98, indexSkill.proficiency + 8);
            indexSkill.trend = 'improving';
            indexSkill.demonstratedCount += 1;
          }
          if (queryOptSkill) {
            queryOptSkill.proficiency = Math.min(98, queryOptSkill.proficiency + 7);
            queryOptSkill.trend = 'improving';
            queryOptSkill.demonstratedCount += 1;
          }
        }
      }
    }
  }

  const skillList = Array.from(skillMap.values());
  const sortedByProficiency = [...skillList].sort((a, b) => b.proficiency - a.proficiency);

  const strongestSkills = sortedByProficiency.slice(0, 3).map(s => s.name);
  const weakestSkills = [...sortedByProficiency].reverse().slice(0, 3).map(s => s.name);
  const decliningSkills = skillList.filter(s => s.trend === 'declining').map(s => s.name);
  const improvingSkills = skillList.filter(s => s.trend === 'improving').map(s => s.name);

  // Determine highest-impact primary weakness
  const weakestItem = [...sortedByProficiency].reverse()[0];
  let primaryWeakness = {
    skillName: weakestItem ? weakestItem.name : 'SQL & Querying',
    skillSlug: weakestItem ? weakestItem.slug : 'sql-querying',
    gapDescription: weakestItem?.diagnosedGaps[0] || 'Requires structured relational practice',
    recommendedScenarioFamily: normalizedRole === 'data-analyst' ? 'join_deduplication' : 'index_optimization',
  };

  if (normalizedRole === 'data-analyst') {
    const joinSkill = skillMap.get('join-cardinality');
    if (joinSkill && (joinSkill.trend === 'declining' || joinSkill.proficiency < 65)) {
      primaryWeakness = {
        skillName: 'JOIN Cardinality',
        skillSlug: 'join-cardinality',
        gapDescription: 'Row multiplication and missing COUNT(DISTINCT) during one-to-many customer aggregations',
        recommendedScenarioFamily: 'join_deduplication',
      };
    }
  } else {
    const indexSkill = skillMap.get('indexing');
    if (indexSkill && (indexSkill.trend === 'declining' || indexSkill.proficiency < 65)) {
      primaryWeakness = {
        skillName: 'Indexing & B-Trees',
        skillSlug: 'indexing',
        gapDescription: 'Unindexed sequential scans and suboptimal column order in composite indexes',
        recommendedScenarioFamily: 'slow_query',
      };
    }
  }

  const totalProficiency = skillList.reduce((acc, s) => acc + s.proficiency, 0);
  const overallProficiency = Math.round(totalProficiency / skillList.length);

  return {
    roleSlug: normalizedRole,
    skills: skillList,
    strongestSkills,
    weakestSkills,
    decliningSkills,
    improvingSkills,
    primaryWeakness,
    overallProficiency,
  };
}
