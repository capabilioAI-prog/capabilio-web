'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Bot, 
  Share2, 
  Download, 
  Settings, 
  Edit3, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  Flame, 
  TrendingUp, 
  Clock, 
  ExternalLink, 
  ArrowRight, 
  Code2, 
  Database, 
  GraduationCap, 
  BrainCircuit, 
  Layers, 
  Play, 
  Video, 
  Check, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { SkillRadarChart } from '@/components/profile/skill-radar-chart';
import { ViewProofModal } from '@/components/profile/view-proof-modal';
import { ShareProfileModal } from '@/components/profile/share-profile-modal';
import { ProfileSettingsModal } from '@/components/profile/profile-settings-modal';

export default function CareerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<any | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/profile', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) {
        setProfileData(data.data);
        if (data.data.radarSkills && data.data.radarSkills.length > 0) {
          setSelectedSkill(data.data.radarSkills[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching career profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleOpenProof = (work: any) => {
    setSelectedProof(work);
    setIsProofModalOpen(true);
  };

  const handleDownloadProfile = () => {
    window.print();
  };

  if (loading || !profileData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 font-mono text-xs text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <div>Calibrating Verified Career Identity...</div>
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
    timelineEvents,
    portfolio,
    branding,
    academicProfile,
    achievements,
    streak,
    profileStrength,
  } = profileData;

  const latestInterview = aiInterviews[0] || null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-24">
      {/* 1. Header & Profile Identity Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Title & Affiliation */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-brand to-brand-hover text-white flex items-center justify-center font-mono text-2xl sm:text-3xl font-black shadow-lg shrink-0">
                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'C'}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight" data-testid="profile-name">
                    {profile.displayName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-brand/10 text-brand border border-brand/20">
                    VERIFIED CANDIDATE
                  </span>
                </div>

                <div className="text-sm font-bold text-foreground flex flex-wrap items-center gap-2 font-sans">
                  <span className="text-brand" data-testid="profile-target-role">{careerIdentity.targetRole}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{profile.level === 'student' ? 'Student / Fresher' : 'Early Professional'}</span>
                </div>

                <div className="text-xs text-muted-foreground font-mono flex flex-wrap items-center gap-2">
                  <span data-testid="profile-college">{profile.collegeName}</span>
                  <span>•</span>
                  <span data-testid="profile-stream">{academicProfile.streamName} ({academicProfile.shortCode})</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-auto font-mono text-xs">
              <button
                onClick={() => setIsShareModalOpen(true)}
                data-testid="share-profile-btn"
                className="px-4 py-2.5 rounded-2xl bg-brand hover:bg-brand-hover text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Profile</span>
              </button>

              <button
                onClick={handleDownloadProfile}
                data-testid="download-profile-btn"
                className="px-4 py-2.5 rounded-2xl border border-border bg-card hover:bg-muted text-foreground font-bold transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Download Proof</span>
              </button>

              <button
                onClick={() => setIsSettingsModalOpen(true)}
                data-testid="profile-settings-btn"
                className="p-2.5 rounded-2xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                title="Privacy & Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Profile Strength Bar */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xs uppercase text-muted-foreground font-bold">Profile Strength</span>
              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${profileStrength.score}%` }} />
              </div>
              <span className="font-bold text-foreground" data-testid="profile-strength-score">{profileStrength.score}%</span>
            </div>

            {profileStrength.missingElements.length > 0 && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span>Next:</span>
                <span className="text-brand font-semibold">{profileStrength.missingElements[0]}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* 2. Career Telemetry Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER ELO</div>
            <div className="text-2xl font-black text-foreground" data-testid="telemetry-career-elo">
              {telemetry.careerElo}
            </div>
            <div className="text-[9px] text-brand font-semibold">Arena Workstation</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER READINESS</div>
            <div className="text-2xl font-black text-brand" data-testid="telemetry-career-readiness">
              {telemetry.careerReadiness}%
            </div>
            <div className="text-[9px] text-muted-foreground">Weighted Index</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">INTERVIEW READINESS</div>
            <div className="text-2xl font-black text-emerald-500" data-testid="telemetry-interview-readiness">
              {telemetry.interviewReadiness}%
            </div>
            <div className="text-[9px] text-muted-foreground">AI Technical</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">VERIFIED WORKS</div>
            <div className="text-2xl font-black text-foreground" data-testid="telemetry-verified-works">
              {telemetry.verifiedWorksCount}
            </div>
            <div className="text-[9px] text-muted-foreground">Proof Minted</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">AI INTERVIEWS</div>
            <div className="text-2xl font-black text-foreground" data-testid="telemetry-ai-interviews">
              {telemetry.aiInterviewsCount}
            </div>
            <div className="text-[9px] text-muted-foreground">Completed Loops</div>
          </div>

          <div className="p-4 rounded-3xl bg-card border border-border shadow-xs space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">CURRENT STREAK</div>
            <div className="text-2xl font-black text-amber-500 flex items-center gap-1" data-testid="telemetry-streak">
              <span>{streak.current}d</span>
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
            <div className="text-[9px] text-muted-foreground">Active Practice</div>
          </div>
        </div>

        {/* 3. AI-Synthesized Career Identity Summary */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-mono font-bold uppercase text-brand tracking-wider">
                LIVING PROFESSIONAL IDENTITY // SYNTHESIZED CAREER NARRATIVE
              </h3>
            </div>
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {careerIdentity.experienceType}
            </span>
          </div>

          <p className="text-sm sm:text-base text-foreground leading-relaxed font-sans italic" data-testid="professional-summary">
            &ldquo;{careerIdentity.professionalSummary}&rdquo;
          </p>
        </div>

        {/* 4. Skill Radar Chart & Granular Skill Evidence */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Radar Chart */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold font-sans text-foreground">
                  Role Skill Competency Vector
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {careerIdentity.targetRole} • Click any skill for demonstrated evidence
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-brand">
                {radarSkills.length} SKILLS
              </span>
            </div>

            <div data-testid="skill-radar-container" className="py-2">
              <SkillRadarChart
                skills={radarSkills}
                selectedSkill={selectedSkill}
                onSelectSkill={(s) => setSelectedSkill(s)}
              />
            </div>
          </div>

          {/* Right: Selected Skill Evidence & Progression Breakdown */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <div className="text-2xs font-mono font-bold text-brand uppercase">DEMONSTRATED EVIDENCE</div>
                <h3 className="text-lg font-bold font-sans text-foreground" data-testid="selected-skill-name">
                  {selectedSkill?.name || 'SQL & Querying'}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-brand/10 border border-brand/20 text-center font-mono">
                <div className="text-[10px] text-brand uppercase font-bold">PROFICIENCY</div>
                <div className="text-xl font-black text-brand">{selectedSkill?.proficiency || 78}%</div>
              </div>
            </div>

            {/* Progression Trend */}
            <div className="space-y-2 font-mono text-xs">
              <div className="text-muted-foreground font-bold uppercase">SKILL PROGRESSION EVOLUTION</div>
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center gap-2 text-brand font-bold text-sm">
                  <span>60%</span>
                  <span>→</span>
                  <span className="text-rose-500">52%</span>
                  <span>→</span>
                  <span className="text-foreground">68%</span>
                  <span>→</span>
                  <span>74%</span>
                  <span>→</span>
                  <span className="text-emerald-500 font-black">{selectedSkill?.proficiency || 78}%</span>
                </div>
                <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                  Your {selectedSkill?.name} proficiency increased after completing query optimization and schema deduplication remediation missions in Arena.
                </p>
              </div>
            </div>

            {/* Demonstrating Artifacts */}
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

        {/* 5. Verified Work Showcase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-lg font-bold font-sans text-foreground">
                Verified Work Artifacts
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Cryptographically hashed simulation evidence backed by deterministic tests and AI evaluation.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-brand">
              {verifiedWorks.length} ARTIFACTS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifiedWorks.map((work: any) => (
              <div
                key={work.attemptId}
                className="p-6 rounded-3xl border border-border bg-card hover:border-brand/40 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      work.aiScore >= 70 
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                    }`}>
                      {work.aiScore >= 70 ? '✓ VERIFIED' : 'COMPLETED'}
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {work.eloChange >= 0 ? `+${work.eloChange}` : work.eloChange} ELO
                    </span>
                  </div>

                  <div>
                    <div className="text-2xs font-mono text-muted-foreground uppercase">{work.roleName} TRACK</div>
                    <h4 className="font-bold text-base text-foreground font-sans mt-0.5">
                      {work.missionTitle}
                    </h4>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                    {work.aiFeedback}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {work.skillsDemonstrated.map((sk: any, sIdx: number) => (
                      <span key={sIdx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-foreground">
                        {sk.skillName}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between font-mono text-xs">
                  <span className="text-muted-foreground">Score: <strong className="text-foreground">{work.aiScore}/100</strong></span>
                  <button
                    onClick={() => handleOpenProof(work)}
                    data-testid="view-proof-btn"
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

        {/* 6. AI Interview Performance */}
        {latestInterview && (
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="space-y-1">
                <div className="text-2xs font-mono font-bold uppercase text-brand">AI TECHNICAL INTERVIEW PERFORMANCE</div>
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

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-muted-foreground">
                Cryptographic SHA-256 Proof: {latestInterview.verificationHash?.slice(0, 24)}...
              </span>
              <Link
                href={`/interview/${latestInterview.id}/results`}
                data-testid="view-interview-proof-btn"
                className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5"
              >
                <span>VIEW INTERVIEW TRANSCRIPT</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* 7. Career ELO Journey & Progression Timeline */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-base font-bold font-sans text-foreground">
                Career ELO Progression Journey
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Historical progression displaying learning curves, regressions, and remediations.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-brand">
              CURRENT: {telemetry.careerElo} ELO
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            {careerJourney.map((step: any, idx: number) => (
              <React.Fragment key={idx}>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-0.5">
                  <div className="text-base font-black text-foreground">{step.elo} ELO</div>
                  <div className="text-[10px] text-muted-foreground">{step.event}</div>
                </div>
                {idx < careerJourney.length - 1 && (
                  <span className="text-muted-foreground font-bold">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 8. Academic Foundation & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Academic Foundation */}
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
                <div className="text-2xl font-black text-foreground" data-testid="profile-stream-rating">
                  {academicProfile.streamRating} PTS
                </div>
                <div className="text-[10px] text-muted-foreground">Strictly isolated from Career Role ELO</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-muted/30 border border-border">
                  <div className="text-[10px] text-muted-foreground">Solved Challenges</div>
                  <div className="text-lg font-bold text-foreground">{academicProfile.academicChallengesSolved}</div>
                </div>
                <div className="p-3 rounded-2xl bg-muted/30 border border-border">
                  <div className="text-[10px] text-muted-foreground">Achievements</div>
                  <div className="text-lg font-bold text-foreground">{academicProfile.academicAchievements}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Verified Achievements */}
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

      {/* Modals */}
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

      <ProfileSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialUsername={profile.username || 'candidate'}
        initialVisibility={profile.profileVisibility || 'public'}
        onSaved={fetchProfile}
      />
    </div>
  );
}
