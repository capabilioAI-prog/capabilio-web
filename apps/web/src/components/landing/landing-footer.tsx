'use client';

import React from 'react';
import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card/60 text-muted-foreground text-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-left">
          
          {/* Col 1: Brand */}
          <div className="space-y-3 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-brand text-white font-mono font-bold flex items-center justify-center text-xs">
                C
              </div>
              <span className="font-bold text-foreground text-sm">Capabilio AI</span>
            </div>
            <p className="text-2xs text-muted-foreground leading-relaxed">
              Empowering Engineers and Elevating Careers through deterministic work simulation.
            </p>
            <div className="text-2xs font-mono text-muted-foreground">
              Capabilio Ventures Private Limited
            </div>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <div className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">Product</div>
            <ul className="space-y-2 text-2xs">
              <li><Link href="/aura" className="hover:text-foreground transition-colors">Aura (Career OS)</Link></li>
              <li><Link href="/pulse" className="hover:text-foreground transition-colors">Pulse (Newsfeed)</Link></li>
              <li><Link href="/skill-studio" className="hover:text-foreground transition-colors">Skill Studio</Link></li>
              <li><Link href="/arena" className="hover:text-foreground transition-colors">Arena (Workstations)</Link></li>
              <li><Link href="/launchpad" className="hover:text-foreground transition-colors">Launchpad (Jobs)</Link></li>
              <li><Link href="/tasks" className="hover:text-foreground transition-colors">Company Tasks</Link></li>
            </ul>
          </div>

          {/* Col 3: Company */}
          <div className="space-y-3">
            <div className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">Company</div>
            <ul className="space-y-2 text-2xs">
              <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
              <li><a href="#for-students" className="hover:text-foreground transition-colors">For Students</a></li>
              <li><a href="#for-executives" className="hover:text-foreground transition-colors">For Executives</a></li>
              <li><a href="#for-organisations" className="hover:text-foreground transition-colors">For Organisations</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Col 4: Legal */}
          <div className="space-y-3">
            <div className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">Legal & Trust</div>
            <ul className="space-y-2 text-2xs">
              <li><Link href="/settings" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/settings" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/settings" className="hover:text-foreground transition-colors">Cryptographic Verification</Link></li>
              <li><a href="mailto:support@capabilio.ai" className="hover:text-foreground transition-colors">Contact Support</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-2xs font-mono text-muted-foreground">
          <div>© {new Date().getFullYear()} Capabilio Ventures Private Limited. All rights reserved.</div>
          <div>Capabilio AI · Career Operating System</div>
        </div>

      </div>
    </footer>
  );
}
