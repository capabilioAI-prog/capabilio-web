import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Capabilio AI · Career Operating System', template: '%s | Capabilio AI' },
  description: 'AI-powered Career Operating System. Build measurable skills through real-world professional work simulation.',
};

import { AuthProvider } from '@/lib/auth-context';
import { EntitlementsProvider } from '@/lib/entitlements-context';
import { UpgradeModal } from '@/components/pricing/upgrade-modal';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-brand/20 selection:text-brand">
        <AuthProvider>
          <EntitlementsProvider>
            {children}
            <UpgradeModal />
          </EntitlementsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
