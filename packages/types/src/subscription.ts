export type StudentPlanTier = 'free' | 'pro' | 'elite';
export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface PlanEntitlement {
  arenaTasksPerDay: number;
  skillReportsPerMonth: number;
  aiInterviewsPerMonth: number;
  marketReportsPerMonth: number;
  internshipReadiness: boolean;
  applicationTracker: boolean;
  interviewFeedback: boolean;
  improvementAreas: boolean;
  personalBrandingVideo: boolean;
  premiumPortfolioThemes: 'limited' | 'more' | 'all';
  advancedSkillInsights: boolean | 'basic' | 'advanced';
  profileAnalytics: 'basic' | 'standard' | 'advanced';
  priorityOpportunities: boolean;
}

export const PLAN_ENTITLEMENTS: Record<StudentPlanTier, PlanEntitlement> = {
  free: {
    arenaTasksPerDay: 1,
    skillReportsPerMonth: 0,
    aiInterviewsPerMonth: 0,
    marketReportsPerMonth: 0,
    internshipReadiness: false,
    applicationTracker: false,
    interviewFeedback: false,
    improvementAreas: false,
    personalBrandingVideo: false,
    premiumPortfolioThemes: 'limited',
    advancedSkillInsights: false,
    profileAnalytics: 'basic',
    priorityOpportunities: false,
  },
  pro: {
    arenaTasksPerDay: 3,
    skillReportsPerMonth: 1,
    aiInterviewsPerMonth: 3,
    marketReportsPerMonth: 1,
    internshipReadiness: true,
    applicationTracker: true,
    interviewFeedback: true,
    improvementAreas: true,
    personalBrandingVideo: false,
    premiumPortfolioThemes: 'more',
    advancedSkillInsights: 'basic',
    profileAnalytics: 'standard',
    priorityOpportunities: false,
  },
  elite: {
    arenaTasksPerDay: 6,
    skillReportsPerMonth: 2,
    aiInterviewsPerMonth: 5,
    marketReportsPerMonth: 2,
    internshipReadiness: true,
    applicationTracker: true,
    interviewFeedback: true,
    improvementAreas: true,
    personalBrandingVideo: true,
    premiumPortfolioThemes: 'all',
    advancedSkillInsights: 'advanced',
    profileAnalytics: 'advanced',
    priorityOpportunities: true,
  },
};

export interface PlanPricingInfo {
  monthlyPriceInr: number;
  annualPriceInr: number;
  positioning: string;
  badge?: string;
  subBadge?: string;
  ctaText: string;
}

export const STUDENT_PLANS: Record<StudentPlanTier, PlanPricingInfo> = {
  free: {
    monthlyPriceInr: 0,
    annualPriceInr: 0,
    positioning: 'Start building your skills, portfolio, and career profile.',
    ctaText: 'START FREE',
  },
  pro: {
    monthlyPriceInr: 299,
    annualPriceInr: 2999,
    positioning: 'Prepare seriously for internships and placements with structured practice and feedback.',
    badge: 'MOST POPULAR',
    ctaText: 'GO PRO',
  },
  elite: {
    monthlyPriceInr: 499,
    annualPriceInr: 4999,
    positioning: 'Build stronger evidence, improve faster, and present yourself professionally.',
    subBadge: 'BEST FOR SERIOUS CAREER BUILDING',
    ctaText: 'GO ELITE',
  },
};

export const ADDON_PRICING = {
  additionalAiInterview: { name: 'Additional AI Interview Session', priceInr: 49 },
  additionalMarketReport: { name: 'Additional Market Analysis Report', priceInr: 49 },
  personalBrandingVideo: { name: 'Personal Branding Video', priceInr: 129 },
  singlePortfolioTheme: { name: 'Single Portfolio Theme', priceInr: 29 },
  goldPortfolioTheme: { name: 'Gold Portfolio Theme', priceInr: 49 },
};

export interface FeatureUsageTelemetry {
  arenaTasksToday: number;
  arenaLimit: number;
  aiInterviewsThisMonth: number;
  aiInterviewsLimit: number;
  skillReportsThisMonth: number;
  skillReportsLimit: number;
  marketReportsThisMonth: number;
  marketReportsLimit: number;
  resetIst: string; // e.g. "Tomorrow at 12:00 AM IST"
}

export interface UserSubscriptionState {
  plan: StudentPlanTier;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  periodStart?: string | null;
  periodEnd?: string | null;
  entitlements: PlanEntitlement;
  usage: FeatureUsageTelemetry;
}
