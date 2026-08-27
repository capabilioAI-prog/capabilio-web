'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center animate-pulse shadow-md">
          <span className="text-white font-bold text-base">C</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-brand" />
          <span>Verifying Capabilio Career OS session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
