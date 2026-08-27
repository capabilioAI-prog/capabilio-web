export type ArtifactType =
  | 'code_submission'
  | 'document'
  | 'design'
  | 'report'
  | 'presentation'
  | 'screenshot'
  | 'certificate'
  | 'resume';

export type PortfolioVisibility = 'public' | 'private' | 'link_only';
export type PortfolioTheme = 'editorial' | 'technical' | 'minimal' | 'executive';
export type PortfolioItemType = 'verified_work' | 'academic_work' | 'project' | 'ai_interview' | 'learning_activity';

export interface Artifact {
  id: string;
  userId: string;
  type: ArtifactType;
  name: string;
  description: string | null;
  fileUrl: string; // signed URL
  mimeType: string;
  fileSizeBytes: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface PortfolioItem {
  id: string;
  userId: string;
  submissionId: string | null;
  title: string;
  description: string;
  roleId: string;
  roleName: string;
  missionTitle: string | null;
  difficulty: string | null;
  score: number | null;
  skills: Array<{ skillId: string; skillName: string }>;
  artifacts: Artifact[];
  visibility: PortfolioVisibility;
  isFeatured: boolean;
  createdAt: Date;
}

export interface PortfolioEvidenceItem {
  id: string;
  type: PortfolioItemType;
  title: string;
  roleName: string;
  score: number;
  eloBefore: number;
  eloChange: number;
  eloAfter: number;
  skills: Array<{ name: string; proficiency?: number }>;
  description: string;
  date: string | Date;
  verificationStatus: 'verified' | 'regression' | 'completed' | 'in_progress';
  isFeatured: boolean;
  visibility: 'public' | 'private';
  verificationHash: string;
  details: {
    scenario?: string;
    objectives?: string[];
    workEnvironment?: string;
    workPerformed?: string;
    submission?: Record<string, any>;
    executionResults?: any;
    aiScore?: number;
    technicalScore?: number;
    businessScore?: number;
    reasoningScore?: number;
    eloBefore?: number;
    eloChange?: number;
    eloAfter?: number;
    skillsDemonstrated?: Array<{ skillName: string; weight?: number }>;
    aiFeedback?: string;
    strengths?: string[];
    weaknesses?: string[];
    timeSpentMinutes?: number;
    hintsUsedCount?: number;
    verificationHash?: string;
  };
}

export interface PortfolioIntelligence {
  strongestCapability: { name: string; proficiency: number };
  mostImprovedSkill: { name: string; delta: string };
  currentGap: { name: string; score: number };
  nextBestProof: { title: string; recommendation: string; actionUrl: string };
}

export interface PortfolioCompleteness {
  score: number; // 0-100%
  missingItems: string[];
}

export interface PersonalBrandData {
  headline: string;
  careerSummary: string;
  topSkills: string[];
  strengths: string[];
  growthAreas: string[];
  videoStatus: 'not_started' | 'locked' | 'draft' | 'ready' | 'published';
  videoScript: string;
  videoUrl: string | null;
  isEliteEntitled: boolean;
}

export interface PortfolioSettings {
  headline: string;
  about: string;
  theme: PortfolioTheme;
  isPublic: boolean;
  ctaText: string;
  ctaUrl: string | null;
  featuredItems: Array<{ id: string; type: string; order: number }>;
  featuredSkillSlugs: string[];
  enablePersonalBrand: boolean;
  enableVideo: boolean;
}

export interface Portfolio {
  userId: string;
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  items: PortfolioItem[];
  featuredItems: PortfolioItem[];
  totalMissions: number;
  passRate: number;
  topSkills: Array<{ skillName: string; eloScore: number }>;
}

export interface LivingPortfolioPayload {
  user: {
    id: string;
    displayName: string;
    username: string;
    collegeName: string;
    stream: string;
    targetRole: string;
  };
  telemetry: {
    verifiedWorksCount: number;
    aiInterviewsCount: number;
    projectsCount: number;
    skillsCount: number;
    careerElo: number;
    careerReadiness: number;
    interviewReadiness: number;
    streamRating: number;
  };
  featuredItems: PortfolioEvidenceItem[];
  allItems: PortfolioEvidenceItem[];
  skillsDemonstrated: Array<{
    name: string;
    proficiency: number;
    evidenceCount: number;
    trend: string;
    arenaCount: number;
    interviewCount: number;
    latestScore: number;
  }>;
  careerEvolution: Array<{
    elo: number;
    label: string;
    date: string | Date;
    missionTitle?: string;
  }>;
  evidenceTimeline: Array<{
    id: string;
    date: string | Date;
    title: string;
    roleName: string;
    category: string;
    score: number;
    eloDelta: number;
    status: string;
  }>;
  summary: {
    roleTitle: string;
    aiGeneratedSummary: string;
  };
  insights: PortfolioIntelligence;
  completeness: PortfolioCompleteness;
  personalBrand: PersonalBrandData;
  settings: PortfolioSettings;
}
