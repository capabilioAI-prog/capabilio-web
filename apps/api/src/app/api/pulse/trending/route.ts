export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, serverError } from '@/lib/auth';
import { db, pulseTopics, careerGoals, roles } from '@capabilio/db';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    // Get user active role
    let userDomain = 'software_engineering';
    let userRole = 'Software Engineer';

    if (user?.id) {
      const goal = await db.query.careerGoals.findFirst({
        where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
      });
      if (goal) {
        const role = await db.query.roles.findFirst({
          where: eq(roles.id, goal.targetRoleId),
          with: { discipline: true },
        });
        if (role) {
          userRole = role.name;
          userDomain = role.discipline?.slug || 'software_engineering';
        }
      }
    }

    const topics = await db.query.pulseTopics.findMany({
      orderBy: [desc(pulseTopics.trendingScore)],
      limit: 10,
    });

    const DOMAIN_INTELLIGENCE: Record<string, {
      momentum: string;
      hiringRate: string;
      topSkills: string[];
      whatsChanging: string[];
      companiesToWatch: Array<{ name: string; hiringRole: string; logoBg: string }>;
      suggestedPeople: Array<{ name: string; headline: string; role: string }>;
    }> = {
      'software_engineering': {
        momentum: 'High (+18%)',
        hiringRate: '↑ 14% this month',
        topSkills: ['TypeScript 5.4', 'Next.js 14 App Router', 'Deterministic Testing', 'API Architecture'],
        whatsChanging: [
          'Shift from algorithmic LeetCode toward deterministic work simulations',
          'Growing demand for token-bucket rate limiting in multi-region microservices',
          'Strict TypeScript 5.4 generic constraint enforcement in enterprise backends'
        ],
        companiesToWatch: [
          { name: 'Stripe', hiringRole: 'Staff Systems Engineer', logoBg: 'bg-indigo-500' },
          { name: 'TechFlow Core', hiringRole: 'Full Stack Engineer', logoBg: 'bg-brand' },
          { name: 'Vercel Ecosystem', hiringRole: 'Frontend Platform Lead', logoBg: 'bg-black' }
        ],
        suggestedPeople: [
          { name: 'David K.', headline: 'Staff Software Engineer @ Stripe', role: 'Software Engineer' },
          { name: 'Elena Rostova', headline: 'Tech Lead @ CloudScale Systems', role: 'Full Stack Developer' },
          { name: 'Marcus Vance', headline: 'Backend Architect @ Vercel', role: 'Backend Developer' }
        ]
      },
      'machine_learning': {
        momentum: 'Surging (+42%)',
        hiringRate: '↑ 28% this month',
        topSkills: ['PyTorch', 'LoRA Fine-Tuning', 'MLOps / Tracing', 'RAG Vector Indexing'],
        whatsChanging: [
          'Adoption of parameter-efficient fine-tuning (LoRA / QLoRA) over full retraining',
          'Transition from pure notebook experimentation to production FastAPI inference endpoints',
          'Precision-recall threshold tuning for imbalanced classification'
        ],
        companiesToWatch: [
          { name: 'Aether Telemetry', hiringRole: 'Lead AI Engineer', logoBg: 'bg-emerald-500' },
          { name: 'Anthropic Labs', hiringRole: 'Alignment Researcher', logoBg: 'bg-orange-600' },
          { name: 'Scale AI Platform', hiringRole: 'MLOps Architect', logoBg: 'bg-blue-600' }
        ],
        suggestedPeople: [
          { name: 'Dr. Aris Thorne', headline: 'AI Research Director @ DeepMind Alum', role: 'ML / AI Engineer' },
          { name: 'Elena Rostova', headline: 'Lead AI Engineer @ Aether Cloud', role: 'ML / AI Engineer' }
        ]
      },
      'cybersecurity': {
        momentum: 'High (+24%)',
        hiringRate: '↑ 19% this month',
        topSkills: ['SIEM Triage', 'IOC Correlation', 'Zero Trust IAM', 'Credential Stuffing Defense'],
        whatsChanging: [
          'Automated IP proxy CIDR mitigation in SSO gateways',
          'Zero Trust passwordless authentication standards',
          'Real-time IOC correlation across distributed auth logs'
        ],
        companiesToWatch: [
          { name: 'Sentinel Defense', hiringRole: 'SOC Lead Analyst', logoBg: 'bg-red-600' },
          { name: 'CrowdStrike', hiringRole: 'Incident Responder', logoBg: 'bg-red-500' }
        ],
        suggestedPeople: [
          { name: 'Vikram Mehta', headline: 'SOC Lead & Threat Hunter @ Sentinel', role: 'Cybersecurity Analyst' }
        ]
      }
    };

    const currentIntel = DOMAIN_INTELLIGENCE[userDomain] || DOMAIN_INTELLIGENCE['software_engineering'];

    return ok({
      topics,
      userDomain,
      userRole,
      intelligence: currentIntel,
    });
  } catch (error: any) {
    console.error('Pulse trending error:', error);
    return serverError(error.message);
  }
}
