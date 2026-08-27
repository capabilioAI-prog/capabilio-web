export const dynamic = 'force-dynamic';

import { ok, unauthorized } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { db } from '@capabilio/db';
import { users, profiles } from '@capabilio/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) return unauthorized();

  // Get profile
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, user.id),
  });

  return ok({ user: { id: user.id, email: user.email }, profile });
}
