'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Swords, GraduationCap, Rocket, Rss, Code2, Archive, Settings
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'AURA', sublabel: 'Career Intelligence' },
  { href: '/arena', icon: Swords, label: 'ARENA', sublabel: 'Work Simulation' },
  { href: '/skill-studio', icon: GraduationCap, label: 'SKILL STUDIO', sublabel: 'Learn & Practice' },
  { href: '/launchpad', icon: Rocket, label: 'LAUNCHPAD', sublabel: 'Opportunities' },
  { href: '/pulse', icon: Rss, label: 'PULSE', sublabel: 'Industry Feed' },
  { href: '/code-dna', icon: Code2, label: 'CODE DNA', sublabel: 'Technical Profile' },
  { href: '/vault', icon: Archive, label: 'VAULT', sublabel: 'Documents' },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 border-r border-border bg-background flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">C</span>
          </div>
          <span className="font-semibold tracking-tight text-sm">Capabilio</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label, sublabel }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 transition-colors group',
                isActive
                  ? 'bg-brand/5 border-r-2 border-brand'
                  : 'hover:bg-graphite-50 border-r-2 border-transparent'
              )}
            >
              <Icon className={cn(
                'h-4 w-4 shrink-0',
                isActive ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground'
              )} />
              <div className="min-w-0">
                <div className={cn(
                  'text-xs font-semibold tracking-wide leading-none',
                  isActive ? 'text-brand' : 'text-graphite-700 group-hover:text-foreground'
                )}>{label}</div>
                <div className="text-2xs text-muted-foreground mt-0.5 truncate">{sublabel}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3">
        <Link
          href="/settings"
          className="flex items-center gap-2 px-2 py-2 rounded hover:bg-graphite-50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span className="text-xs">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
