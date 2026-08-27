'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, Globe, Linkedin, Mail } from 'lucide-react';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  displayName: string;
  targetRole: string;
}

export function ShareProfileModal({ isOpen, onClose, username, displayName, targetRole }: ShareProfileModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/p/${username}`
    : `http://localhost:3000/p/${username}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkedInShare = () => {
    const text = encodeURIComponent(`Check out my verified ${targetRole} Career Profile on Capabilio AI: ${publicUrl}`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`${displayName}'s Verified ${targetRole} Career Profile`);
    const body = encodeURIComponent(`Hi,\n\nI wanted to share my verified Capabilio Career Profile showcasing my demonstrated work and skills in ${targetRole}:\n\n${publicUrl}\n\nBest regards,\n${displayName}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border-2 border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden space-y-0 text-foreground font-sans">
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-brand" />
            <h3 className="font-bold text-base text-foreground">Share Verified Profile</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your public profile link is safe to share with recruiters and colleagues. It contains only verified public achievements.
          </p>

          <div className="space-y-2">
            <label className="text-2xs font-mono font-bold text-muted-foreground uppercase">PUBLIC PROFILE LINK</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border font-mono text-xs text-foreground focus:outline-none"
              />
              <button
                onClick={handleCopy}
                data-testid="copy-profile-link-btn"
                className="px-4 py-2.5 rounded-xl bg-brand text-white font-mono text-xs font-bold hover:bg-brand-hover transition-all flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <div className="text-2xs font-mono font-bold text-muted-foreground uppercase">DIRECT SHARING</div>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <button
                onClick={handleLinkedInShare}
                className="p-3 rounded-2xl border border-border hover:border-brand/40 bg-muted/30 hover:bg-brand/5 transition-all flex items-center justify-center gap-2"
              >
                <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                <span className="font-bold text-foreground">LinkedIn</span>
              </button>

              <button
                onClick={handleEmailShare}
                className="p-3 rounded-2xl border border-border hover:border-brand/40 bg-muted/30 hover:bg-brand/5 transition-all flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-brand" />
                <span className="font-bold text-foreground">Email</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end bg-muted/10">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-foreground text-background font-mono text-xs font-bold hover:bg-foreground/90 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
