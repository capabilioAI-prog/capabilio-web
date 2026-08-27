export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-graphite-950 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Capabilio</span>
          </div>
        </div>
        <div>
          <blockquote className="text-graphite-300 text-2xl font-light leading-relaxed max-w-md">
            &ldquo;I didn&apos;t just learn this skill.
            <br />
            <span className="text-white font-medium">I actually performed the work.</span>&rdquo;
          </blockquote>
          <div className="mt-8 flex flex-col gap-3">
            {['AURA', 'ARENA', 'SKILL STUDIO', 'LAUNCHPAD', 'CODE DNA', 'VAULT'].map((product) => (
              <div key={product} className="flex items-center gap-3">
                <div className="w-1 h-1 bg-brand rounded-full" />
                <span className="text-graphite-400 text-xs font-medium tracking-widest uppercase">{product}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-graphite-600 text-xs">Capabilio Ventures Private Limited</p>
        </div>
      </div>
      {/* Right panel - auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  );
}
