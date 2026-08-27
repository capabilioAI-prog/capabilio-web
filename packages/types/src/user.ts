export type UserRole = 'student' | 'professional' | 'recruiter' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  website: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CareerGoal {
  id: string;
  userId: string;
  targetRoleId: string;
  targetRoleName: string;
  timeline: 'immediate' | '3_months' | '6_months' | '1_year' | '2_plus_years';
  currentLevel: 'student' | 'entry' | 'mid' | 'senior' | 'lead';
  motivation: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CareerReadiness {
  userId: string;
  targetRoleId: string;
  overallScore: number; // 0-100, evidence-backed
  skillReadiness: number;
  experienceReadiness: number;
  portfolioReadiness: number;
  lastCalculatedAt: Date;
}