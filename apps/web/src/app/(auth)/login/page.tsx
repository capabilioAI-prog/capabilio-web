'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowRight, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ user: { id: string; email: string; hasCompletedCareerOnboarding?: boolean } }>('/api/auth/login', {
        email,
        password,
      });

      if (res.success && res.data?.user) {
        document.cookie = `capabilio-user-id=${res.data.user.id}; path=/; max-age=604800; SameSite=Lax`;
        
        if (res.data.user.hasCompletedCareerOnboarding === false) {
          router.push('/onboarding/career-calibration');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
        return;
      } else if (!res.success && res.error) {
        setError(res.error.message || 'Invalid email or password');
        return;
      }

      setError('Invalid email or password');
    } catch {
      setError('An unexpected error occurred during sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-xs text-muted-foreground">Sign in to your Capabilio Career Operating System</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl text-xs">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="font-semibold text-foreground flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Email</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="student@university.edu"
            className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Password</span>
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
        >
          <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center pt-2 border-t border-border/60 text-xs text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-brand font-semibold hover:underline">
          Create Student Account
        </Link>
      </div>
    </div>
  );
}
