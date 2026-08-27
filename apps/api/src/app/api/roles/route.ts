export const dynamic = 'force-dynamic';

import { ok, serverError } from '@/lib/auth';
import { db } from '@capabilio/db';
import { roles, disciplines } from '@capabilio/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allRoles = await db.query.roles.findMany({
      where: eq(roles.isActive, true),
      with: { discipline: true, knowledge: true },
      orderBy: (roles, { asc }) => [asc(roles.name)],
    });

    return ok({ roles: allRoles });
  } catch (error) {
    console.error('Get roles error:', error);
    return serverError();
  }
}
