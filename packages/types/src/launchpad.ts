export interface RequiredSkillSpec {
  name: string;
  requiredProficiency: number;
  weight: number;
  isCore: boolean;
}

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  companySize: string;
  industry: string;
  location: string;
  workMode: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'internship' | 'entry_level' | 'graduate' | 'full_time' | 'apprenticeship';
  stipendOrSalary: string;
  duration: string;
  experienceRequired: string;
  targetRoleSlug: string;
  isDemo: boolean;
  requiredSkills: RequiredSkillSpec[];
  preferredSkills: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  applicationDeadline: string;
  hiringManager: {
    name: string;
    title: string;
  };
}

export interface MatchedSkillDetail {
  name: string;
  candidateProficiency: number;
  requiredProficiency: number;
  status: 'Strong' | 'Developing' | 'Gap';
  evidenceCount: number;
  verifiedEvidence: Array<{
    id: string;
    title: string;
    type: 'arena_mission' | 'ai_interview' | 'portfolio';
    score: number;
    verificationHash: string;
  }>;
}

export interface SkillGapDetail {
  name: string;
  candidateProficiency: number;
  requiredProficiency: number;
  gapPercent: number;
  recommendation: string;
  actionUrl: string;
}

export interface AiMatchAnalysis {
  overallScore: number;
  summary: string;
  strongestEvidence: {
    title: string;
    score: number;
    skill: string;
  };
  largestGap: {
    skill: string;
    current: number;
    target: number;
  };
  nextBestAction: {
    action: string;
    url: string;
  };
}

export interface ProofPackage {
  candidate: {
    name: string;
    targetRole: string;
    collegeName: string;
    stream: string;
    careerElo: number;
    careerReadiness: number;
    interviewReadiness: number;
    streamRating: number;
    publicProfileUrl: string;
  };
  relevantSkills: Array<{
    name: string;
    proficiency: number;
    status: string;
  }>;
  relevantVerifiedWork: Array<{
    attemptId: string;
    title: string;
    roleName: string;
    scenario: string;
    score: number;
    eloDelta: number;
    sqlSnippet: string;
    skillsDemonstrated: string[];
    aiFeedback: string;
    verificationHash: string;
  }>;
  relevantAiInterview: {
    id: string;
    roleTitle: string;
    score: number;
    readinessScore: number;
    subscores: Record<string, number>;
    verificationHash: string;
  } | null;
  applicationReadiness: {
    overallScore: number;
    checklist: Array<{ label: string; completed: boolean }>;
    missingItems: string[];
  };
}

export interface OpportunityWithMatch extends Opportunity {
  matchScore: number;
  isSaved: boolean;
  hasApplied: boolean;
  applicationStatus?: string;
  matchedSkills: MatchedSkillDetail[];
  skillGaps: SkillGapDetail[];
  aiMatchAnalysis: AiMatchAnalysis;
}
