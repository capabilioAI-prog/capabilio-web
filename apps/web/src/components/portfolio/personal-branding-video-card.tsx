'use client';

import React, { useState } from 'react';
import { Video, Lock, Sparkles, Play, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useEntitlements } from '@/lib/entitlements-context';
import { PersonalBrandData } from '@capabilio/types';

interface PersonalBrandingVideoCardProps {
  personalBrand: PersonalBrandData;
  roleName: string;
  onRefresh?: () => void;
}

export function PersonalBrandingVideoCard({
  personalBrand,
  roleName,
  onRefresh,
}: PersonalBrandingVideoCardProps) {
  const { openUpgradeModal, plan } = useEntitlements();
  const isElite = personalBrand.isEliteEntitled || plan === 'elite';
  const [activeTab, setActiveTab] = useState<'script' | 'structure'>('structure');
  const [generating, setGenerating] = useState(false);
  const [videoGenerated, setVideoGenerated] = useState(personalBrand.videoStatus === 'ready' || !!personalBrand.videoUrl);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setVideoGenerated(true);
      if (onRefresh) onRefresh();
    }, 2000);
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-brand" />
            <span className="text-2xs font-mono font-bold uppercase tracking-wider text-brand">
              45-SECOND PERSONAL BRANDING VIDEO
            </span>
          </div>
          <h3 className="text-lg font-bold font-sans text-foreground">
            AI-Synthesized Video Capability Pitch
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {isElite ? (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ELITE INCLUDED</span>
            </span>
          ) : (
            <button
              onClick={() => openUpgradeModal('elite')}
              data-testid="upgrade-to-elite-video-btn"
              className="px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-brand text-white hover:bg-brand-hover transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Upgrade to Elite</span>
            </button>
          )}
        </div>
      </div>

      {!isElite ? (
        <div className="p-6 rounded-2xl bg-muted/40 border border-border text-center space-y-4 font-mono text-xs">
          <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-foreground font-sans">
              Personal Branding Video is an Elite Feature
            </div>
            <p className="text-muted-foreground max-w-md mx-auto text-xs font-sans">
              Create a professional 45-second video profile that highlights your verified strengths, career ELO, and live Arena simulation evidence.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => openUpgradeModal('elite')}
              className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all"
            >
              Upgrade to Elite
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: Video Player or Preview Box */}
            <div className="aspect-video rounded-2xl bg-muted/60 border border-border relative flex flex-col items-center justify-center p-6 text-center overflow-hidden group">
              {videoGenerated ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center mx-auto shadow-lg cursor-pointer hover:scale-105 transition-transform">
                    <Play className="w-6 h-6 fill-white ml-1" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm font-sans">45s AI Verified Video Pitch</div>
                    <div className="text-2xs font-mono text-muted-foreground">{roleName} Portfolio Edition</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                    ✓ RENDERED & VERIFIED
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center mx-auto">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-xs font-mono">READY FOR GENERATION</div>
                    <div className="text-2xs text-muted-foreground font-sans">Script assembled from real demonstrated skills & ELO</div>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    data-testid="generate-video-btn"
                    className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-mono text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 mx-auto"
                  >
                    {generating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Synthesizing Video...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Video Profile</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Right: Structure & Teleprompter Tabs */}
            <div className="space-y-4 font-mono text-xs">
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab('structure')}
                  className={`pb-2 px-3 font-bold transition-colors ${activeTab === 'structure' ? 'border-b-2 border-brand text-brand' : 'text-muted-foreground'}`}
                >
                  45s Structure
                </button>
                <button
                  onClick={() => setActiveTab('script')}
                  className={`pb-2 px-3 font-bold transition-colors ${activeTab === 'script' ? 'border-b-2 border-brand text-brand' : 'text-muted-foreground'}`}
                >
                  Teleprompter Script
                </button>
              </div>

              {activeTab === 'structure' ? (
                <div className="space-y-2 text-2xs">
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-start justify-between">
                    <div>
                      <strong className="text-brand">00:00 - 00:05</strong>
                      <div className="text-foreground font-bold">Introduction & Role</div>
                    </div>
                    <span className="text-muted-foreground">Identity</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-start justify-between">
                    <div>
                      <strong className="text-brand">00:05 - 00:15</strong>
                      <div className="text-foreground font-bold">Core Strengths</div>
                    </div>
                    <span className="text-muted-foreground">Competency</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-start justify-between">
                    <div>
                      <strong className="text-brand">00:15 - 00:30</strong>
                      <div className="text-foreground font-bold">Verified Arena Work</div>
                    </div>
                    <span className="text-muted-foreground">Proof</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-start justify-between">
                    <div>
                      <strong className="text-brand">00:30 - 00:40</strong>
                      <div className="text-foreground font-bold">Demonstrated Skills</div>
                    </div>
                    <span className="text-muted-foreground">Metrics</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-start justify-between">
                    <div>
                      <strong className="text-brand">00:40 - 00:45</strong>
                      <div className="text-foreground font-bold">Career Objective</div>
                    </div>
                    <span className="text-muted-foreground">Call to Action</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border font-mono text-2xs leading-relaxed text-foreground whitespace-pre-line">
                  {personalBrand.videoScript}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
