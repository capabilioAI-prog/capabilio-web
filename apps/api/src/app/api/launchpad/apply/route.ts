export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { buildApplicationProofPackage } from '@/lib/launchpad/launchpad-engine';
import { getOpportunityById } from '@/lib/launchpad/opportunity-provider';
import { db, jobApplications, notifications } from '@capabilio/db';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const ApplyWithProofSchema = z.object({
  jobId: z.string().min(1),
  company: z.string().min(1),
  roleTitle: z.string().min(1),
  salaryRange: z.string().optional(),
  matchScore: z.number().default(82),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const apps = await db.query.jobApplications.findMany({
      where: eq(jobApplications.userId, user.id as any),
      orderBy: [desc(jobApplications.appliedAt)],
    });

    return ok({ applications: apps });
  } catch (error: any) {
    console.error('Get applications error:', error);
    return serverError(error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = ApplyWithProofSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid application payload', parsed.error.flatten());

    const { jobId, company, roleTitle, salaryRange, matchScore, notes } = parsed.data;

    // Dynamically build authoritative immutable proof package
    const proofPackage = await buildApplicationProofPackage(user.id, jobId);

    const now = new Date();
    const initialTimeline = [
      { status: 'saved', date: now, note: 'Opportunity identified on Launchpad' },
      { status: 'applied', date: now, note: 'Proof Package submitted directly to hiring pipeline' },
    ];

    // Upsert Application
    await db.insert(jobApplications).values({
      userId: user.id as any,
      jobId,
      company,
      roleTitle,
      salaryRange: salaryRange || null,
      status: 'applied',
      matchScore: matchScore || 82,
      proofPackage: proofPackage as any,
      notes: notes || null,
      timeline: initialTimeline as any,
      evidenceAttached: proofPackage.relevantVerifiedWork.map(w => w.verificationHash),
      appliedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [jobApplications.userId, jobApplications.jobId],
      set: {
        status: 'applied',
        matchScore: matchScore || 82,
        proofPackage: proofPackage as any,
        notes: notes || null,
        timeline: initialTimeline as any,
        updatedAt: now,
      }
    });

    // Create Notification
    await db.insert(notifications).values({
      userId: user.id as any,
      type: 'job_applied',
      title: 'Applied with Verified Proof',
      message: `Your verified proof package was successfully delivered to ${company} for the ${roleTitle} role.`,
      link: `/launchpad/applications`,
    });

    return ok({
      success: true,
      jobId,
      status: 'applied',
      matchScore,
      proofPackage,
      appliedAt: now,
    });
  } catch (error: any) {
    console.error('Apply with proof error:', error);
    return serverError(error.message);
  }
}
