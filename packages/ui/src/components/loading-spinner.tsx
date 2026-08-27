import * as React from 'react';
import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = 'md', className, label = 'Loading...' }: LoadingSpinnerProps) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }[size];
  return (
    <div role="status" aria-label={label} className={cn('flex items-center gap-2', className)}>
      <svg
        className={cn('animate-spin text-primary', sizeClasses)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center py-16">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}