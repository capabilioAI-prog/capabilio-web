export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { db, missions, roles, careerGoals } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const roleSlug = searchParams.get('roleSlug');
    const difficulty = searchParams.get('difficulty');

    // Build where clause
    const conditions = [eq(missions.status, 'published')];

    if (roleSlug && roleSlug !== 'all') {
      const role = await db.query.roles.findFirst({
        where: eq(roles.slug, roleSlug),
      });
      if (role) conditions.push(eq(missions.roleId, role.id));
    } else if (!roleSlug) {
      // Default strictly to user's active career goal
      const goal = await db.query.careerGoals.findFirst({
        where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
      });

      if (goal?.targetRoleId) {
        conditions.push(eq(missions.roleId, goal.targetRoleId));
      }
    }

    if (difficulty && ['entry', 'mid', 'senior', 'lead'].includes(difficulty)) {
      conditions.push(eq(missions.difficulty, difficulty as 'entry' | 'mid' | 'senior' | 'lead'));
    }

    let allMissions = await db.query.missions.findMany({
      where: and(...conditions),
      with: {
        role: true,
        company: true,
        missionSkills: { with: { skill: true } },
      },
      orderBy: (m, { asc }) => [asc(m.difficulty), asc(m.title)],
    });

    // Fallback if no missions found for this specific role yet
    if (allMissions.length === 0) {
      allMissions = await db.query.missions.findMany({
        where: eq(missions.status, 'published'),
        with: {
          role: true,
          company: true,
          missionSkills: { with: { skill: true } },
        },
        orderBy: (m, { asc }) => [asc(m.difficulty), asc(m.title)],
        limit: 8,
      });
    }

    return ok({ missions: allMissions });
  } catch (error: any) {
    console.error('Get missions error:', error);
    return serverError(error.message);
  }
}
