import * as React from 'react';
import { cn } from '../lib/utils';
import { getEloTierLabel, getEloTierColor } from '@capabilio/types';

interface EloDisplayProps {
  elo: number;
  previousElo?: number;
  showDelta?: boolean;
  showTier?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EloDisplay({ elo, previousElo, showDelta = false, showTier = true, size = 'md', className }: EloDisplayProps) {
  const delta = previousElo !== undefined ? elo - previousElo : null;
  const tierLabel = getEloTierLabel(elo);
  const tierColor = getEloTierColor(elo);

  const sizeClasses = {
    sm: { elo: 'text-lg font-bold', tier: 'text-xs', delta: 'text-xs' },
    md: { elo: 'text-2xl font-bold', tier: 'text-xs', delta: 'text-sm' },
    lg: { elo: 'text-4xl font-bold', tier: 'text-sm', delta: 'text-base' },
  }[size];

  return (
    <div className={cn('flex flex-col items-start gap-0.5', className)}>
      <div className="flex items-baseline gap-2">
        <span className={cn(sizeClasses.elo, 'font-mono tabular-nums')} style={{ color: tierColor }}>
          {elo.toLocaleString()}
        </span>
        {showDelta && delta !== null && (
          <span className={cn(
            sizeClasses.delta,
            'font-mono font-medium',
            delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'
          )}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      {showTier && (
        <span className={cn(sizeClasses.tier, 'font-medium uppercase tracking-wider')} style={{ color: tierColor }}>
          {tierLabel}
        </span>
      )}
    </div>
  );
}