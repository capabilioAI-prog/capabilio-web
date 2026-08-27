export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, companyTasks, careerGoals, roles, profiles } from '@capabilio/db';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    let tasks = await db.query.companyTasks.findMany({
      where: eq(companyTasks.userId, user.id as any),
      orderBy: [desc(companyTasks.createdAt)],
    });

    if (tasks.length === 0) {
      // Find user role
      const goal = await db.query.careerGoals.findFirst({
        where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
      });
      const activeRole = await db.query.roles.findFirst({
        where: goal ? eq(roles.id, goal.targetRoleId) : eq(roles.slug, 'software-engineer'),
      });
      const roleName = activeRole?.name || 'Software Engineer';

      await db.insert(companyTasks).values([
        {
          userId: user.id as any,
          title: `Technical Screening Evaluation — ${roleName}`,
          description: `Analyze company sprint ticket and prepare production implementation report for senior hiring committee.`,
          companyName: 'Stripe / TechFlow Partner',
          roleCategory: roleName,
          difficulty: 'Junior',
          status: 'assigned',
          dueDays: 3,
        },
        {
          userId: user.id as any,
          title: `Code Review & Performance Audit`,
          description: `Audit latency bottlenecks and verify database index performance logs.`,
          companyName: 'CloudScale Systems',
          roleCategory: roleName,
          difficulty: 'Junior',
          status: 'assigned',
          dueDays: 5,
        }
      ]);

      tasks = await db.query.companyTasks.findMany({
        where: eq(companyTasks.userId, user.id as any),
        orderBy: [desc(companyTasks.createdAt)],
      });
    }

    return ok({ tasks });
  } catch (error: any) {
    console.error('Get tasks error:', error);
    return serverError(error.message);
  }
}

const UpdateTaskSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['assigned', 'in_review', 'completed']),
  submissionNote: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = UpdateTaskSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid task update', parsed.error.flatten());

    const { taskId, status, submissionNote } = parsed.data;

    await db.update(companyTasks)
      .set({
        status,
        submissionNote: submissionNote || null,
        updatedAt: new Date(),
      })
      .where(and(eq(companyTasks.id, taskId), eq(companyTasks.userId, user.id as any)));

    const updated = await db.query.companyTasks.findFirst({
      where: eq(companyTasks.id, taskId),
    });

    return ok({ task: updated });
  } catch (error: any) {
    console.error('Update task error:', error);
    return serverError(error.message);
  }
}
