import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground border-border',
        brand: 'border-transparent bg-brand/10 text-brand border-brand/20',
        success: 'border-transparent bg-green-50 text-green-700 border-green-200',
        warning: 'border-transparent bg-amber-50 text-amber-700 border-amber-200',
        info: 'border-transparent bg-blue-50 text-blue-700 border-blue-200',
        ghost: 'border-transparent bg-graphite-100 text-graphite-700',
      },
      size: {
        sm: 'px-1.5 py-0 text-2xs rounded',
        default: 'px-2 py-0.5 text-xs rounded-md',
        lg: 'px-3 py-1 text-sm rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };