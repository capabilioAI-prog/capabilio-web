'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, ArrowRight, Compass, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? 'border-b border-border/80 bg-background/95 backdrop-blur-md shadow-xs py-2.5'
          : 'border-b border-transparent bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Brand Identity */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-mono font-bold text-sm shadow-xs group-hover:bg-brand-hover transition-colors">
              C
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-foreground text-base font-sans">
                Capabilio
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold tracking-wider">
                AI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#for-students" className="hover:text-foreground transition-colors">
              For Students
            </a>
            <a href="#for-professionals" className="hover:text-foreground transition-colors">
              For Professionals
            </a>
            <a href="#for-executives" className="hover:text-foreground transition-colors">
              For Executives
            </a>
            <a href="#for-organisations" className="hover:text-foreground transition-colors">
              For Organisations
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/aura"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Go to Career OS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => signOut()}
                className="p-2 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-muted text-xs transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-xl hover:bg-muted transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition-colors"
              >
                <span>Get started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-card/95 backdrop-blur-md px-4 py-5 space-y-4 animate-fade-in shadow-xl">
          <nav className="flex flex-col space-y-3 text-xs font-medium text-foreground">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-brand"
            >
              How it works
            </a>
            <a
              href="#for-students"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-brand"
            >
              For Students
            </a>
            <a
              href="#for-professionals"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-brand"
            >
              For Professionals
            </a>
            <a
              href="#for-colleges"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-brand"
            >
              For Colleges
            </a>
            <a
              href="#for-companies"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-brand"
            >
              For Companies
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-brand"
            >
              Pricing
            </a>
          </nav>

          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {isAuthenticated ? (
              <Link
                href="/aura"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 bg-brand text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5"
              >
                <span>Go to Career OS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 border border-border text-foreground rounded-xl text-xs font-semibold text-center hover:bg-muted"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 bg-brand text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5"
                >
                  <span>Build My Career Proof</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
