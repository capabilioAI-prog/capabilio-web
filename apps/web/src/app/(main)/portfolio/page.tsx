'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  Edit3, 
  Share2, 
  Star, 
  Flame, 
  BrainCircuit, 
  TrendingUp, 
  Award, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight, 
  Filter,
  Eye,
  FileCode
} from 'lucide-react';
import { LivingPortfolioPayload, PortfolioEvidenceItem } from '@capabilio/types';
import { PortfolioCard } from '@/components/portfolio/portfolio-card';
import { PortfolioIntelligenceCard } from '@/components/portfolio/portfolio-intelligence-card';
import { PortfolioCompletenessMeter } from '@/components/portfolio/portfolio-completeness-meter';
import { PersonalBrandingVideoCard } from '@/components/portfolio/personal-branding-video-card';
import { ViewProofModal } from '@/components/profile/view-proof-modal';
import { ShareProfileModal } from '@/components/profile/share-profile-modal';

export default function LivingPortfolioPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LivingPortfolioPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<any | null>(null);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/portfolio', { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setData(json.data);
        if (json.data.skillsDemonstrated && json.data.skillsDemonstrated.length > 0) {
          setSelectedSkill(json.data.skillsDemonstrated[0]);
        }
      } else {
        setError(json.error?.message || 'Failed to load living portfolio');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to portfolio server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const handleToggleFeature = async (item: PortfolioEvidenceItem) => {
    if (!data) return;
    const newFeatured = !item.isFeatured;
    try {
      await fetch('http://localhost:3001/api/portfolio/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          itemId: item.id,
          itemType: item.type,
          isFeatured: newFeatured,
        }),
      });
      loadPortfolio();
    } catch (err) {
      console.error('Feature toggle error:', err);
    }
  };

  const handleOpenProof = (item: PortfolioEvidenceItem) => {
    setSelectedProof(item.details || item);
    setIsProofModalOpen(true);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 font-mono text-xs text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <div>Assembling Living Portfolio & Verified Evidence...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center font-sans space-y-4">
        <h2 className="text-xl font-bold text-foreground">Portfolio Unavailable</h2>
        <p className="text-xs text-muted-foreground max-w-sm font-mono">{error}</p>
        <button
          onClick={loadPortfolio}
          className="px-4 py-2 rounded-xl bg-brand text-white font-mono text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    user,
    telemetry,
    featuredItems,
    allItems,
    skillsDemonstrated,
    careerEvolution,
    evidenceTimeline,
    summary,
    insights,
    completeness,
    personalBrand,
    settings,
  } = data;

  const filteredItems = allItems.filter(item => {
    if (filterType === 'all') return true;
    if (filterType === 'verified_work') return item.type === 'verified_work';
    if (filterType === 'ai_interview') return item.type === 'ai_interview';
    if (filterType === 'academic_work') return item.type === 'academic_work';
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-24">
      {/* Header Workspace Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-brand/10 text-brand border border-brand/20">
                  CAPABILIO V1.7 // LIVING PORTFOLIO
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  ✓ EVIDENCE-BACKED
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight" data-testid="portfolio-title">
                  MY LIVING PORTFOLIO
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-sans">
                  A continuously evolving showcase of your verified workplace simulations, AI interviews, and demonstrated skills.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
              <Link
                href={`/p/${user.username}`}
                target="_blank"
                data-testid="preview-public-portfolio-btn"
                className="px-4 py-2.5 rounded-2xl bg-brand hover:bg-brand-hover text-white font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Public Portfolio</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </Link>

              <Link
                href="/portfolio/edit"
                data-testid="edit-portfolio-btn"
                className="px-4 py-2.5 rounded-2xl border border-border bg-card hover:bg-muted text-foreground font-bold transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Edit Portfolio</span>
              </Link>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl border border-border bg-card hover:bg-muted text-foreground font-bold transition-all flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Telemetry Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">VERIFIED WORK</div>
            <div className="text-2xl font-black text-foreground" data-testid="portfolio-verified-count">
              {telemetry.verifiedWorksCount}
            </div>
            <div className="text-[9px] text-emerald-600 font-semibold">Arena Simulations</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">AI INTERVIEWS</div>
            <div className="text-2xl font-black text-foreground" data-testid="portfolio-interviews-count">
              {telemetry.aiInterviewsCount}
            </div>
            <div className="text-[9px] text-brand font-semibold">Completed Loops</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">SKILLS PROVEN</div>
            <div className="text-2xl font-black text-foreground">
              {telemetry.skillsCount}
            </div>
            <div className="text-[9px] text-muted-foreground">Demonstrated Skills</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER ELO</div>
            <div className="text-2xl font-black text-foreground" data-testid="portfolio-career-elo">
              {telemetry.careerElo}
            </div>
            <div className="text-[9px] text-brand font-semibold">{user.targetRole}</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER READINESS</div>
            <div className="text-2xl font-black text-brand" data-testid="portfolio-career-readiness">
              {telemetry.careerReadiness}%
            </div>
            <div className="text-[9px] text-muted-foreground">Weighted Index</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">ACADEMIC STREAM</div>
            <div className="text-2xl font-black text-foreground">
              {telemetry.streamRating} PTS
            </div>
            <div className="text-[9px] text-purple-600 font-semibold">{user.stream}</div>
          </div>
        </div>

        {/* AI Portfolio Summary Narrative */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-mono font-bold uppercase text-brand tracking-wider">
                EVIDENCE-SYNTHESIZED PROFESSIONAL SUMMARY
              </h3>
            </div>
            <span className="text-2xs font-mono text-muted-foreground uppercase">
              {user.targetRole}
            </span>
          </div>

          <p className="text-sm sm:text-base text-foreground leading-relaxed font-sans italic" data-testid="portfolio-summary-text">
            &ldquo;{summary.aiGeneratedSummary}&rdquo;
          </p>
        </div>

        {/* Featured Evidence Hero Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div>
              <div className="text-2xs font-mono font-bold text-brand uppercase">CURATED HIGHLIGHTS</div>
              <h3 className="text-xl font-bold font-sans text-foreground">
                Featured Work & Flagship Proof
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-brand">
              {featuredItems.length} FEATURED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredItems.map((item) => (
              <PortfolioCard
                key={item.id}
                item={item}
                onOpenProof={handleOpenProof}
                onToggleFeature={handleToggleFeature}
                isEditable={true}
              />
            ))}
          </div>
        </div>

        {/* All Demonstrated Evidence Filter & Grid */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <h3 className="text-xl font-bold font-sans text-foreground">
                All Demonstrated Evidence
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Click any evidence card to inspect deterministic SQL code, test execution, and verification hashes.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 font-mono text-2xs overflow-x-auto pb-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl border transition-all ${
                  filterType === 'all'
                    ? 'bg-foreground text-background border-foreground font-bold'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({allItems.length})
              </button>
              <button
                onClick={() => setFilterType('verified_work')}
                className={`px-3 py-1.5 rounded-xl border transition-all ${
                  filterType === 'verified_work'
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Arena Work
              </button>
              <button
                onClick={() => setFilterType('ai_interview')}
                className={`px-3 py-1.5 rounded-xl border transition-all ${
                  filterType === 'ai_interview'
                    ? 'bg-brand text-white border-brand font-bold'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                AI Interviews
              </button>
              <button
                onClick={() => setFilterType('academic_work')}
                className={`px-3 py-1.5 rounded-xl border transition-all ${
                  filterType === 'academic_work'
                    ? 'bg-purple-600 text-white border-purple-600 font-bold'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Academic Stream
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <PortfolioCard
                key={item.id}
                item={item}
                onOpenProof={handleOpenProof}
                onToggleFeature={handleToggleFeature}
                isEditable={true}
              />
            ))}
          </div>
        </div>

        {/* Skills Demonstrated & Drilldown */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <div className="text-2xs font-mono font-bold text-brand uppercase">MEASURABLE CAPABILITIES</div>
              <h3 className="text-lg font-bold font-sans text-foreground">
                Demonstrated Skill Breakdown
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-brand">
              {skillsDemonstrated.length} VERIFIED VECTORS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
            {skillsDemonstrated.map((sk) => (
              <div
                key={sk.name}
                onClick={() => setSelectedSkill(sk)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  selectedSkill?.name === sk.name
                    ? 'border-brand ring-1 ring-brand/20 bg-muted/40'
                    : 'border-border bg-card hover:border-brand/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground font-sans text-sm">{sk.name}</span>
                  <span className="text-brand font-black text-base">{sk.proficiency}%</span>
                </div>

                <div className="flex items-center justify-between text-2xs text-muted-foreground pt-1 border-t border-border">
                  <span>{sk.evidenceCount} Demonstrations</span>
                  <span className="text-emerald-500 font-bold">{sk.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Intelligence & Completeness */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <PortfolioIntelligenceCard insights={insights} />
          </div>
          <div className="lg:col-span-5">
            <PortfolioCompletenessMeter completeness={completeness} />
          </div>
        </div>

        {/* Personal Branding & Video Section */}
        <PersonalBrandingVideoCard
          personalBrand={personalBrand}
          roleName={user.targetRole}
          onRefresh={loadPortfolio}
        />

        {/* Career Evolution Progression Steps */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <div className="text-2xs font-mono font-bold text-brand uppercase">GROWTH TRAJECTORY</div>
              <h3 className="text-lg font-bold font-sans text-foreground">
                Career Progression & Capability Evolution
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-foreground">
              Current: <strong className="text-brand">{telemetry.careerElo} ELO</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            {careerEvolution.map((step, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase">STEP 0{idx + 1}</span>
                  <span className="text-base font-black text-brand">{step.elo} ELO</span>
                </div>
                <div className="font-bold text-foreground font-sans text-xs">{step.label}</div>
                {step.missionTitle && (
                  <div className="text-[11px] text-muted-foreground font-sans line-clamp-1">{step.missionTitle}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Unified Evidence Timeline */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-lg font-bold font-sans text-foreground">
                Career Evidence Timeline
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Chronological record of verified simulation submissions, calibrations, and AI interviews.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-brand">
              {evidenceTimeline.length} MILESTONES
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {evidenceTimeline.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-muted text-foreground">
                      {ev.category}
                    </span>
                    <span className="font-bold text-foreground font-sans text-sm">{ev.title}</span>
                  </div>
                  <div className="text-2xs text-muted-foreground">
                    {new Date(ev.date).toLocaleDateString()} • {ev.roleName}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <span className="text-muted-foreground">Score: <strong className="text-foreground">{ev.score}/100</strong></span>
                  <span className="text-brand font-bold">{ev.eloDelta > 0 ? `+${ev.eloDelta}` : ev.eloDelta} ELO</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ViewProofModal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        proof={selectedProof}
      />

      <ShareProfileModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        username={user.username}
        displayName={user.displayName}
        targetRole={user.targetRole}
      />
    </div>
  );
}
