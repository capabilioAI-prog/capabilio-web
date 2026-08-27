export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, serverError } from '@/lib/auth';
import { db, pulsePosts, pulseLikes, pulseSaved, pulseFollows, careerGoals, roles, disciplines } from '@capabilio/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'for-you';
    const tag = searchParams.get('tag');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Get user active career goal & domain
    let userRole = 'Software Engineer';
    let userDomain = 'software_engineering';

    if (user?.id) {
      const goal = await db.query.careerGoals.findFirst({
        where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
      });
      if (goal) {
        const roleRecord = await db.query.roles.findFirst({
          where: eq(roles.id, goal.targetRoleId),
          with: { discipline: true },
        });
        if (roleRecord) {
          userRole = roleRecord.name;
          userDomain = roleRecord.discipline?.slug || 'software_engineering';
        }
      }
    }

    // Get user follows, saved, liked sets
    const userFollows = user?.id
      ? await db.query.pulseFollows.findMany({ where: eq(pulseFollows.userId, user.id as any) })
      : [];
    const userLikes = user?.id
      ? await db.query.pulseLikes.findMany({ where: eq(pulseLikes.userId, user.id as any) })
      : [];
    const userSaved = user?.id
      ? await db.query.pulseSaved.findMany({ where: eq(pulseSaved.userId, user.id as any) })
      : [];

    const likedPostIds = new Set(userLikes.map(l => l.postId));
    const savedPostIds = new Set(userSaved.map(s => s.postId));
    const followedTargetIds = new Set(userFollows.map(f => f.targetId));

    // Base query
    let allPosts = await db.query.pulsePosts.findMany({
      orderBy: [desc(pulsePosts.isPinned), desc(pulsePosts.createdAt)],
      with: {
        comments: {
          orderBy: [desc(pulsePosts.createdAt)],
          limit: 3,
        }
      },
      limit: 100,
    });

    // Filter by tab
    let filteredPosts = allPosts;

    if (tab === 'following') {
      filteredPosts = allPosts.filter(p => {
        return (
          followedTargetIds.has(p.userId) ||
          followedTargetIds.has(p.authorName) ||
          (p.tags && p.tags.some(t => followedTargetIds.has(t.toLowerCase())))
        );
      });
      // If following feed is sparse, include user domain posts
      if (filteredPosts.length === 0) {
        filteredPosts = allPosts.filter(p => p.domain === userDomain || p.domain === 'software_engineering');
      }
    } else if (tab === 'saved') {
      filteredPosts = allPosts.filter(p => savedPostIds.has(p.id));
    } else if (tab === 'trending') {
      filteredPosts = [...allPosts].sort((a, b) => (b.likesCount + b.commentsCount * 2) - (a.likesCount + a.commentsCount * 2));
    } else if (tab === 'technical') {
      filteredPosts = allPosts.filter(p => 
        p.category === 'architecture' || 
        p.category === 'technical_news' || 
        p.category === 'incident' || 
        p.codeSnippet !== null
      );
    } else if (tab === 'career') {
      filteredPosts = allPosts.filter(p => 
        p.category === 'career_win' || 
        p.category === 'evidence_share' || 
        p.signalType === 'career_signal' ||
        p.actionPrompt !== null
      );
    } else if (tab === 'companies') {
      filteredPosts = allPosts.filter(p => 
        p.authorHeadline.includes('@') || 
        p.category === 'incident' || 
        p.tags.some(t => ['Stripe', 'TechFlow', 'Vercel', 'AWS', 'Oracle'].includes(t))
      );
    } else {
      // For-You personalized ranking
      // Prioritize user's domain and evidence posts, followed by general tech
      filteredPosts = [...allPosts].sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        if (a.domain === userDomain) scoreA += 50;
        if (b.domain === userDomain) scoreB += 50;

        if (a.authorRole === userRole) scoreA += 30;
        if (b.authorRole === userRole) scoreB += 30;

        if (a.category === 'evidence_share') scoreA += 20;
        if (b.category === 'evidence_share') scoreB += 20;

        if (a.signalType === 'career_signal') scoreA += 15;
        if (b.signalType === 'career_signal') scoreB += 15;

        scoreA += a.likesCount * 0.5 + a.commentsCount;
        scoreB += b.likesCount * 0.5 + b.commentsCount;

        return scoreB - scoreA;
      });
    }

    // Secondary filter by tag / category if provided
    if (tag) {
      filteredPosts = filteredPosts.filter(p => p.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }
    if (category) {
      filteredPosts = filteredPosts.filter(p => p.category === category);
    }

    // Pagination
    const offset = (page - 1) * limit;
    const paginatedPosts = filteredPosts.slice(offset, offset + limit);

    // Decorate posts with user specific state
    const decoratedPosts = paginatedPosts.map(p => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
      isSaved: savedPostIds.has(p.id),
      isFollowingAuthor: followedTargetIds.has(p.userId) || followedTargetIds.has(p.authorName),
    }));

    return ok({
      posts: decoratedPosts,
      meta: {
        total: filteredPosts.length,
        page,
        limit,
        hasMore: offset + limit < filteredPosts.length,
        userRole,
        userDomain,
      }
    });
  } catch (error: any) {
    console.error('Pulse feed error:', error);
    return serverError(error.message || 'Failed to fetch Pulse feed');
  }
}
