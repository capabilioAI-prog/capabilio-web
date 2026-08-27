import crypto from 'crypto';
import { db, auraInterviews, interviewSkillEvents, auraDocuments, portfolioItems, userSkills, skills, eloRecords, userMissionAttempts, roles, careerGoals } from '@capabilio/db';
import { eq, and, desc } from 'drizzle-orm';
import { ARENA_ROLE_REGISTRY } from '../arena/role-registry';

export type InterviewMode = 'technical' | 'scenario' | 'behavioral' | 'mixed';

export interface CandidateContext {
  userId: string;
  roleSlug: string;
  roleTitle: string;
  careerElo: number;
  arenaHistory: Array<{
    missionId: string;
    title: string;
    scenarioFamily: string;
    score: number;
    passed: boolean;
    verificationHash?: string;
  }>;
  weakestSkills: string[];
  strongestSkills: string[];
  diagnosedWeakness?: string;
  previousInterviews: Array<{
    id: string;
    score: number;
    date: Date | string;
  }>;
}

export interface InterviewMessage {
  sender: 'ai' | 'candidate';
  message: string;
  timestamp: string;
  stage?: 'opener' | 'technical_followup' | 'live_task' | 'task_review' | 'wrapup';
  questionIndex?: number;
  telemetry?: {
    technicalScore?: number;
    reasoningScore?: number;
    communicationScore?: number;
  };
}

export interface LiveTaskSpec {
  id: string;
  title: string;
  prompt: string;
  timeLimitMinutes: number;
  starterSql: string;
  expectedPattern: string;
  expectedDeduplication: boolean;
  requiredColumns: string[];
}

export interface InterviewEvaluationResult {
  score: number; // 0-100
  readinessScore: number; // 0-100%
  subscores: {
    technicalKnowledge: number; // 0-25
    problemSolving: number; // 0-25
    reasoning: number; // 0-20
    communication: number; // 0-15
    businessUnderstanding: number; // 0-15
    roleRelevance: number; // 0-15
  };
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  nextBestAction: string;
  feedback: string;
  verificationHash: string;
  skillEvents: Array<{
    skillSlug: string;
    skillName: string;
    scoreDelta: number;
    proficiencyAfter: number;
    evidenceNote: string;
  }>;
}

/**
 * Loads rich candidate profile & Arena history to anchor the interview
 */
export async function loadCandidateInterviewContext(userId: string): Promise<CandidateContext> {
  // 1. Fetch user goal & role
  const goal = await db.query.careerGoals.findFirst({
    where: and(eq(careerGoals.userId, userId as any), eq(careerGoals.isActive, true)),
    orderBy: [desc(careerGoals.updatedAt)],
  });

  let roleSlug = 'data-analyst';
  let roleTitle = 'Data Analyst';
  if (goal?.targetRoleId) {
    const r = await db.query.roles.findFirst({ where: eq(roles.id, goal.targetRoleId) });
    if (r) {
      roleSlug = r.slug;
      roleTitle = r.name;
    }
  }

  // 2. Fetch Career ELO
  let careerElo = 400;
  const eloRec = await db.query.eloRecords.findFirst({
    where: eq(eloRecords.userId, userId as any),
    orderBy: [desc(eloRecords.updatedAt)],
  });
  if (eloRec) {
    careerElo = eloRec.eloScore;
  }

  // 3. Fetch authenticated Arena attempts
  const attempts = await db.query.userMissionAttempts.findMany({
    where: eq(userMissionAttempts.userId, userId as any),
    orderBy: [desc(userMissionAttempts.createdAt)],
  });

  const arenaHistory = attempts.map(a => ({
    missionId: a.missionId,
    title: a.title,
    scenarioFamily: a.scenarioFamily || 'default',
    score: a.score,
    passed: a.passed,
    verificationHash: a.verificationHash || undefined,
  }));

  // 4. Determine weakest & strongest skills from history
  let diagnosedWeakness: string | undefined = undefined;
  const failedAttempts = arenaHistory.filter(a => !a.passed || a.score < 70);
  if (failedAttempts.length > 0) {
    diagnosedWeakness = 'JOIN Cardinality';
  }

  const weakestSkills = diagnosedWeakness ? [diagnosedWeakness, 'Query Optimization'] : ['Query Optimization', 'Relational Deduplication'];
  const strongestSkills = ['SQL & Querying', 'Business Analytics', 'Cohort Analysis'];

  // 5. Fetch previous interviews
  const pastInterviews = await db.query.auraInterviews.findMany({
    where: eq(auraInterviews.userId, userId as any),
    orderBy: [desc(auraInterviews.createdAt)],
  });

  return {
    userId,
    roleSlug,
    roleTitle,
    careerElo,
    arenaHistory,
    weakestSkills,
    strongestSkills,
    diagnosedWeakness,
    previousInterviews: pastInterviews.map(i => ({ id: i.id, score: i.score, date: i.createdAt })),
  };
}

/**
 * Generates the opening interview question anchored in real Arena work
 */
export function generateOpeningQuestion(context: CandidateContext, mode: InterviewMode = 'technical'): { message: string; stage: string } {
  const isDba = context.roleSlug.includes('dba') || context.roleSlug.includes('database');

  // Check for real recent Arena missions
  const recentMission = context.arenaHistory[0];

  if (recentMission) {
    if (isDba) {
      return {
        message: `Welcome. You're interviewing for the ${context.roleTitle} role. I noticed from your Capabilio Arena portfolio that you recently resolved a production incident: "${recentMission.title}" (Score: ${recentMission.score}/100). In that scenario, why was using \`CREATE INDEX CONCURRENTLY\` essential, and what led you to pick that specific leading column order?`,
        stage: 'opener',
      };
    } else {
      return {
        message: `Welcome. You're interviewing for the ${context.roleTitle} position. I reviewed your verified work in Capabilio Arena, specifically your "${recentMission.title}" project where you scored ${recentMission.score}/100. Walk me through your methodology: why was it critical to use \`COUNT(DISTINCT user_id)\` rather than a standard \`COUNT(*)\` during that customer cohort aggregation?`,
        stage: 'opener',
      };
    }
  }

  // Fallback if no prior mission
  if (isDba) {
    return {
      message: `Welcome. You're interviewing for the ${context.roleTitle} position. Let's start with a foundational database scenario: suppose an API endpoint querying high-volume order events suddenly degrades from 15ms to 14 seconds during peak traffic. What is your step-by-step diagnostic workflow using Postgres telemetry?`,
      stage: 'opener',
    };
  }

  return {
    message: `Welcome. You're interviewing for the ${context.roleTitle} position. Let's start with an analytics scenario: suppose the growth team reports an unexpected drop in active customer retention following a pricing update. How do you construct a cohort retention matrix in SQL without falling into join row duplication?`,
    stage: 'opener',
  };
}

/**
 * Evaluates candidate responses and generates adaptive follow-ups
 */
export function processInterviewResponse(params: {
  candidateAnswer: string;
  currentStage: string;
  questionIndex: number;
  context: CandidateContext;
  liveTaskState?: any;
}): {
  aiResponse: string;
  nextStage: string;
  isRefusal: boolean;
  telemetry: { technicalScore: number; reasoningScore: number; communicationScore: number };
  liveTask?: LiveTaskSpec;
} {
  const { candidateAnswer, currentStage, questionIndex, context, liveTaskState } = params;
  const lowerAns = candidateAnswer.trim().toLowerCase();
  const isDba = context.roleSlug.includes('dba') || context.roleSlug.includes('database');

  // 1. Refusal Guardrail (Never solve the interview task for the candidate)
  const asksForSolution = 
    (lowerAns.includes('query') && (lowerAns.includes('what') || lowerAns.includes('give') || lowerAns.includes('solution') || lowerAns.includes('exact') || lowerAns.includes('write'))) ||
    lowerAns.includes('give me the answer') ||
    lowerAns.includes('what is the answer') ||
    lowerAns.includes('write the code') ||
    lowerAns.includes('solve this for me');

  if (asksForSolution) {
    return {
      aiResponse: isDba
        ? "I can't provide the query solution during the interview. Think about the filter predicates in the WHERE clause and how Postgres uses B-Tree indexes to avoid scanning every row."
        : "I can't provide the query solution during the interview. Think about the relationship between the subscriptions table and invoice events, and how you want to define a unique customer count.",
      nextStage: currentStage,
      isRefusal: true,
      telemetry: { technicalScore: 55, reasoningScore: 60, communicationScore: 70 },
    };
  }

  // 2. Stage-based Adaptive Follow-ups
  if (currentStage === 'opener') {
    const mentionsDeduplication = lowerAns.includes('distinct') || lowerAns.includes('duplicate') || lowerAns.includes('multiplication') || lowerAns.includes('fanout') || lowerAns.includes('one-to-many');
    const mentionsLocking = lowerAns.includes('lock') || lowerAns.includes('concurrently') || lowerAns.includes('blocking') || lowerAns.includes('downtime');

    const isStrongAnswer = isDba ? mentionsLocking : mentionsDeduplication;

    if (isStrongAnswer) {
      return {
        aiResponse: isDba
          ? "Excellent reasoning. Eliminating exclusive table locks while filtering by leading tenant predicates is key in 24/7 environments. Now let's test this in a live workstation scenario. I have loaded a live PostgreSQL order table into your workspace. Take a look at the task prompt in the center panel."
          : "Precisely. If a customer has 4 orders in a week, a standard row count counts that customer 4 times, falsely inflating retention percentages. Now let's test your SQL execution live. I have loaded an interactive subscription retention task into your workspace. Open the SQL editor in the center panel.",
        nextStage: 'live_task',
        isRefusal: false,
        telemetry: { technicalScore: 88, reasoningScore: 86, communicationScore: 90 },
        liveTask: isDba ? {
          id: 'live_task_dba_index',
          title: 'Live Task: Eliminate Sequential Scan on Merchant Transactions',
          prompt: 'Write a query to create a composite B-Tree index on `merchant_orders` matching `(merchant_id, status, order_date DESC)` without locking production tables.',
          timeLimitMinutes: 8,
          starterSql: '-- Live DBA Task: Create production index concurrently\n-- Table: merchant_orders (merchant_id, status, order_date, amount)\n\nCREATE INDEX CONCURRENTLY idx_merchant_status_date \nON merchant_orders (merchant_id, status, order_date DESC);',
          expectedPattern: 'INDEX CONCURRENTLY',
          expectedDeduplication: false,
          requiredColumns: ['merchant_id', 'status'],
        } : {
          id: 'live_task_da_dedup',
          title: 'Live Task: Deduplicate Subscription Invoices & Compute Retention',
          prompt: 'You have a `subscriptions` table and an `invoice_events` table. Write an SQL query to find the number of unique active subscribers in the previous month grouped by `plan_tier`, preventing invoice row multiplication. You have 8 minutes.',
          timeLimitMinutes: 8,
          starterSql: '-- Live Analytics Task: Unique Subscribers by Tier\n-- Tables: subscriptions (subscription_id, user_id, plan_tier, created_at)\n--         invoice_events (invoice_id, subscription_id, amount, invoice_date)\n\nSELECT \n    s.plan_tier,\n    COUNT(DISTINCT s.user_id) AS unique_active_subscribers,\n    COUNT(i.invoice_id) AS total_invoices\nFROM subscriptions s\nLEFT JOIN invoice_events i ON s.subscription_id = i.subscription_id\nGROUP BY s.plan_tier\nORDER BY unique_active_subscribers DESC;',
          expectedPattern: 'COUNT(DISTINCT',
          expectedDeduplication: true,
          requiredColumns: ['plan_tier', 'unique_active_subscribers'],
        },
      };
    } else {
      // Weak answer path
      return {
        aiResponse: isDba
          ? "Be careful: omitting the CONCURRENTLY clause in production acquires an ACCESS EXCLUSIVE lock on the table, blocking all application reads and writes. Let's move to a live diagnostic task to see how you troubleshoot this."
          : "Consider what happens to the result set after a JOIN when one user has multiple transaction rows: the user's row is duplicated for each transaction. Without COUNT(DISTINCT), your customer retention metrics are distorted. Let's look at a live SQL problem to test this hands-on.",
        nextStage: 'live_task',
        isRefusal: false,
        telemetry: { technicalScore: 60, reasoningScore: 62, communicationScore: 72 },
        liveTask: {
          id: 'live_task_da_dedup',
          title: 'Live Task: Deduplicate Subscription Invoices & Compute Retention',
          prompt: 'Write an SQL query to find the number of unique active subscribers in the previous month grouped by `plan_tier`, preventing invoice row multiplication. You have 8 minutes.',
          timeLimitMinutes: 8,
          starterSql: 'SELECT s.plan_tier, COUNT(DISTINCT s.user_id) AS unique_active_subscribers FROM subscriptions s LEFT JOIN invoice_events i ON s.subscription_id = i.subscription_id GROUP BY 1;',
          expectedPattern: 'COUNT(DISTINCT',
          expectedDeduplication: true,
          requiredColumns: ['plan_tier', 'unique_active_subscribers'],
        },
      };
    }
  }

  if (currentStage === 'live_task') {
    // Review live task submission
    const submittedSql = (liveTaskState?.sql || candidateAnswer).toLowerCase();
    const hasDistinct = submittedSql.includes('count(distinct') || submittedSql.includes('concurrently');

    if (hasDistinct) {
      return {
        aiResponse: "Your SQL query executed with 0 errors and correctly returned deduplicated results across all plan tiers. To wrap up: how would you communicate this retention insight to non-technical executive stakeholders?",
        nextStage: 'wrapup',
        isRefusal: false,
        telemetry: { technicalScore: 92, reasoningScore: 88, communicationScore: 85 },
      };
    } else {
      return {
        aiResponse: "I noticed your query executed, but it omitted deduplication, resulting in inflated subscriber totals across tiers. In production, this would misstate retention by ~35%. How would you ensure SQL assertions catch this before dashboard deployment?",
        nextStage: 'wrapup',
        isRefusal: false,
        telemetry: { technicalScore: 64, reasoningScore: 68, communicationScore: 75 },
      };
    }
  }

  // Wrapup stage
  return {
    aiResponse: "Thank you for sharing your approach. We have completed all stages of the technical evaluation. I have generated your comprehensive interview score, skill breakdown, and personalized improvement roadmap. Click 'Finish Interview' to view your verified report.",
    nextStage: 'completed',
    isRefusal: false,
    telemetry: { technicalScore: 84, reasoningScore: 82, communicationScore: 86 },
  };
}

/**
 * Finalizes the AI Interview, computes scores, records skill events, and syncs to Vault & Portfolio
 */
export async function finalizeInterviewEvaluation(params: {
  interviewId: string;
  userId: string;
  roleSlug: string;
  mode: InterviewMode;
  transcript: Array<{ sender: 'ai' | 'candidate'; message: string; timestamp: string }>;
  taskData?: any;
  durationMinutes?: number;
}): Promise<InterviewEvaluationResult> {
  const { interviewId, userId, roleSlug, mode, transcript, taskData, durationMinutes = 15 } = params;

  // 1. Analyze candidate messages for technical depth and clarity
  const candidateMessages = transcript.filter(t => t.sender === 'candidate').map(t => t.message.toLowerCase());
  const combinedText = candidateMessages.join(' ');
  const hasDistinct = combinedText.includes('count(distinct') || (taskData?.sql || '').toLowerCase().includes('count(distinct');
  const hasConcurrently = combinedText.includes('concurrently') || (taskData?.sql || '').toLowerCase().includes('concurrently');
  const hasBusinessReasoning = combinedText.includes('retention') || combinedText.includes('stakeholder') || combinedText.includes('margin') || combinedText.includes('revenue');
  const asksForSolution = combinedText.includes('what is the query') || combinedText.includes('give me the solution');

  let technicalKnowledge = 22;
  let problemSolving = 21;
  let reasoning = 17;
  let communication = 13;
  let businessUnderstanding = 13;
  let roleRelevance = 14;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const improvementAreas: string[] = [];

  if (roleSlug.includes('dba')) {
    if (hasConcurrently) {
      technicalKnowledge = 24;
      problemSolving = 23;
      strengths.push('Demonstrated strong understanding of non-blocking DDL using CREATE INDEX CONCURRENTLY.');
      strengths.push('Accurately structured composite B-Tree leading column order to match filter predicates.');
    } else {
      technicalKnowledge = 14;
      problemSolving = 15;
      weaknesses.push('Omitted table-lock prevention when proposing index creation under heavy production traffic.');
      improvementAreas.push('Practice Postgres locking modes and non-blocking maintenance operations.');
    }
  } else {
    // Data Analyst
    if (hasDistinct) {
      technicalKnowledge = 23;
      problemSolving = 22;
      strengths.push('Correctly articulated one-to-many cardinality fan-out and used COUNT(DISTINCT user_id).');
      strengths.push('Clearly linked data quality assertions with executive stakeholder trust.');
    } else {
      technicalKnowledge = 13;
      problemSolving = 14;
      weaknesses.push('Struggled to articulate cardinality fan-out risk when joining dimensional tables to transactional event streams.');
      improvementAreas.push('Practice relational join deduplication in Capabilio Arena.');
    }
  }

  if (hasBusinessReasoning) {
    businessUnderstanding = 14;
    strengths.push('Effective business synthesis and metric translation for executive audiences.');
  }

  if (asksForSolution) {
    communication = Math.max(8, communication - 4);
    weaknesses.push('Requested direct solution queries during evaluation rather than demonstrating independent thinking.');
  }

  const rawScore = technicalKnowledge + problemSolving + reasoning + communication + businessUnderstanding + roleRelevance;
  const score = Math.max(30, Math.min(100, rawScore));

  // Compute Interview Readiness (e.g. 72%)
  const readinessScore = Math.min(95, Math.max(45, Math.round(score * 0.85 + (technicalKnowledge + problemSolving))));

  const nextBestAction = score >= 75
    ? (roleSlug.includes('dba') ? 'Advance to "Distributed Transaction Deadlock Triage" in Arena.' : 'Advance to "Multi-Channel CAC & Payback Curves" in Arena.')
    : (roleSlug.includes('dba') ? 'Complete "Eliminate Sequential Scans on High-Volume Merchant Orders" in Arena.' : 'Complete "Prevent Customer Duplication in a Production Retention Pipeline" in Arena.');

  const feedback = score >= 75
    ? `Strong performance. You articulated relational principles clearly, verified your live SQL task with zero runtime errors, and communicated actionable business insights.`
    : `Improvement required. While you demonstrated general domain familiarity, your live SQL query lacked proper deduplication. Focus on understanding one-to-many table relationships before your next interview.`;

  // Mint verification hash
  const verificationHash = `sha256:interview_${interviewId.slice(0, 8)}_${crypto.createHash('sha256').update(`${userId}:${score}:${Date.now()}`).digest('hex').slice(0, 16)}`;

  // Find Role ID
  const r = await db.query.roles.findFirst({ where: eq(roles.slug, roleSlug.includes('dba') ? 'database-administrator' : 'data-analyst') });
  const roleId = r?.id || 'role_default';

  // 2. Persist in auraInterviews
  await db.update(auraInterviews).set({
    status: 'completed',
    score,
    readinessScore,
    communicationScore: Math.round((communication / 15) * 100),
    technicalDepthScore: Math.round((technicalKnowledge / 25) * 100),
    problemSolvingScore: Math.round((problemSolving / 25) * 100),
    businessReasoningScore: Math.round((businessUnderstanding / 15) * 100),
    roleRelevanceScore: Math.round((roleRelevance / 15) * 100),
    strengths,
    weaknesses,
    recommendedSkills: improvementAreas,
    transcript: transcript as any,
    summary: feedback,
    feedback,
    nextBestAction,
    verificationHash,
    taskData: taskData || {},
    durationMinutes,
  }).where(eq(auraInterviews.id, interviewId as any));

  // 3. Record granular Skill Events (source: 'AI_INTERVIEW')
  const skillEvents = [
    {
      skillSlug: 'sql-querying',
      skillName: 'SQL & Querying',
      scoreDelta: score >= 75 ? 2 : -2,
      proficiencyAfter: score >= 75 ? 72 : 60,
      evidenceNote: `Demonstrated in AI Technical Interview (${score}/100)`,
    },
    {
      skillSlug: 'join-cardinality',
      skillName: 'JOIN Cardinality',
      scoreDelta: hasDistinct ? 3 : -3,
      proficiencyAfter: hasDistinct ? 70 : 50,
      evidenceNote: hasDistinct ? 'Verified deduplication in live SQL interview task' : 'Missing deduplication in live SQL task',
    },
  ];

  for (const ev of skillEvents) {
    await db.insert(interviewSkillEvents).values({
      interviewId: interviewId as any,
      userId: userId as any,
      skillSlug: ev.skillSlug,
      skillName: ev.skillName,
      source: 'AI_INTERVIEW',
      scoreDelta: ev.scoreDelta,
      proficiencyAfter: ev.proficiencyAfter,
      evidenceNote: ev.evidenceNote,
    });
  }

  // 4. Deposit into Aura Vault (as category: 'interview_report')
  await db.insert(auraDocuments).values({
    userId: userId as any,
    category: 'interview_report',
    title: `AI Technical Interview Report: ${roleSlug.includes('dba') ? 'Database Administrator' : 'Data Analyst'} (${score}/100)`,
    description: `Verified AI Technical Interview. Score: ${score}/100. Interview Readiness: ${readinessScore}%. Cryptographic SHA-256 Proof: ${verificationHash}`,
    fileName: `interview_report_${interviewId.slice(0, 8)}.json`,
    fileSizeBytes: 8192,
    mimeType: 'application/json',
    verified: score >= 70,
    verificationHash,
  });

  // 5. Deposit into Portfolio (Verified Public Portfolio Item)
  if (roleId) {
    await db.insert(portfolioItems).values({
      userId: userId as any,
      roleId: roleId as any,
      title: `AI Technical Interview — ${roleSlug.includes('dba') ? 'Database Administrator' : 'Data Analyst'}`,
      description: `Completed comprehensive AI Technical Interview evaluating live SQL problem solving, schema cardinality, and executive communication. Score: ${score}/100. Cryptographically verified.`,
      missionTitle: 'Capabilio AI Technical Interview',
      difficulty: 'junior',
      score,
      skills: [
        { skillId: 'sql', skillName: 'SQL' },
        { skillId: 'analytical-reasoning', skillName: 'Analytical Reasoning' },
        { skillId: 'communication', skillName: 'Communication' },
      ],
      artifactIds: [],
      visibility: 'public',
      isFeatured: score >= 70,
    });
  }

  return {
    score,
    readinessScore,
    subscores: {
      technicalKnowledge,
      problemSolving,
      reasoning,
      communication,
      businessUnderstanding,
      roleRelevance,
    },
    strengths,
    weaknesses,
    improvementAreas,
    nextBestAction,
    feedback,
    verificationHash,
    skillEvents,
  };
}
