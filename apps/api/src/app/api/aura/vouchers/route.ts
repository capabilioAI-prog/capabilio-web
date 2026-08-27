export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { db, auraVouchers, roles, careerGoals, eloRecords } from '@capabilio/db';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const vouchers = await db.query.auraVouchers.findMany({
      where: eq(auraVouchers.userId, user.id as any),
      orderBy: [desc(auraVouchers.issuedAt)],
    });

    return ok({ vouchers });
  } catch (error: any) {
    console.error('Get vouchers error:', error);
    return serverError(error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const goal = await db.query.careerGoals.findFirst({
      where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
    });

    const role = await db.query.roles.findFirst({
      where: goal ? eq(roles.id, goal.targetRoleId) : eq(roles.slug, 'software-engineer'),
    });

    const roleId = role!.id;
    const roleName = role!.name;

    const eloRecord = await db.query.eloRecords.findFirst({
      where: and(eq(eloRecords.userId, user.id as any), eq(eloRecords.roleId, roleId)),
    });

    const eloScore = eloRecord?.eloScore || 1000;
    const verificationId = `CAP-2026-${roleName.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const [voucher] = await db.insert(auraVouchers).values({
      userId: user.id as any,
      roleId: roleId as any,
      verificationId,
      title: `Verified Capability Credential: ${roleName}`,
      issuer: 'Capabilio Verified Capability Engine',
      eloScore,
      skillsVerified: ['API Architecture', 'Deterministic Testing', 'Database Indexing', 'System Debugging'],
      evidenceCount: eloRecord?.passedMissions || 1,
    }).returning();

    return ok({ voucher }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Generate voucher error:', error);
    return serverError(error.message);
  }
}
