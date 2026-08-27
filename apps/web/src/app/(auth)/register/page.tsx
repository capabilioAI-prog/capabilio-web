'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { GraduationCap, BookOpen, User, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    collegeName: '',
    stream: 'CSE',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const STREAM_OPTIONS = [
    'CSE (Computer Science & Engineering)',
    'Information Technology (IT)',
    'ECE (Electronics & Communication)',
    'EEE (Electrical & Electronics)',
    'Data Science & AI',
    'Mechanical Engineering',
    'Civil Engineering',
    'BCA / MCA',
    'B.Sc / M.Sc Computer Science',
    'MBA (Business Administration)',
    'Other Engineering / Science',
  ];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.displayName.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.collegeName.trim().length < 2) {
      setError('Please enter your college/university name');
      return;
    }
    if (!form.stream) {
      setError('Please select your stream/branch');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ userId: string; email: string }>('/api/auth/register', {
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        collegeName: form.collegeName,
        stream: form.stream.split(' (')[0],
      });

      if (res.success && res.data) {
        document.cookie = `capabilio-user-id=${res.data.userId}; path=/; max-age=604800; SameSite=Lax`;
        // Redirect directly to Career Calibration Onboarding
        router.push('/onboarding/career-calibration');
        router.refresh();
        return;
      } else if (!res.success && res.error) {
        setError(res.error.message || 'Registration failed');
        return;
      }

      setError('Registration failed. Please check your credentials.');
    } catch (err: any) {
      console.error('Registration exception:', err);
      setError(err?.message || 'Failed to submit registration');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
      <div className="space-y-1.5 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-brand uppercase tracking-wider px-2.5 py-1 rounded-md bg-brand/10 mb-2">
          <GraduationCap className="w-4 h-4" />
          <span>Student Onboarding • Starting ELO: 400</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create Student Account
        </h1>
        <p className="text-xs text-muted-foreground">
          Join Capabilio to calibrate your skills and practice in real role workstations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Full Name */}
        <div className="space-y-1">
          <label className="font-semibold text-foreground flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Full Name</span>
          </label>
          <input
            name="displayName"
            type="text"
            required
            value={form.displayName}
            onChange={handleChange}
            placeholder="e.g. Venkata Kopuri"
            className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="font-semibold text-foreground flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <span>College / Personal Email</span>
          </label>
          <input
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="e.g. student@university.edu"
            className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="font-semibold text-foreground flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Password (min. 8 characters)</span>
          </label>
          <input
            name="password"
            type="password"
            required
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••••••"
            className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
          />
        </div>

        {/* College Name */}
        <div className="space-y-1">
          <label className="font-semibold text-foreground flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
            <span>College / University Name</span>
          </label>
          <input
            name="collegeName"
            type="text"
            required
            value={form.collegeName}
            onChange={handleChange}
            placeholder="e.g. IIT Madras, BITS Pilani, Stanford..."
            className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
          />
        </div>

        {/* Stream / Branch */}
        <div className="space-y-1">
          <label className="font-semibold text-foreground flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Stream / Academic Branch</span>
          </label>
          <select
            name="stream"
            value={form.stream}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
          >
            {STREAM_OPTIONS.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
        >
          <span>{loading ? 'Creating Account...' : 'Continue to Career Calibration'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center pt-2 border-t border-border/60 text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-brand font-semibold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
