export interface EloRecord {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  eloScore: number;
  rank: number | null;
  createdAt: Date;
}

export interface EloChange {
  id: string;
  userId: string;
  roleId: string;
  submissionId: string;
  previousElo: number;
  newElo: number;
  delta: number;
  reason: string;
  difficulty: string;
  passed: boolean;
  createdAt: Date;
}

export type EloTier =
  | { tier: 'novice'; label: 'Novice'; min: 0; max: 999 }
  | { tier: 'apprentice'; label: 'Apprentice'; min: 1000; max: 1199 }
  | { tier: 'practitioner'; label: 'Practitioner'; min: 1200; max: 1399 }
  | { tier: 'proficient'; label: 'Proficient'; min: 1400; max: 1599 }
  | { tier: 'expert'; label: 'Expert'; min: 1600; max: 1799 }
  | { tier: 'master'; label: 'Master'; min: 1800; max: 1999 }
  | { tier: 'elite'; label: 'Elite'; min: 2000; max: number };

export function getEloTierLabel(elo: number): string {
  if (elo < 1000) return 'Novice';
  if (elo < 1200) return 'Apprentice';
  if (elo < 1400) return 'Practitioner';
  if (elo < 1600) return 'Proficient';
  if (elo < 1800) return 'Expert';
  if (elo < 2000) return 'Master';
  return 'Elite';
}

export function getEloTierColor(elo: number): string {
  if (elo < 1000) return '#737373';
  if (elo < 1200) return '#16A34A';
  if (elo < 1400) return '#2563EB';
  if (elo < 1600) return '#9333EA';
  if (elo < 1800) return '#FF5701';
  if (elo < 2000) return '#EAB308';
  return '#EC4899';
}