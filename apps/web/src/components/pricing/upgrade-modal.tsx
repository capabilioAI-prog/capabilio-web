'use client';

import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Swords, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Video, 
  Brain, 
  BarChart3, 
  Compass, 
  Zap 
} from 'lucide-react';
import { useEntitlements } from '@/lib/entitlements-context';
import { STUDENT_PLANS } from '@capabilio/types';

interface UpgradeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  featureId?: string | null;
}

export function UpgradeModal({ isOpen, onClose, featureId }: UpgradeModalProps) {
  const { 
    upgradeModalOpen, 
    activeFeatureModal, 
    closeUpgradeModal, 
    upgradePlan, 
    purchaseAddon, 
    plan 
  } = useEntitlements();
  
  const [upgrading, setUpgrading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const show = isOpen !== undefined ? isOpen : upgradeModalOpen;
  const activeFeature = featureId !== undefined ? featureId : activeFeatureModal;
  const handleClose = onClose || closeUpgradeModal;

  if (!show) return null;

  async function handleUpgrade(targetPlan: 'pro' | 'elite') {
    setUpgrading(true);
    setSuccessMessage(null);
    const result = await upgradePlan(targetPlan, 'monthly');
    setUpgrading(false);
    if (result.success) {
      setSuccessMessage(`Plan successfully upgraded to ${targetPlan.toUpperCase()}! Your new capacity is active.`);
      setTimeout(() => {
        setSuccessMessage(null);
        handleClose();
      }, 1800);
    }
  }

  async function handleAddon(addonType: string) {
    setUpgrading(true);
    setSuccessMessage(null);
    const result = await purchaseAddon(addonType);
    setUpgrading(false);
    if (result.success) {
      setSuccessMessage('Add-on unlocked successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        handleClose();
      }, 1800);
    }
  }

  // Feature content definitions
  const featureConfigs: Record<string, {
    title: string;
    tagline: string;
    icon: any;
    bullets: string[];
    availableIn: string;
    isPersonalBranding?: boolean;
  }> = {
    arena_limit: {
      title: "DAILY ARENA WORKSTATION LIMIT REACHED",
      tagline: plan === 'free' ? "Free plan includes 1 Arena task/day (Resets at 12:00 AM IST)." : "Daily workstation capacity threshold met.",
      icon: Swords,
      bullets: [
        "Pro unlocks 3 real-world Arena workstations per day",
        "Elite unlocks 6 real-world Arena workstations per day",
        "Deterministic test execution & immediate AI Mentor feedback",
        "Continuous Career ELO progression & portfolio evidence minting"
      ],
      availableIn: "PRO (3/day) • ELITE (6/day)",
    },
    ai_interview: {
      title: "AI TECHNICAL INTERVIEW SESSIONS",
      tagline: "One session is an interview attempt of up to 20 minutes, including rubric feedback.",
      icon: Brain,
      bullets: [
        "Pro includes 3 AI interview sessions per month",
        "Elite includes 5 AI interview sessions per month",
        "Domain-specific technical questioning tailored to your role track",
        "In-depth behavioral, algorithmic, and architectural evaluation"
      ],
      availableIn: "PRO (3/mo) • ELITE (5/mo)",
    },
    skill_report: {
      title: "MONTHLY SKILL INTELLIGENCE REPORT",
      tagline: "Understand your strengths, skill gaps, ELO progression, and next best actions.",
      icon: BarChart3,
      bullets: [
        "Pro includes 1 detailed diagnostic report per month",
        "Elite includes 2 diagnostic reports per month",
        "Built directly from your Arena submissions and assessment data",
        "Personalized skill gap reduction roadmap"
      ],
      availableIn: "PRO (1/mo) • ELITE (2/mo)",
    },
    personal_branding_video: {
      title: "PERSONAL BRANDING VIDEO",
      tagline: "Turn your demonstrated work and code into a professional 45-second career story.",
      icon: Video,
      bullets: [
        "Included in Elite plan at no extra charge",
        "Showcase your top verified deliverables and ELO trajectory",
        "Direct recruiter elevator pitch script & portfolio embed",
        "Available as a one-time purchase (₹129) for Pro and Free users"
      ],
      availableIn: "ELITE (Included) • Or Buy Once (₹129)",
      isPersonalBranding: true,
    },
    market_report: {
      title: "ROLE MARKET ANALYSIS INTELLIGENCE",
      tagline: "Role-specific hiring trends, language demands, and emerging industry signals.",
      icon: Compass,
      bullets: [
        "Pro includes 1 monthly market report",
        "Elite includes 2 monthly market reports",
        "Tailored to your chosen career track (Software, Data, SecOps, DevOps, etc.)",
        "Identify high-demand frameworks and enterprise salary shifts"
      ],
      availableIn: "PRO (1/mo) • ELITE (2/mo)",
    },
    internship_readiness: {
      title: "INTERNSHIP READINESS & APPLICATION TRACKER",
      tagline: "Benchmark your proven capability against active corporate hiring thresholds.",
      icon: Zap,
      bullets: [
        "Available in Pro and Elite plans",
        "Live hiring readiness score calculated from verified Arena evidence",
        "Track job & internship application statuses and evidence submissions",
        "Priority recruiter matching in Launchpad"
      ],
      availableIn: "PRO • ELITE",
    }
  };

    const DEFAULT_FEATURE = {
    title: "DAILY ARENA WORKSTATION LIMIT REACHED",
    tagline: plan === 'free' ? "Free plan includes 1 Arena task/day (Resets at 12:00 AM IST)." : "Daily workstation capacity threshold met.",
    icon: Swords,
    bullets: [
      "Pro unlocks 3 real-world Arena workstations per day",
      "Elite unlocks 6 real-world Arena workstations per day",
      "Deterministic test execution & immediate AI Mentor feedback",
      "Continuous Career ELO progression & portfolio evidence minting"
    ],
    availableIn: "PRO (3/day) • ELITE (6/day)",
    isPersonalBranding: false,
  };

  const currentConfig = (activeFeature ? featureConfigs[activeFeature] : undefined) ?? DEFAULT_FEATURE;
  const FeatureIcon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl border-2 border-border bg-card shadow-2xl p-6 sm:p-8 space-y-6 text-left">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-mono text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand/10 text-brand">
              <FeatureIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand">
              CAPABILIO ENTITLEMENT UPGRADE
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            {currentConfig.title}
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
            {currentConfig.tagline}
          </p>
        </div>

        {/* Bullet Points */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2.5">
          <div className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
            Included in {currentConfig.availableIn}:
          </div>
          <ul className="space-y-2 font-mono text-xs text-foreground">
            {currentConfig.bullets.map((b, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Upgrade Action Buttons */}
        <div className="space-y-3 pt-2">
          {currentConfig.isPersonalBranding ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={upgrading}
                onClick={() => handleUpgrade('elite')}
                className="w-full py-3 px-4 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
              >
                <span>Upgrade to Elite (₹499/mo)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                disabled={upgrading}
                onClick={() => handleAddon('personal_branding_video')}
                className="w-full py-3 px-4 rounded-xl border border-brand text-brand hover:bg-brand/10 font-bold text-xs font-mono transition-colors flex items-center justify-center gap-2"
              >
                <span>Buy Once — ₹129</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={upgrading || plan === 'pro'}
                onClick={() => handleUpgrade('pro')}
                className="w-full py-3 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20 hover:scale-[1.02]"
              >
                <span>Upgrade to Pro (₹299/mo)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                disabled={upgrading || plan === 'elite'}
                onClick={() => handleUpgrade('elite')}
                className="w-full py-3 px-4 rounded-xl border-2 border-border hover:border-brand/60 bg-card hover:bg-muted text-foreground font-bold text-xs font-mono transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                <span>Go Elite (₹499/mo)</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
            <span>Development Billing Engine • Instant Activation</span>
            <button
              onClick={handleClose}
              className="hover:text-foreground underline"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
