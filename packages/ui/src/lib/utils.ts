import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatElo(elo: number): string {
  return elo.toLocaleString();
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getDifficultyColor(difficulty: string): string {
  const map: Record<string, string> = {
    entry: 'text-success bg-success/10',
    mid: 'text-info bg-info/10',
    senior: 'text-warning bg-warning/10',
    lead: 'text-destructive bg-destructive/10',
  };
  return map[difficulty] ?? 'text-muted-foreground bg-muted';
}

export function getDifficultyLabel(difficulty: string): string {
  const map: Record<string, string> = {
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior Level',
    lead: 'Lead Level',
  };
  return map[difficulty] ?? difficulty;
}