import { TopNavigation } from '@/components/layout/top-navigation';
import { AuthGuard } from '@/components/layout/auth-guard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col font-sans text-foreground selection:bg-brand/20 selection:text-brand">
        <TopNavigation />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
