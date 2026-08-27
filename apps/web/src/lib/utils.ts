import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export function getDifficultyLabel(d: string) {
  return { entry: 'Entry', mid: 'Mid', senior: 'Senior', lead: 'Lead' }[d] ?? d;
}

export function getDifficultyColor(d: string) {
  return {
    entry: 'bg-green-50 text-green-700 border-green-200',
    mid: 'bg-blue-50 text-blue-700 border-blue-200',
    senior: 'bg-amber-50 text-amber-700 border-amber-200',
    lead: 'bg-red-50 text-red-700 border-red-200',
  }[d] ?? 'bg-gray-50 text-gray-700';
}

export function formatMinutes(m: number) {
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
