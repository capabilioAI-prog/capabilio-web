'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Code2, BarChart3, Brain, Lightbulb, Shield, TrendingUp } from 'lucide-react';

const TIMELINE_OPTIONS = [
  { value: 'immediate', label: 'Immediately' },
  { value: '3_months', label: 'Within 3 months' },
  { value: '6_months', label: 'Within 6 months' },
  { value: '1_year', label: 'Within a year' },
  { value: '2_plus_years', label: '2+ years' },
];

const LEVEL_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'entry', label: 'Entry level' },
  { value: 'mid', label: 'Mid level' },
  { value: 'senior', label: 'Senior level' },
  { value: 'lead', label: 'Lead / Manager' },
];

const DISCIPLINE_ICONS: Record<string, React.ReactNode> = {
  software_engineering: <Code2 className="h-5 w-5" />,
  data_science: <BarChart3 className="h-5 w-5" />,
  machine_learning: <Brain className="h-5 w-5" />,
  product_management: <Lightbulb className="h-5 w-5" />,
  cybersecurity: <Shield className="h-5 w-5" />,
  mba: <TrendingUp className="h-5 w-5" />,
};

type Role = { id: string; name: string; slug: string; discipline: { slug: string; name: string }; level: string };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [timeline, setTimeline] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [motivation, setMotivation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ roles: Role[] }>('/api/roles').then(res => {
      if (res.success) setRoles(res.data.roles);
    });
  }, []);

  async function handleComplete() {
    if (!selectedRole || !timeline || !currentLevel) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/profile/career-goal', {
        targetRoleId: selectedRole.id,
        timeline,
        currentLevel,
        motivation: motivation || undefined,
      });
      if (res.success) {
        router.push('/dashboard');
      } else {
        setError('Failed to save. Please try again.');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const groupedRoles = roles.reduce((acc, role) => {
    const discipline = role.discipline.slug;
    if (!acc[discipline]) acc[discipline] = { name: role.discipline.name, roles: [] };
    acc[discipline]!.roles.push(role);
    return acc;
  }, {} as Record<string, { name: string; roles: Role[] }>);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">C</span>
          </div>
          <span className="font-semibold tracking-tight">Capabilio</span>
        </div>
        <div className="flex items-center gap-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step > s ? 'bg-brand text-white' : step === s ? 'bg-brand text-white' : 'bg-graphite-100 text-muted-foreground'
              }`}>{step > s ? '✓' : s}</div>
              <span className={`text-xs hidden sm:block ${
                step === s ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>{['Choose Role', 'Your Level', 'Your Goal'][s - 1]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-semibold mb-2">What role do you want to master?</h1>
            <p className="text-muted-foreground text-sm mb-8">Choose the career path you&apos;re building toward. This sets up your skill graph and missions.</p>
            
            {Object.entries(groupedRoles).map(([slug, { name, roles: disciplineRoles }]) => (
              <div key={slug} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-muted-foreground">{DISCIPLINE_ICONS[slug]}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{name}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {disciplineRoles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      className={`text-left px-4 py-3 border rounded-md text-sm font-medium transition-colors ${
                        selectedRole?.id === role.id
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-border hover:border-graphite-400 text-foreground'
                      }`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {roles.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">Loading roles...</div>
            )}

            <div className="mt-8">
              <button
                onClick={() => setStep(2)}
                disabled={!selectedRole}
                className="h-9 px-6 bg-brand text-white text-sm font-medium rounded-md hover:bg-brand-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-semibold mb-2">What&apos;s your current experience level?</h1>
            <p className="text-muted-foreground text-sm mb-8">This helps calibrate mission difficulty and ELO starting point.</p>
            <div className="flex flex-col gap-2 max-w-sm">
              {LEVEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCurrentLevel(opt.value)}
                  className={`text-left px-4 py-3 border rounded-md text-sm font-medium transition-colors ${
                    currentLevel === opt.value
                      ? 'border-brand bg-brand/5 text-brand'
                      : 'border-border hover:border-graphite-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(1)} className="h-9 px-4 text-sm border border-border rounded-md hover:bg-graphite-50">Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={!currentLevel}
                className="h-9 px-6 bg-brand text-white text-sm font-medium rounded-md hover:bg-brand-hover disabled:opacity-40"
              >Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-2xl font-semibold mb-2">When do you want to be job-ready?</h1>
            <p className="text-muted-foreground text-sm mb-8">Set your career timeline. Capabilio will build evidence of your capability along the way.</p>
            
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Timeline</p>
              <div className="flex flex-col gap-2 max-w-sm">
                {TIMELINE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTimeline(opt.value)}
                    className={`text-left px-4 py-3 border rounded-md text-sm font-medium transition-colors ${
                      timeline === opt.value
                        ? 'border-brand bg-brand/5 text-brand'
                        : 'border-border hover:border-graphite-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 max-w-sm">
              <label className="text-sm font-medium block mb-2">What&apos;s your motivation? <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                value={motivation}
                onChange={e => setMotivation(e.target.value)}
                placeholder="I want to land my first SWE job at a startup..."
                rows={3}
                className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="h-9 px-4 text-sm border border-border rounded-md hover:bg-graphite-50">Back</button>
              <button
                onClick={handleComplete}
                disabled={!timeline || loading}
                className="h-9 px-6 bg-brand text-white text-sm font-medium rounded-md hover:bg-brand-hover disabled:opacity-40 flex items-center gap-2"
              >
                {loading ? 'Setting up your Career OS...' : 'Launch my Career OS →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
