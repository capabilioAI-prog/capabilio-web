'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn, getEloTierLabel, getEloTierColor } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useEntitlements } from '@/lib/entitlements-context';
import {
  Compass,
  Radio,
  Sparkles,
  Swords,
  Rocket,
  CheckSquare,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  TrendingUp,
  Award,
  Zap,
  Check,
  Shield,
  ExternalLink,
  Menu,
  X,
  Briefcase
} from 'lucide-react';

export const NAV_PRODUCTS = [
  { href: '/aura', label: 'Aura', sublabel: 'Career Command', icon: Compass },
  { href: '/pulse', label: 'Pulse', sublabel: 'Industry Feed', icon: Radio },
  { href: '/skill-studio', label: 'Skill Studio', sublabel: 'Mission Control', icon: Sparkles },
  { href: '/arena', label: 'Arena', sublabel: 'Work Simulation', icon: Swords },
  { href: '/launchpad', label: 'Launchpad', sublabel: 'Opportunities', icon: Rocket },
  { href: '/tasks', label: 'Tasks', sublabel: 'Company Proof', icon: CheckSquare },
];

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function TopNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, careerGoal, signOut } = useAuth();
  const { plan, openUpgradeModal } = useEntitlements();

  const [eloScore, setEloScore] = useState<number>(400);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update ELO when careerGoal updates
  useEffect(() => {
    if (careerGoal?.careerElo !== undefined) {
      setEloScore(careerGoal.careerElo);
    }
  }, [careerGoal?.careerElo]);

  // Fetch ELO & Notifications
  useEffect(() => {
    if (!user?.id) return;

    api.get<{ records: Array<{ eloScore: number }> }>(`/api/elo/${user.id}`).then(eloRes => {
      if (eloRes.success && eloRes.data.records?.[0]) {
        setEloScore(eloRes.data.records[0].eloScore);
      }
    });

    api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications').then(nRes => {
      if (nRes.success && nRes.data) {
        setNotifications(nRes.data.notifications || []);
        setUnreadCount(nRes.data.unreadCount || 0);
      }
    });
  }, [user?.id, pathname]);

  async function handleMarkAllRead() {
    try {
      await api.post('/api/notifications', {});
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  const tierLabel = getEloTierLabel(eloScore);
  const tierColor = getEloTierColor(eloScore);
  const targetRole = careerGoal?.targetRoleName || 'Data Analyst';
  const displayName = profile?.displayName || user?.displayName || 'Capabilio Candidate';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6">
          <Link href="/aura" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-brand rounded flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <span className="text-white font-bold text-xs tracking-tight">C</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-foreground">Capabilio</span>
                <span className="text-2xs font-semibold uppercase tracking-wider text-brand px-1 py-0.2 bg-brand/10 rounded">AI</span>
              </div>
            </div>
          </Link>

          {/* Product Primary Navigation (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_PRODUCTS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-muted text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-brand' : 'text-muted-foreground')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions: ELO, Role, Notifications, Profile */}
        <div className="flex items-center gap-3">
          
          {/* Active Role & ELO Rating Pill */}
          <Link
            href="/aura"
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted border border-border/80 transition-colors text-xs"
            title="Calibrated Career ELO"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tierColor }} />
              <span className="font-medium text-foreground truncate max-w-[120px]">{targetRole}</span>
            </div>
            <div className="w-px h-3.5 bg-border" />
            <div className="flex items-center gap-1 font-mono font-bold text-foreground">
              <TrendingUp className="h-3 w-3 text-brand" />
              <span>{eloScore}</span>
              <span className="text-[10px] text-muted-foreground font-normal">ELO</span>
            </div>
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand ring-2 ring-background animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-xl py-2 z-50 animate-fade-in">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-2xs px-1.5 py-0.2 rounded-full bg-brand/10 text-brand font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-2xs text-brand hover:underline font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (notif.link) router.push(notif.link);
                          setNotificationsOpen(false);
                        }}
                        className={cn(
                          'p-3 hover:bg-muted/50 cursor-pointer transition-colors text-xs flex gap-3 items-start',
                          !notif.isRead ? 'bg-brand/5' : ''
                        )}
                      >
                        <div className="p-1.5 rounded-lg bg-brand/10 text-brand shrink-0 mt-0.5">
                          {notif.type === 'job_applied' ? <Briefcase className="h-3.5 w-3.5" /> :
                           notif.type === 'mission_evaluated' ? <Award className="h-3.5 w-3.5" /> :
                           <Zap className="h-3.5 w-3.5" />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{notif.title}</span>
                            {!notif.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                            )}
                          </div>
                          <p className="text-2xs text-muted-foreground leading-relaxed">{notif.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-border text-center">
                  <Link
                    href="/aura"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-2xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    View All Career Activity →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-md hover:bg-muted transition-colors text-xs"
            >
              <div className="w-6 h-6 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-medium text-foreground max-w-[100px] truncate">{displayName}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-xl py-1.5 z-50 animate-fade-in text-xs">
                <div className="px-3.5 py-2 border-b border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground truncate">{displayName}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                      plan === 'elite' ? 'bg-purple-500/10 text-purple-600 border border-purple-500/30' :
                      plan === 'pro' ? 'bg-brand/10 text-brand border border-brand/30' :
                      'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {plan.toUpperCase()} PLAN
                    </span>
                  </div>
                  <div className="text-2xs text-muted-foreground truncate">{user?.email}</div>
                  <div className="text-2xs font-mono text-brand font-semibold">{targetRole} • {eloScore} ELO</div>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-muted text-foreground transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/aura"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-muted text-foreground transition-colors"
                  >
                    <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Career Command (Aura)</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-muted text-foreground transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Account & Career Settings</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-border">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-red-500/10 text-red-600 transition-colors text-left"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card px-4 py-3 space-y-2 animate-fade-in">
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-foreground">{targetRole}</span>
            <span className="font-mono font-bold text-brand">{eloScore} ELO</span>
          </div>

          {NAV_PRODUCTS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors',
                  isActive ? 'bg-brand/10 text-brand font-bold' : 'text-foreground hover:bg-muted'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <span className="text-2xs text-muted-foreground">{item.sublabel}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-border">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 rounded-lg hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
