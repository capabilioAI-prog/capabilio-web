import { db, subscriptions, usageLogs } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';
import { 
  PLAN_ENTITLEMENTS, 
  StudentPlanTier, 
  BillingCycle, 
  UserSubscriptionState, 
  FeatureUsageTelemetry 
} from '@capabilio/types';

/**
 * Returns current Date formatted in India Standard Time (Asia/Kolkata) as YYYY-MM-DD
 */
export function getIstDateString(date = new Date()): string {
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return istFormatter.format(date); // Format: "YYYY-MM-DD"
}

/**
 * Returns current Year-Month formatted in India Standard Time as YYYY-MM
 */
export function getIstMonthString(date = new Date()): string {
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  });
  return istFormatter.format(date); // Format: "YYYY-MM"
}

/**
 * Fetches user subscription, entitlements, and live IST usage
 */
export async function getUserSubscriptionState(userId: string): Promise<UserSubscriptionState> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  let rawPlan = sub?.plan ?? 'free';
  let plan: StudentPlanTier = 'free';
  if (rawPlan === 'pro' || rawPlan === 'student') plan = 'pro';
  else if (rawPlan === 'elite' || rawPlan === 'professional' || rawPlan === 'enterprise') plan = 'elite';

  const billingCycle = (sub?.billingCycle as BillingCycle) || 'monthly';
  const status = (sub?.status as any) || 'active';
  const entitlements = PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.free;

  const todayIst = getIstDateString();
  const thisMonthIst = getIstMonthString();

  // Get daily Arena usage
  const arenaLog = await db.query.usageLogs.findFirst({
    where: and(
      eq(usageLogs.userId, userId),
      eq(usageLogs.feature, 'arena_task'),
      eq(usageLogs.period, todayIst)
    ),
  });

  // Get monthly AI Interview usage
  const interviewLog = await db.query.usageLogs.findFirst({
    where: and(
      eq(usageLogs.userId, userId),
      eq(usageLogs.feature, 'ai_interview'),
      eq(usageLogs.period, thisMonthIst)
    ),
  });

  // Get monthly Skill Report usage
  const skillReportLog = await db.query.usageLogs.findFirst({
    where: and(
      eq(usageLogs.userId, userId),
      eq(usageLogs.feature, 'skill_report'),
      eq(usageLogs.period, thisMonthIst)
    ),
  });

  // Get monthly Market Report usage
  const marketReportLog = await db.query.usageLogs.findFirst({
    where: and(
      eq(usageLogs.userId, userId),
      eq(usageLogs.feature, 'market_report'),
      eq(usageLogs.period, thisMonthIst)
    ),
  });

  const arenaTasksToday = arenaLog?.count ?? 0;
  const aiInterviewsThisMonth = interviewLog?.count ?? 0;
  const skillReportsThisMonth = skillReportLog?.count ?? 0;
  const marketReportsThisMonth = marketReportLog?.count ?? 0;

  const usage: FeatureUsageTelemetry = {
    arenaTasksToday,
    arenaLimit: entitlements.arenaTasksPerDay,
    aiInterviewsThisMonth,
    aiInterviewsLimit: entitlements.aiInterviewsPerMonth,
    skillReportsThisMonth,
    skillReportsLimit: entitlements.skillReportsPerMonth,
    marketReportsThisMonth,
    marketReportsLimit: entitlements.marketReportsPerMonth,
    resetIst: 'Tomorrow at 12:00 AM IST',
  };

  return {
    plan,
    billingCycle,
    status,
    periodStart: sub?.periodStart ? sub.periodStart.toISOString() : null,
    periodEnd: sub?.periodEnd ? sub.periodEnd.toISOString() : null,
    entitlements,
    usage,
  };
}

/**
 * Increment feature usage counter for a given period
 */
export async function recordFeatureUsage(
  userId: string,
  feature: 'arena_task' | 'stream_challenge' | 'ai_interview' | 'skill_report' | 'market_report',
  period: string
): Promise<number> {
  const existing = await db.query.usageLogs.findFirst({
    where: and(
      eq(usageLogs.userId, userId),
      eq(usageLogs.feature, feature),
      eq(usageLogs.period, period)
    ),
  });

  if (existing) {
    const newCount = existing.count + 1;
    await db.update(usageLogs)
      .set({ count: newCount, updatedAt: new Date() })
      .where(eq(usageLogs.id, existing.id));
    return newCount;
  } else {
    await db.insert(usageLogs).values({
      userId,
      feature,
      period,
      count: 1,
    });
    return 1;
  }
}

/**
 * Check if the user is allowed to perform an Arena task today
 */
export async function checkArenaTaskAllowance(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: StudentPlanTier;
  reset: string;
}> {
  const state = await getUserSubscriptionState(userId);
  const allowed = state.usage.arenaTasksToday < state.usage.arenaLimit;
  return {
    allowed,
    used: state.usage.arenaTasksToday,
    limit: state.usage.arenaLimit,
    plan: state.plan,
    reset: 'Tomorrow at 12:00 AM IST',
  };
}

/**
 * Check if the user is allowed to perform a Stream Arena challenge today
 */
export async function checkStreamChallengeAllowance(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: StudentPlanTier;
  reset: string;
}> {
  const state = await getUserSubscriptionState(userId);
  const todayIst = getIstDateString();
  const streamLog = await db.query.usageLogs.findFirst({
    where: and(
      eq(usageLogs.userId, userId),
      eq(usageLogs.feature, 'stream_challenge'),
      eq(usageLogs.period, todayIst)
    ),
  });
  const used = streamLog?.count ?? 0;
  const limit = state.entitlements.arenaTasksPerDay; // 1/day Free, 3/day Pro, 6/day Elite
  return {
    allowed: used < limit,
    used,
    limit,
    plan: state.plan,
    reset: 'Tomorrow at 12:00 AM IST',
  };
}
