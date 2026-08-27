export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError, badRequest } from '@/lib/auth';
import { db } from '@capabilio/db';
import { careerGoals, profiles, roles } from '@capabilio/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const CareerGoalSchema = z.object({
  targetRoleId: z.string().uuid(),
  timeline: z.enum(['immediate', '3_months', '6_months', '1_year', '2_plus_years']),
  currentLevel: z.enum(['student', 'entry', 'mid', 'senior', 'lead']),
  motivation: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = CareerGoalSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid career goal data', parsed.error.flatten());

    // Verify role exists
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, parsed.data.targetRoleId),
    });
    if (!role) return badRequest('Role not found');

    // Deactivate previous goals
    await db.update(careerGoals)
      .set({ isActive: false })
      .where(eq(careerGoals.userId, user.id));

    // Create new goal
    const [goal] = await db.insert(careerGoals).values({
      userId: user.id,
      ...parsed.data,
      isActive: true,
    }).returning();

    // Mark onboarding complete
    await db.update(profiles)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(profiles.userId, user.id));

    return ok({ careerGoal: goal, role });
  } catch (error) {
    console.error('Career goal error:', error);
    return serverError();
  }
}
