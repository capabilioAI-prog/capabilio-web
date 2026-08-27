import * as React from 'react';
import { cn } from '../lib/utils';
import { getEloTierColor, getEloTierLabel } from '@capabilio/types';

interface SkillBadgeProps {
  name: string;
  elo?: number;
  category?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SkillBadge({ name, elo, category, size = 'md', className }: SkillBadgeProps) {
  const color = elo ? getEloTierColor(elo) : '#737373';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 border rounded font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        'bg-graphite-50 border-graphite-200 text-graphite-700',
        className
      )}
    >
      {elo && (
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-label={`ELO: ${elo}`}
        />
      )}
      <span>{name}</span>
      {elo && (
        <span className="font-mono text-2xs" style={{ color }}>
          {elo}
        </span>
      )}
    </div>
  );
}