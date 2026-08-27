export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, profiles, careerGoals, roles, eloRecords } from '@capabilio/db';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).optional(),
  headline: z.string().optional(),
  collegeName: z.string().optional(),
  universityName: z.string().optional(),
  department: z.string().optional(),
  stream: z.string().optional(),
  graduationYear: z.string().optional(),
  location: z.string().optional(),
  targetRoleSlug: z.string().optional(),
  currentLevel: z.enum(['student', 'entry', 'mid', 'senior', 'lead']).optional(),
  timeline: z.enum(['immediate', '3_months', '6_months', '1_year', '2_plus_years']).optional(),
  motivation: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid profile update', parsed.error.flatten());

    // Update profile
    const profileUpdates: any = { updatedAt: new Date() };
    if (parsed.data.displayName) profileUpdates.displayName = parsed.data.displayName;
    if (parsed.data.headline !== undefined) profileUpdates.headline = parsed.data.headline;
    if (parsed.data.collegeName !== undefined) profileUpdates.collegeName = parsed.data.collegeName;
    if (parsed.data.universityName !== undefined) profileUpdates.universityName = parsed.data.universityName;
    if (parsed.data.department !== undefined) profileUpdates.department = parsed.data.department;
    if (parsed.data.stream !== undefined) profileUpdates.stream = parsed.data.stream;
    if (parsed.data.graduationYear !== undefined) profileUpdates.graduationYear = parsed.data.graduationYear;
    if (parsed.data.location !== undefined) profileUpdates.location = parsed.data.location;

    await db.update(profiles)
      .set(profileUpdates)
      .where(eq(profiles.userId, user.id as any));

    // Update target role / career goal if provided
    if (parsed.data.targetRoleSlug) {
      const targetRole = await db.query.roles.findFirst({
        where: eq(roles.slug, parsed.data.targetRoleSlug),
      });

      if (targetRole) {
        const goal = await db.query.careerGoals.findFirst({
          where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
          orderBy: [desc(careerGoals.updatedAt), desc(careerGoals.createdAt)],
        });

        if (goal) {
          await db.update(careerGoals)
            .set({
              targetRoleId: targetRole.id,
              currentLevel: (parsed.data.currentLevel || goal.currentLevel) as any,
              timeline: (parsed.data.timeline || goal.timeline) as any,
              motivation: parsed.data.motivation !== undefined ? parsed.data.motivation : goal.motivation,
              updatedAt: new Date(),
            })
            .where(eq(careerGoals.id, goal.id));
        } else {
          await db.insert(careerGoals).values({
            userId: user.id as any,
            targetRoleId: targetRole.id,
            currentLevel: (parsed.data.currentLevel || 'student') as any,
            timeline: (parsed.data.timeline || 'immediate') as any,
            motivation: parsed.data.motivation || null,
            isActive: true,
          });
        }

        // Initialize ELO record for role if none exists
        const existingElo = await db.query.eloRecords.findFirst({
          where: and(eq(eloRecords.userId, user.id as any), eq(eloRecords.roleId, targetRole.id)),
        });
        if (!existingElo) {
          await db.insert(eloRecords).values({
            userId: user.id as any,
            roleId: targetRole.id,
            eloScore: 400,
            totalMissions: 0,
            passedMissions: 0,
          }).onConflictDoNothing();
        }
      }
    }

    return ok({ updated: true });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return serverError(error.message);
  }
}
