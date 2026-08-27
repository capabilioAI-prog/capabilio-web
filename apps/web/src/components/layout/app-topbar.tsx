'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { User, LogOut } from 'lucide-react';

export function AppTopbar() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded hover:bg-graphite-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </header>
  );
}
