'use client';

import React, { useEffect, useState } from 'react';
import { 
  Award, 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  Plus, 
  Sparkles,
  QrCode,
  Share2
} from 'lucide-react';

interface AuraVoucherTabProps {
  overviewData: any;
}

export function AuraVoucherTab({ overviewData }: AuraVoucherTabProps) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeRole = overviewData?.activeRole || { name: 'Software Engineer' };
  const elo = overviewData?.elo || { current: 1000 };

  useEffect(() => {
    fetchVouchers();
  }, []);

  async function fetchVouchers() {
    try {
      const res = await fetch('http://localhost:3001/api/aura/vouchers', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setVouchers(data.data.vouchers || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleGenerateVoucher() {
    setIsGenerating(true);
    try {
      const res = await fetch('http://localhost:3001/api/aura/vouchers', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data.voucher) {
        setVouchers([data.data.voucher, ...vouchers]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopy(verificationId: string) {
    navigator.clipboard.writeText(`https://capabilio.ai/verify/${verificationId}`);
    setCopiedId(verificationId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand">
              Verified Proof Records
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              Capabilio Verified Capability Vouchers
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Cryptographically signed capability credentials shareable with recruiters and companies. Backed by deterministic execution logs.
            </p>
          </div>

          <button
            onClick={handleGenerateVoucher}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Signing Credential...' : 'Issue Verified Voucher'}</span>
          </button>
        </div>
      </div>

      {/* Vouchers Grid */}
      {vouchers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vouchers.map(v => (
            <div
              key={v.id}
              className="p-6 sm:p-7 rounded-2xl border-2 border-brand/40 bg-gradient-to-br from-card via-card to-brand/5 shadow-xl space-y-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center font-bold font-mono text-xs shadow-xs">
                    C
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground uppercase tracking-wider font-mono">
                      Capabilio Verified
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Issuer: {v.issuer}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                  ELO {v.eloScore}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {v.title}
                </h3>
                <div className="text-xs text-muted-foreground mt-1">
                  Issued: {new Date(v.issuedAt).toLocaleDateString()} • {v.evidenceCount} Verified Submissions
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Verified Competencies:</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(v.skillsVerified || []).map((sk: string) => (
                    <span key={sk} className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-muted-foreground">
                  ID: <strong className="text-foreground">{v.verificationId}</strong>
                </span>
                <button
                  onClick={() => handleCopy(v.verificationId)}
                  className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedId === v.verificationId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === v.verificationId ? 'Copied' : 'Share URL'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl border border-border bg-card space-y-3">
          <Award className="w-8 h-8 text-muted-foreground mx-auto" />
          <div className="font-bold text-sm text-foreground">No Vouchers Generated Yet</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click &ldquo;Issue Verified Voucher&rdquo; above to generate your first cryptographic capability credential.
          </p>
        </div>
      )}
    </div>
  );
}
