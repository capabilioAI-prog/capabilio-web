'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bookmark, 
  ArrowLeft, 
  Briefcase, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';
import { OpportunityCard } from '@/components/launchpad/opportunity-card';
import { ApplyProofModal } from '@/components/launchpad/apply-proof-modal';

export default function SavedOpportunitiesPage() {
  const [loading, setLoading] = useState(true);
  const [savedList, setSavedList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedOpportunity, setSelectedOpportunity] = useState<any | null>(null);
  const [proofPackage, setProofPackage] = useState<any | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const loadSaved = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/launchpad', { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setSavedList(json.data.savedOpportunities || []);
      } else {
        setError(json.error?.message || 'Failed to load saved opportunities');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading saved opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const handleSaveToggle = async (jobId: string, isSaved: boolean) => {
    try {
      await fetch('http://localhost:3001/api/launchpad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId, isSaved }),
      });
      loadSaved();
    } catch (err) {
      console.error('Save toggle error:', err);
    }
  };

  const handleOpenApplyModal = async (opp: any) => {
    try {
      setSelectedOpportunity(opp);
      const res = await fetch(`http://localhost:3001/api/launchpad/opportunities/${opp.id}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.success) {
        setProofPackage(json.data.proofPackage);
        setIsApplyModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching proof package:', err);
    }
  };

  const handleConfirmApply = async () => {
    if (!selectedOpportunity) return;
    await fetch('http://localhost:3001/api/launchpad/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        jobId: selectedOpportunity.id,
        company: selectedOpportunity.company,
        roleTitle: selectedOpportunity.title,
        salaryRange: selectedOpportunity.stipendOrSalary,
        matchScore: selectedOpportunity.matchScore,
      }),
    });
    loadSaved();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 font-mono text-xs text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <div>Loading Saved Opportunities...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-24">
      {/* Header Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-3">
          <div className="flex items-center justify-between">
            <Link
              href="/launchpad"
              className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Launchpad</span>
            </Link>

            <span className="text-xs font-mono font-bold text-brand">
              {savedList.length} SAVED
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight" data-testid="saved-opportunities-title">
            SAVED OPPORTUNITIES
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans">
            Bookmarked positions and internship openings to apply with verified proof.
          </p>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {savedList.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-border bg-card space-y-3 font-sans">
            <Bookmark className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold text-foreground">No saved opportunities</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto font-mono">
              Browse Launchpad and bookmark opportunities to review and apply later.
            </p>
            <Link
              href="/launchpad"
              className="inline-block px-5 py-2.5 rounded-xl bg-brand text-white font-mono text-xs font-bold"
            >
              Explore Opportunities
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedList.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onSaveToggle={handleSaveToggle}
                onApplyClick={handleOpenApplyModal}
              />
            ))}
          </div>
        )}
      </div>

      <ApplyProofModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        opportunity={selectedOpportunity}
        proofPackage={proofPackage}
        matchScore={selectedOpportunity?.matchScore || 82}
        onConfirmApply={handleConfirmApply}
      />
    </div>
  );
}
