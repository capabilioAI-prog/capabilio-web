'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Save, 
  Star, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Palette, 
  Sliders, 
  HelpCircle,
  FileText
} from 'lucide-react';
import { LivingPortfolioPayload, PortfolioTheme } from '@capabilio/types';
import { useEntitlements } from '@/lib/entitlements-context';

export default function PortfolioEditPage() {
  const router = useRouter();
  const { openUpgradeModal } = useEntitlements();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<LivingPortfolioPayload | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [theme, setTheme] = useState<PortfolioTheme>('editorial');
  const [isPublic, setIsPublic] = useState(true);
  const [ctaText, setCtaText] = useState('Contact Candidate');
  const [ctaUrl, setCtaUrl] = useState('');
  const [enablePersonalBrand, setEnablePersonalBrand] = useState(true);
  const [enableVideo, setEnableVideo] = useState(true);
  const [featuredItemIds, setFeaturedItemIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('http://localhost:3001/api/portfolio', { credentials: 'include' });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const d: LivingPortfolioPayload = json.data;
          setData(d);
          setHeadline(d.settings.headline || d.personalBrand.headline || '');
          setAbout(d.settings.about || d.summary.aiGeneratedSummary || '');
          setTheme(d.settings.theme || 'editorial');
          setIsPublic(d.settings.isPublic ?? true);
          setCtaText(d.settings.ctaText || 'Contact Candidate');
          setCtaUrl(d.settings.ctaUrl || '');
          setEnablePersonalBrand(d.settings.enablePersonalBrand ?? true);
          setEnableVideo(d.settings.enableVideo ?? true);
          setFeaturedItemIds(d.featuredItems.map(i => i.id));
        }
      } catch (err) {
        console.error('Error loading portfolio for edit:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggleFeatured = (id: string) => {
    if (featuredItemIds.includes(id)) {
      setFeaturedItemIds(featuredItemIds.filter(fId => fId !== id));
    } else {
      setFeaturedItemIds([...featuredItemIds, id]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);

    try {
      const res = await fetch('http://localhost:3001/api/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          headline,
          about,
          theme,
          isPublic,
          ctaText,
          ctaUrl: ctaUrl || null,
          enablePersonalBrand,
          enableVideo,
          featuredItems: featuredItemIds.map((id, idx) => ({ id, type: 'item', order: idx + 1 })),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMessage('Portfolio settings saved and published successfully!');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error saving portfolio settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 font-mono text-xs text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <div>Loading Portfolio Editor...</div>
      </div>
    );
  }

  const isElite = data.personalBrand.isEliteEntitled;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-24">
      {/* Header Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/portfolio"
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold font-sans text-foreground">Edit Living Portfolio</h1>
              <p className="text-xs text-muted-foreground font-mono">Custom presentation, headline, and featured work</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/p/${data.user.username}`}
              target="_blank"
              className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-mono text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Preview</span>
            </Link>

            <button
              onClick={handleSave}
              disabled={saving}
              data-testid="save-portfolio-settings-btn"
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-mono text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save & Publish'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Edit Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Immutable Proof Alert Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3 font-mono text-xs text-foreground">
          <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-amber-600">IMMUTABLE CAPABILITY EVIDENCE</div>
            <p className="text-2xs text-muted-foreground font-sans">
              Arena simulation scores, ELO deltas, AI technical interview evaluations, and cryptographic hashes cannot be edited or modified. You can curate presentation, order, and public visibility.
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 font-mono text-xs text-emerald-600 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: Headline & About */}
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Sliders className="w-4 h-4 text-brand" />
              <h3 className="font-bold text-base font-sans text-foreground">
                Professional Positioning
              </h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-bold uppercase">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  data-testid="portfolio-headline-input"
                  placeholder="e.g. DATA ANALYST | SQL | BUSINESS ANALYTICS | DATA MODELING"
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-foreground font-sans focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-bold uppercase">
                  About / Career Narrative
                </label>
                <textarea
                  rows={4}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  data-testid="portfolio-about-input"
                  placeholder="Describe your capabilities, verified background, and focus areas..."
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-foreground font-sans focus:outline-none focus:border-brand leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Portfolio Theme Selection */}
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-base font-sans text-foreground">
                  Portfolio Visual Theme
                </h3>
              </div>
              <span className="text-2xs font-mono text-muted-foreground">
                Presentation only • Evidence remains identical
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
              {/* Editorial */}
              <div
                onClick={() => setTheme('editorial')}
                data-testid="theme-editorial-option"
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  theme === 'editorial' ? 'border-brand ring-2 ring-brand/20 bg-muted/40' : 'border-border bg-card hover:border-brand/30'
                }`}
              >
                <div className="font-bold text-foreground font-sans">Editorial (Default)</div>
                <p className="text-2xs text-muted-foreground font-sans">
                  Serif typography accents, crisp graphite structure, and high-contrast proof cards.
                </p>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600">
                  ALL PLANS
                </span>
              </div>

              {/* Technical */}
              <div
                onClick={() => setTheme('technical')}
                data-testid="theme-technical-option"
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  theme === 'technical' ? 'border-brand ring-2 ring-brand/20 bg-muted/40' : 'border-border bg-card hover:border-brand/30'
                }`}
              >
                <div className="font-bold text-foreground font-sans">Technical</div>
                <p className="text-2xs text-muted-foreground font-sans">
                  Terminal aesthetics, monospace highlights, and deep query execution panels.
                </p>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600">
                  ALL PLANS
                </span>
              </div>

              {/* Minimal */}
              <div
                onClick={() => setTheme('minimal')}
                data-testid="theme-minimal-option"
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  theme === 'minimal' ? 'border-brand ring-2 ring-brand/20 bg-muted/40' : 'border-border bg-card hover:border-brand/30'
                }`}
              >
                <div className="font-bold text-foreground font-sans">Minimal</div>
                <p className="text-2xs text-muted-foreground font-sans">
                  Ultra-clean layout with refined spacing and muted telemetry grids.
                </p>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600">
                  PRO / ELITE
                </span>
              </div>

              {/* Executive */}
              <div
                onClick={() => setTheme('executive')}
                data-testid="theme-executive-option"
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  theme === 'executive' ? 'border-brand ring-2 ring-brand/20 bg-muted/40' : 'border-border bg-card hover:border-brand/30'
                }`}
              >
                <div className="font-bold text-foreground font-sans">Executive</div>
                <p className="text-2xs text-muted-foreground font-sans">
                  Boardroom aesthetic, gold telemetry highlights, and leadership metrics.
                </p>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600">
                  ELITE ONLY
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Select Featured Evidence */}
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-base font-sans text-foreground">
                  Select Featured Proof ({featuredItemIds.length} Selected)
                </h3>
              </div>
              <span className="text-2xs font-mono text-muted-foreground">
                Featured work displays prominently in top hero row
              </span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              {data.allItems.map((item) => {
                const isSelected = featuredItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleFeatured(item.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected ? 'border-brand ring-1 ring-brand/20 bg-muted/40' : 'border-border bg-card hover:border-brand/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-muted text-foreground">
                          {item.type.toUpperCase().replace(/_/g, ' ')}
                        </span>
                        <div className="font-bold text-foreground font-sans text-sm">{item.title}</div>
                      </div>
                      <div className="text-2xs text-muted-foreground font-sans">
                        Score: {item.score}/100 • {item.eloChange > 0 ? `+${item.eloChange}` : item.eloChange} ELO • {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-xl text-2xs font-bold transition-all ${
                        isSelected ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isSelected ? 'FEATURED ★' : '+ FEATURE'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Public Visibility & Call to Action */}
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Eye className="w-4 h-4 text-brand" />
              <h3 className="font-bold text-base font-sans text-foreground">
                Visibility & Candidate CTA
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs">
              <div className="space-y-2">
                <label className="text-muted-foreground font-bold uppercase">
                  Profile Call-to-Action Text
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="e.g. Schedule Recruiter Screen"
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-foreground font-sans focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground font-bold uppercase">
                  CTA External Link (Optional)
                </label>
                <input
                  type="text"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="e.g. https://cal.com/username or mailto:user@email.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-foreground font-sans focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border font-mono text-xs">
              <div>
                <div className="font-bold text-foreground font-sans">Public Portfolio Visibility</div>
                <p className="text-2xs text-muted-foreground font-sans">
                  Allow recruiters and hiring managers to view your verified public proof at <strong className="text-brand">/p/{data.user.username}</strong>
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  data-testid="toggle-public-visibility"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 font-mono text-xs">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-brand hover:bg-brand-hover text-white font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save & Publish Portfolio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
