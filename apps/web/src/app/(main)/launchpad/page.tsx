'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Rocket, 
  Search, 
  Filter, 
  Bookmark, 
  Briefcase, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  ExternalLink,
  SlidersHorizontal,
  BookmarkCheck,
  Building2,
  Clock
} from 'lucide-react';
import { OpportunityCard } from '@/components/launchpad/opportunity-card';
import { ApplyProofModal } from '@/components/launchpad/apply-proof-modal';

export default function LaunchpadWorkspacePage() {
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkMode, setSelectedWorkMode] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [activeTab, setActiveTab] = useState<'recommended' | 'all' | 'saved' | 'applications'>('recommended');

  // Modal State
  const [selectedOpportunity, setSelectedOpportunity] = useState<any | null>(null);
  const [proofPackage, setProofPackage] = useState<any | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const loadLaunchpad = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/launchpad', { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setWorkspace(json.data);
      } else {
        setError(json.error?.message || 'Failed to load Launchpad opportunities');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to Launchpad server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLaunchpad();
  }, []);

  const handleSaveToggle = async (jobId: string, isSaved: boolean) => {
    try {
      await fetch('http://localhost:3001/api/launchpad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId, isSaved }),
      });
      loadLaunchpad();
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
    loadLaunchpad();
  };

  if (loading && !workspace) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 font-mono text-xs text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <div>Analyzing Candidate Skill Graph & Matching Opportunities...</div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center font-sans space-y-4">
        <h2 className="text-xl font-bold text-foreground">Launchpad Unavailable</h2>
        <p className="text-xs text-muted-foreground max-w-sm font-mono">{error}</p>
        <button
          onClick={loadLaunchpad}
          className="px-4 py-2 rounded-xl bg-brand text-white font-mono text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { telemetry, recommendedOpportunities, allOpportunities, savedOpportunities, applications } = workspace;

  // Filter opportunities
  const getDisplayedOpportunities = () => {
    let source = allOpportunities;
    if (activeTab === 'recommended') source = recommendedOpportunities;
    if (activeTab === 'saved') source = savedOpportunities;

    return source.filter((o: any) => {
      const matchesSearch = !searchQuery || 
        o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.requiredSkills.some((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesWorkMode = selectedWorkMode === 'all' || o.workMode === selectedWorkMode;
      const matchesType = selectedType === 'all' || o.employmentType === selectedType;

      return matchesSearch && matchesWorkMode && matchesType;
    });
  };

  const displayedList = getDisplayedOpportunities();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-24">
      {/* Header Workspace Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-brand/10 text-brand border border-brand/20">
                  CAPABILIO V1.8 // LAUNCHPAD
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  ✓ EVIDENCE-BASED OPPORTUNITY ENGINE
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight" data-testid="launchpad-title">
                  LAUNCHPAD
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-sans">
                  Find internships and early-career opportunities matched to what you can actually demonstrate.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
              <Link
                href="/launchpad/applications"
                data-testid="nav-applications-tracker-btn"
                className="px-4 py-2.5 rounded-2xl bg-brand hover:bg-brand-hover text-white font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>My Applications ({applications.length})</span>
              </Link>

              <Link
                href="/launchpad/saved"
                data-testid="nav-saved-btn"
                className="px-4 py-2.5 rounded-2xl border border-border bg-card hover:bg-muted text-foreground font-bold transition-all flex items-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Saved ({savedOpportunities.length})</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Telemetry Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER ROLE</div>
            <div className="text-base font-black text-brand truncate" data-testid="telemetry-career-role">
              {telemetry.careerRole}
            </div>
            <div className="text-[9px] text-muted-foreground">Target Role</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER ELO</div>
            <div className="text-2xl font-black text-foreground" data-testid="telemetry-career-elo">
              {telemetry.careerElo}
            </div>
            <div className="text-[9px] text-emerald-600 font-semibold">Verified Rating</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER READINESS</div>
            <div className="text-2xl font-black text-brand" data-testid="telemetry-career-readiness">
              {telemetry.careerReadiness}%
            </div>
            <div className="text-[9px] text-muted-foreground">Role Benchmark</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">VERIFIED SKILLS</div>
            <div className="text-2xl font-black text-foreground">
              {telemetry.verifiedSkillsCount}
            </div>
            <div className="text-[9px] text-muted-foreground">Demonstrated Vectors</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">MATCHED ROLES</div>
            <div className="text-2xl font-black text-foreground">
              {telemetry.availableApplicationsCount}
            </div>
            <div className="text-[9px] text-muted-foreground">In Network</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">APPLIED</div>
            <div className="text-2xl font-black text-foreground">
              {telemetry.appliedCount}
            </div>
            <div className="text-[9px] text-brand font-semibold">Active Pipelines</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="opportunity-search-input"
                placeholder="Search by role title, company (CRED, Razorpay...), skill (SQL, Analytics), or location..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-muted/40 border border-border text-foreground font-sans text-sm focus:outline-none focus:border-brand"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <select
                value={selectedWorkMode}
                onChange={(e) => setSelectedWorkMode(e.target.value)}
                data-testid="filter-work-mode"
                className="px-3.5 py-3 rounded-2xl bg-muted/40 border border-border text-foreground focus:outline-none focus:border-brand"
              >
                <option value="all">All Modes</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                data-testid="filter-employment-type"
                className="px-3.5 py-3 rounded-2xl bg-muted/40 border border-border text-foreground focus:outline-none focus:border-brand"
              >
                <option value="all">All Types</option>
                <option value="internship">Internship</option>
                <option value="entry_level">Entry Level</option>
                <option value="graduate">Graduate Trainee</option>
              </select>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-2 border-t border-border font-mono text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('recommended')}
              data-testid="tab-recommended"
              className={`px-4 py-2 rounded-xl transition-all font-bold ${
                activeTab === 'recommended'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Recommended For You ({recommendedOpportunities.length})
            </button>

            <button
              onClick={() => setActiveTab('all')}
              data-testid="tab-all-opportunities"
              className={`px-4 py-2 rounded-xl transition-all font-bold ${
                activeTab === 'all'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              All Opportunities ({allOpportunities.length})
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              data-testid="tab-saved"
              className={`px-4 py-2 rounded-xl transition-all font-bold ${
                activeTab === 'saved'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              Saved ({savedOpportunities.length})
            </button>
          </div>
        </div>

        {/* Opportunities Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border font-mono text-xs">
            <span className="text-muted-foreground font-bold uppercase">
              SHOWING {displayedList.length} OPPORTUNITIES
            </span>
            <span className="text-brand font-bold">
              Prioritizing Fresher & Student Opportunities
            </span>
          </div>

          {displayedList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-border bg-card space-y-3 font-sans">
              <Briefcase className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="text-base font-bold text-foreground">No opportunities match your filter</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto font-mono">
                Try clearing your search query or selecting &ldquo;All Modes&rdquo; / &ldquo;All Types&rdquo;.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedWorkMode('all'); setSelectedType('all'); }}
                className="px-4 py-2 rounded-xl bg-muted text-foreground font-mono text-xs font-bold"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedList.map((opp: any) => (
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
