'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ShieldCheck, 
  Share2, 
  Download, 
  Award, 
  CheckCircle2, 
  Flame, 
  TrendingUp, 
  Clock, 
  ExternalLink, 
  ArrowRight, 
  BrainCircuit, 
  GraduationCap, 
  Star,
  Sparkles,
  Play,
  Video,
  Lock,
  Mail,
  Calendar
} from 'lucide-react';
import { SkillRadarChart } from '@/components/profile/skill-radar-chart';
import { ViewProofModal } from '@/components/profile/view-proof-modal';
import { ShareProfileModal } from '@/components/profile/share-profile-modal';

export default function PublicCareerProfileAndPortfolioPage() {
  const params = useParams();
  const username = params.username as string;

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [portfolioData, setPortfolioData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<any | null>(null);

  useEffect(() => {
    async function loadPublicData() {
      try {
        setLoading(true);
        // Load profile and portfolio data in parallel
        const [profRes, portRes] = await Promise.all([
          fetch(`http://localhost:3001/api/profile/public?username=${username}`),
          fetch(`http://localhost:3001/api/portfolio/public/${username}`)
        ]);

        const profJson = await profRes.json();
        const portJson = await portRes.json();

        if (profRes.ok && profJson.success && profJson.data) {
          setProfileData(profJson.data);
          if (profJson.data.radarSkills && profJson.data.radarSkills.length > 0) {
            setSelectedSkill(profJson.data.radarSkills[0]);
          }
        } else {
          setError(profJson.error?.message || 'Profile not found or is set to private');
          return;
        }

        if (portRes.ok && portJson.success && portJson.data) {
          setPortfolioData(portJson.data);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading public profile & portfolio');
      } finally {
        setLoading(false);
      }
    }
    loadPublicData();
  }, [username]);

  const handleOpenProof = (proofItem: any) => {
    setSelectedProof(proofItem.details || proofItem);
    setIsProofModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 font-mono text-xs text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <div>Verifying Public Career Credentials & Living Portfolio...</div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center font-sans space-y-4">
        <div className="w-12 h-12 rounded-3xl bg-muted border border-border flex items-center justify-center text-muted-foreground mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Career Profile Unavailable</h2>
        <p className="text-xs text-muted-foreground max-w-sm font-mono">
          {error || 'This profile is either private or does not exist.'}
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-foreground text-background font-mono text-xs font-bold hover:bg-foreground/90 transition-all"
        >
          Return to Capabilio AI
        </Link>
      </div>
    );
  }

  const {
    profile,
    careerIdentity,
    telemetry,
    radarSkills,
    verifiedWorks,
    aiInterviews,
    careerJourney,
    academicProfile,
    achievements,
    streak,
  } = profileData;

  const latestInterview = aiInterviews?.[0] || null;
  const portfolioSettings = portfolioData?.settings || {};
  const personalBrand = portfolioData?.personalBrand || null;
  const featuredWorks = portfolioData?.featuredItems || verifiedWorks?.slice(0, 2) || [];
  const theme = portfolioSettings.theme || 'editorial';

  return (
    <div className={`min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-24 theme-${theme}`}>
      {/* Top Banner */}
      <div className="bg-muted/40 border-b border-border py-2 px-4 text-center font-mono text-[11px] text-muted-foreground flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-brand" />
        <span>CAPABILIO AI // RECRUITER-VERIFIED CAREER CREDENTIAL & LIVING PORTFOLIO</span>
      </div>

      {/* Header Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-brand to-brand-hover text-white flex items-center justify-center font-mono text-2xl sm:text-3xl font-black shadow-lg shrink-0">
                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'C'}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight" data-testid="public-profile-name">
                    {profile.displayName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    ✓ VERIFIED PROOF
                  </span>
                </div>

                <div className="text-sm font-bold text-foreground flex flex-wrap items-center gap-2 font-sans">
                  <span className="text-brand" data-testid="public-target-role">{careerIdentity.targetRole}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{profile.level === 'student' ? 'Student / Fresher' : 'Early Professional'}</span>
                </div>

                <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-2">
                  <span data-testid="public-college">{profile.collegeName}</span>
                  <span>•</span>
                  <span data-testid="public-stream">{academicProfile.streamName} ({academicProfile.shortCode})</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
              {portfolioSettings.ctaText && (
                <a
                  href={portfolioSettings.ctaUrl || `mailto:recruiter@capabilio.ai?subject=Candidate inquiry: ${profile.displayName}`}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="public-cta-btn"
                  className="px-4 py-2.5 rounded-2xl bg-foreground text-background font-bold shadow-md hover:bg-foreground/90 transition-all flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-brand" />
                  <span>{portfolioSettings.ctaText}</span>
                </a>
              )}

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-brand hover:bg-brand-hover text-white font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-2xl border border-border bg-card hover:bg-muted text-foreground font-bold transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Telemetry Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER ELO</div>
            <div className="text-2xl font-black text-foreground" data-testid="public-career-elo">
              {telemetry.careerElo}
            </div>
            <div className="text-[9px] text-brand font-semibold">Arena Workstation</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER READINESS</div>
            <div className="text-2xl font-black text-brand" data-testid="public-career-readiness">
              {telemetry.careerReadiness}%
            </div>
            <div className="text-[9px] text-muted-foreground">Weighted Index</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">INTERVIEW READINESS</div>
            <div className="text-2xl font-black text-emerald-500" data-testid="public-interview-readiness">
              {telemetry.interviewReadiness}%
            </div>
            <div className="text-[9px] text-muted-foreground">AI Technical</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">VERIFIED WORKS</div>
            <div className="text-2xl font-black text-foreground">
              {telemetry.verifiedWorksCount}
            </div>
            <div className="text-[9px] text-muted-foreground">Proof Minted</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">AI INTERVIEWS</div>
            <div className="text-2xl font-black text-foreground">
              {telemetry.aiInterviewsCount}
            </div>
            <div className="text-[9px] text-muted-foreground">Completed Loops</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CURRENT STREAK</div>
            <div className="text-2xl font-black text-amber-500 flex items-center gap-1">
              <span>{streak.current}d</span>
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
            <div className="text-[9px] text-muted-foreground">Active Practice</div>
          </div>
        </div>

        {/* AI Career Narrative */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-mono font-bold uppercase text-brand tracking-wider">
                SYNTHESIZED PROFESSIONAL IDENTITY
              </h3>
            </div>
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {careerIdentity.experienceType}
            </span>
          </div>

          <p className="text-sm sm:text-base text-foreground leading-relaxed font-sans italic" data-testid="public-summary">
            &ldquo;{portfolioSettings.about || careerIdentity.professionalSummary}&rdquo;
          </p>
        </div>

        {/* Featured Living Portfolio Work */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <div className="text-2xs font-mono font-bold text-brand uppercase">FLAGSHIP EVIDENCE</div>
              <h3 className="text-xl font-bold font-sans text-foreground">
                Featured Verified Work & Simulations
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-brand">
              {featuredWorks.length} FEATURED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredWorks.map((work: any) => (
              <div
                key={work.id || work.attemptId}
                className="p-6 rounded-3xl border border-border bg-card hover:border-brand/40 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                      ✓ VERIFIED PROOF
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {work.eloChange >= 0 ? `+${work.eloChange}` : work.eloChange} ELO
                    </span>
                  </div>

                  <div>
                    <div className="text-2xs font-mono text-muted-foreground uppercase">{work.roleName || careerIdentity.targetRole}</div>
                    <h4 className="font-bold text-base text-foreground font-sans mt-0.5">
                      {work.title || work.missionTitle}
                    </h4>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                    {work.description || work.aiFeedback}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(work.skillsDemonstrated || work.skills || []).map((sk: any, sIdx: number) => (
                      <span key={sIdx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-foreground">
                        {sk.skillName || sk.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between font-mono text-xs">
                  <span className="text-muted-foreground">Score: <strong className="text-foreground">{work.score || work.aiScore}/100</strong></span>
                  <button
                    onClick={() => handleOpenProof(work)}
                    data-testid="public-view-proof-btn"
                    className="px-3.5 py-1.5 rounded-xl border border-border hover:bg-muted text-brand font-bold transition-colors flex items-center gap-1"
                  >
                    <span>VIEW PROOF</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill Radar & Evidence Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold font-sans text-foreground">
                  Skill Competency Vector
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {careerIdentity.targetRole} • Click any skill for demonstrated evidence
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-brand">
                {radarSkills?.length || 6} SKILLS
              </span>
            </div>

            <div className="py-2">
              <SkillRadarChart
                skills={radarSkills}
                selectedSkill={selectedSkill}
                onSelectSkill={(s) => setSelectedSkill(s)}
              />
            </div>
          </div>

          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <div className="text-2xs font-mono font-bold text-brand uppercase">DEMONSTRATED EVIDENCE</div>
                <h3 className="text-lg font-bold font-sans text-foreground">
                  {selectedSkill?.name || 'SQL & Querying'}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-brand/10 border border-brand/20 text-center font-mono">
                <div className="text-[10px] text-brand uppercase font-bold">PROFICIENCY</div>
                <div className="text-xl font-black text-brand">{selectedSkill?.proficiency || 78}%</div>
              </div>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="text-muted-foreground font-bold uppercase">SKILL PROGRESSION EVOLUTION</div>
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center gap-2 text-brand font-bold text-sm">
                  <span>60%</span>
                  <span>→</span>
                  <span>68%</span>
                  <span>→</span>
                  <span>74%</span>
                  <span>→</span>
                  <span className="text-emerald-500 font-black">{selectedSkill?.proficiency || 78}%</span>
                </div>
                <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                  Demonstrated proficiency through verified workplace simulations in Capabilio Arena.
                </p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="text-muted-foreground font-bold uppercase">ASSOCIATED VERIFIED SESSIONS</div>
              <div className="space-y-2">
                {verifiedWorks.slice(0, 2).map((vw: any) => (
                  <div
                    key={vw.attemptId}
                    onClick={() => handleOpenProof(vw)}
                    className="p-3.5 rounded-2xl border border-border hover:border-brand/40 bg-card transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-foreground font-sans">{vw.missionTitle}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">Score: {vw.aiScore}/100 • {vw.eloChange >= 0 ? `+${vw.eloChange}` : vw.eloChange} ELO</div>
                    </div>
                    <span className="text-xs text-brand font-bold">View Proof →</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Public AI Interview Section */}
        {latestInterview && (
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="space-y-1">
                <div className="text-2xs font-mono font-bold uppercase text-brand">AI TECHNICAL INTERVIEW EVALUATION</div>
                <h3 className="text-lg font-bold font-sans text-foreground">
                  {latestInterview.roleTitle} {latestInterview.mode?.toUpperCase()} INTERVIEW
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-muted/40 border border-border text-center font-mono">
                  <div className="text-[9px] text-muted-foreground uppercase font-bold">SCORE</div>
                  <div className="text-lg font-black text-foreground">{latestInterview.score}/100</div>
                </div>

                <div className="p-3 rounded-2xl bg-brand/10 border border-brand/20 text-center font-mono">
                  <div className="text-[9px] text-brand uppercase font-bold">READINESS</div>
                  <div className="text-lg font-black text-brand">{latestInterview.readinessScore}%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                <div className="text-muted-foreground">Technical Depth</div>
                <div className="text-base font-bold text-foreground">{latestInterview.subscores.technicalKnowledge}%</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                <div className="text-muted-foreground">Problem Solving</div>
                <div className="text-base font-bold text-foreground">{latestInterview.subscores.problemSolving}%</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                <div className="text-muted-foreground">Communication</div>
                <div className="text-base font-bold text-foreground">{latestInterview.subscores.communication}%</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                <div className="text-muted-foreground">Business Reasoning</div>
                <div className="text-base font-bold text-foreground">{latestInterview.subscores.businessUnderstanding}%</div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Cryptographic Proof: {latestInterview.verificationHash}</span>
              <span className="text-emerald-500 font-bold">✓ Verified by Capabilio Evaluation Engine</span>
            </div>
          </div>
        )}

        {/* Academic Foundation & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base font-sans text-foreground">
                  Academic Foundation
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-brand">
                {academicProfile.shortCode} STREAM
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase">ACADEMIC STREAM RATING</div>
                <div className="text-2xl font-black text-foreground">
                  {academicProfile.streamRating} PTS
                </div>
                <div className="text-[10px] text-muted-foreground">Isolated academic stream baseline</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base font-sans text-foreground">
                  Earned Achievements
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-500">
                {achievements.length} BADGES
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {achievements.map((ach: any) => (
                <div
                  key={ach.id}
                  className="p-3 rounded-2xl bg-muted/20 border border-border flex items-center justify-between font-mono text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{ach.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-sans">{ach.description}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{new Date(ach.earnedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
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
        username={profile.username || 'candidate'}
        displayName={profile.displayName}
        targetRole={careerIdentity.targetRole}
      />
    </div>
  );
}
