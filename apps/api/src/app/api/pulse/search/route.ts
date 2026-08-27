export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok, badRequest, serverError } from '@/lib/auth';
import { db, pulsePosts, pulseTopics, users, profiles } from '@capabilio/db';
import { ilike, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return ok({ posts: [], topics: [], people: [] });
    }

    const searchPattern = `%${query}%`;

    // Search posts
    const posts = await db.query.pulsePosts.findMany({
      where: or(
        ilike(pulsePosts.title, searchPattern),
        ilike(pulsePosts.content, searchPattern),
        ilike(pulsePosts.authorName, searchPattern),
        ilike(pulsePosts.authorRole, searchPattern)
      ),
      limit: 20,
    });

    // Search topics
    const topics = await db.query.pulseTopics.findMany({
      where: or(
        ilike(pulseTopics.name, searchPattern),
        ilike(pulseTopics.description, searchPattern)
      ),
      limit: 10,
    });

    // Search profiles
    const people = await db.query.profiles.findMany({
      where: or(
        ilike(profiles.displayName, searchPattern),
        ilike(profiles.headline, searchPattern)
      ),
      limit: 10,
    });

    return ok({ posts, topics, people });
  } catch (error: any) {
    console.error('Pulse search error:', error);
    return serverError(error.message);
  }
}
