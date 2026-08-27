'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Globe, Users } from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUsername: string;
  initialVisibility: 'public' | 'recruiter_only' | 'private';
  onSaved: () => void;
}

export function ProfileSettingsModal({ isOpen, onClose, initialUsername, initialVisibility, onSaved }: ProfileSettingsModalProps) {
  const [username, setUsername] = useState(initialUsername);
  const [visibility, setVisibility] = useState<'public' | 'recruiter_only' | 'private'>(initialVisibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/api/profile/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.toLowerCase().trim(),
          profileVisibility: visibility,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSaved();
        onClose();
      } else {
        setError(data.error?.message || 'Failed to update settings');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border-2 border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden space-y-0 text-foreground font-sans">
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand" />
            <h3 className="font-bold text-base text-foreground">Profile & Privacy Settings</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 font-sans">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-mono">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-2xs font-mono font-bold text-muted-foreground uppercase">CUSTOM USERNAME / SLUG</label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">capabilio.ai/p/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-muted/50 border border-border font-mono text-xs text-foreground focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-2xs font-mono font-bold text-muted-foreground uppercase">PROFILE VISIBILITY</label>
            
            <div className="space-y-2">
              {[
                { id: 'public', label: 'Public Profile', desc: 'Accessible to everyone with your public link.', icon: Globe },
                { id: 'recruiter_only', label: 'Recruiter Only', desc: 'Accessible only to verified recruiters and hiring partners.', icon: Users },
                { id: 'private', label: 'Private (Draft Mode)', desc: 'Only accessible by you while signed in.', icon: Lock },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = visibility === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setVisibility(opt.id as any)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected ? 'border-brand bg-brand/5 shadow-xs' : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-brand text-white' : 'bg-muted text-foreground'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-foreground">{opt.label}</div>
                      <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground font-mono text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            data-testid="save-profile-settings-btn"
            className="px-6 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-mono text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
