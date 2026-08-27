export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, notFound, unauthorized, serverError } from '@/lib/auth';
import { 
  getCandidateAuthoritativeState, 
  computeOpportunityMatch, 
  buildApplicationProofPackage 
} from '@/lib/launchpad/launchpad-engine';
import { getOpportunityById } from '@/lib/launchpad/opportunity-provider';
import { db, savedJobs, jobApplications } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const opportunityId = params.id;
    const opp = await getOpportunityById(opportunityId);
    if (!opp) return notFound('Opportunity');

    const candidateState = await getCandidateAuthoritativeState(user.id);
    const matchAnalysis = computeOpportunityMatch(candidateState, opp);
    const proofPackage = await buildApplicationProofPackage(user.id, opportunityId);

    const isSaved = !!(await db.query.savedJobs.findFirst({
      where: and(eq(savedJobs.userId, user.id as any), eq(savedJobs.jobId, opportunityId)),
    }));

    const application = await db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.userId, user.id as any), eq(jobApplications.jobId, opportunityId)),
    });

    return ok({
      opportunity: opp,
      match: matchAnalysis,
      proofPackage,
      isSaved,
      hasApplied: !!application,
      applicationStatus: application?.status || null,
    });
  } catch (error: any) {
    console.error('Opportunity detail GET error:', error);
    return serverError(error.message);
  }
}
