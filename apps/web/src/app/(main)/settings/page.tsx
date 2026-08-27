'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import {
  Settings,
  User,
  Briefcase,
  Shield,
  Bell,
  Check,
  Save,
  Loader2,
  GraduationCap,
  Sparkles
} from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshSession } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'career' | 'notifications' | 'privacy'>('profile');
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [stream, setStream] = useState('');
  const [bio, setBio] = useState('');
  
  const [targetRoleId, setSelectedRoleId] = useState('');
  const [roles, setRoles] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{
      profile?: { displayName: string; headline?: string; collegeName?: string; stream?: string; bio?: string };
      careerGoal?: { targetRoleId?: string; targetRoleName?: string };
    }>('/api/profile').then(res => {
      if (res.success && res.data) {
        if (res.data.profile?.displayName) setDisplayName(res.data.profile.displayName);
        if (res.data.profile?.headline) setHeadline(res.data.profile.headline);
        if (res.data.profile?.collegeName) setCollegeName(res.data.profile.collegeName);
        if (res.data.profile?.stream) setStream(res.data.profile.stream);
        if (res.data.profile?.bio) setBio(res.data.profile.bio);
        if (res.data.careerGoal?.targetRoleId) setSelectedRoleId(res.data.careerGoal.targetRoleId);
      }
    });

    api.get<{ roles: Array<{ id: string; name: string; slug: string }> }>('/api/roles').then(res => {
      if (res.success && res.data?.roles) setRoles(res.data.roles);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      await api.put('/api/profile', {
        displayName,
        headline,
        bio,
      });

      if (targetRoleId) {
        await api.post('/api/profile/career-goal', {
          targetRoleId,
          timeline: 'immediate',
          currentLevel: 'student',
        });
      }

      await refreshSession();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Settings save failed:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
      
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">
          <Settings className="h-3.5 w-3.5 text-brand" />
          <span>ACCOUNT & CAREER SETTINGS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Control your Career OS.
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={cn('px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-1.5', activeTab === 'profile' ? 'bg-brand text-white' : 'bg-muted/40 text-muted-foreground hover:text-foreground')}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile Details</span>
        </button>

        <button
          onClick={() => setActiveTab('career')}
          className={cn('px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-1.5', activeTab === 'career' ? 'bg-brand text-white' : 'bg-muted/40 text-muted-foreground hover:text-foreground')}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Career Role Target</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={cn('px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-1.5', activeTab === 'notifications' ? 'bg-brand text-white' : 'bg-muted/40 text-muted-foreground hover:text-foreground')}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notifications</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
        
        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Settings saved successfully! All downstream features have been synchronized.</span>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="e.g. Aspiring Data Analyst @ IIT Madras"
                className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">College / University</label>
                <input
                  type="text"
                  value={collegeName}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-muted/60 border border-border rounded-xl text-xs text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Stream / Branch</label>
                <input
                  type="text"
                  value={stream}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-muted/60 border border-border rounded-xl text-xs text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                placeholder="Brief summary of your background and technical interests..."
                className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {activeTab === 'career' && (
          <div className="space-y-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Target Career Role</label>
              <select
                value={targetRoleId}
                onChange={e => setSelectedRoleId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="text-2xs text-muted-foreground pt-1">
                Changing your target role recalibrates your Aura command center, Arena workstations, and Launchpad job matching.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">Assessment & Mission Evaluation Alerts</div>
                <div className="text-2xs text-muted-foreground">Receive instant notifications when code is evaluated.</div>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand" />
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">Recruiter Task Assignments</div>
                <div className="text-2xs text-muted-foreground">Receive notifications when hiring managers assign proof tasks.</div>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand" />
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
