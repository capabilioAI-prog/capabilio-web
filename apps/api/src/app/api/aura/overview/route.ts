export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { 
  db, 
  users, 
  profiles, 
  careerGoals, 
  roles, 
  disciplines, 
  skills, 
  roleSkills, 
  userSkills, 
  skillEvidence, 
  eloRecords, 
  eloChanges, 
  submissions, 
  evaluations, 
  missions,
  userMissionAttempts,
  streamRatings,
  auraInterviews,
  auraDocuments,
  auraVouchers,
  portfolioItems,
  personalBrandingProfiles
} from '@capabilio/db';
import { getStreamDefinition } from '@/lib/arena/stream-registry';
import { eq, and, desc } from 'drizzle-orm';

const CANONICAL_ROLE_SKILLS: Record<string, Array<{ name: string; slug: string; category: string; weight: number; isCore: boolean }>> = {
  'data-analyst': [
    { name: 'SQL Querying & Aggregations', slug: 'sql-querying', category: 'technical', weight: 95, isCore: true },
    { name: 'Python / Pandas', slug: 'python-pandas', category: 'technical', weight: 90, isCore: true },
    { name: 'Data Cleansing & Validation', slug: 'data-cleaning', category: 'technical', weight: 85, isCore: true },
    { name: 'Business KPI Calculation', slug: 'kpi-calculation', category: 'analytical', weight: 90, isCore: true },
    { name: 'Statistical Testing & EDA', slug: 'statistics-eda', category: 'analytical', weight: 80, isCore: true },
    { name: 'Data Visualization & BI', slug: 'data-visualization', category: 'communication', weight: 85, isCore: true },
    { name: 'ETL Pipelines & Transforms', slug: 'etl-pipelines', category: 'technical', weight: 75, isCore: false },
    { name: 'Data Modeling & Schemas', slug: 'data-modeling', category: 'technical', weight: 80, isCore: false },
    { name: 'Cohort Retention Analysis', slug: 'cohort-analysis', category: 'analytical', weight: 85, isCore: true },
    { name: 'Executive Storytelling & Reporting', slug: 'data-storytelling', category: 'communication', weight: 80, isCore: false },
  ],
  'database-administrator': [
    { name: 'SQL & Query Optimization', slug: 'sql-optimization', category: 'technical', weight: 95, isCore: true },
    { name: 'Index Architecture & EXPLAIN', slug: 'index-architecture', category: 'technical', weight: 95, isCore: true },
    { name: 'Database Schema Design', slug: 'schema-design', category: 'technical', weight: 90, isCore: true },
    { name: 'Transactions & Lock Contention', slug: 'transactions-locks', category: 'technical', weight: 90, isCore: true },
    { name: 'Backup & PITR Recovery', slug: 'backup-recovery', category: 'domain', weight: 85, isCore: true },
    { name: 'Replication & High Availability', slug: 'replication-ha', category: 'technical', weight: 85, isCore: true },
    { name: 'PostgreSQL & MySQL Internals', slug: 'db-internals', category: 'technical', weight: 80, isCore: false },
    { name: 'Performance Tuning & Memory', slug: 'perf-tuning', category: 'analytical', weight: 90, isCore: true },
    { name: 'Database Security & Grants', slug: 'db-security', category: 'domain', weight: 80, isCore: false },
    { name: 'Monitoring & Health Probes', slug: 'db-monitoring', category: 'tooling', weight: 75, isCore: false },
  ],
  'software-engineer': [
    { name: 'TypeScript & JavaScript', slug: 'typescript', category: 'technical', weight: 95, isCore: true },
    { name: 'Data Structures & Algorithms', slug: 'dsa', category: 'analytical', weight: 90, isCore: true },
    { name: 'React Component Architecture', slug: 'react', category: 'technical', weight: 90, isCore: true },
    { name: 'Production Debugging', slug: 'debugging', category: 'analytical', weight: 95, isCore: true },
    { name: 'Unit & Integration Testing', slug: 'testing', category: 'technical', weight: 85, isCore: true },
    { name: 'REST & GraphQL APIs', slug: 'rest-apis', category: 'technical', weight: 85, isCore: true },
    { name: 'Databases & SQL', slug: 'sql', category: 'technical', weight: 80, isCore: false },
    { name: 'Git & Version Control', slug: 'git', category: 'tooling', weight: 80, isCore: false },
    { name: 'Cloud & Containerization', slug: 'docker-cloud', category: 'technical', weight: 75, isCore: false },
    { name: 'System Architecture', slug: 'system-design', category: 'analytical', weight: 80, isCore: false },
  ],
};

const ROLE_RADAR_DIMENSIONS: Record<string, string[]> = {
  'Software Engineer': ['Programming', 'Data Structures & Algorithms', 'Git & Version Control', 'Frontend Architecture', 'Backend Development', 'Databases & SQL', 'Deterministic Testing', 'REST & GraphQL APIs', 'Cloud & Docker', 'Distributed System Design'],
  'Cybersecurity Analyst': ['Network Security', 'SIEM & Splunk', 'SOC Operations', 'Incident Response', 'IOC Threat Detection', 'Linux Internals', 'Network Protocols', 'Python Automation', 'Cloud Security', 'Vulnerability Assessment'],
  'Database Administrator': ['SQL Optimization', 'Database Schema Design', 'Performance Tuning', 'Backup & PITR Recovery', 'Replication & HA', 'Row & Table Locks', 'PostgreSQL Internals', 'MySQL / Oracle', 'Index Architecture', 'Monitoring & Metrics'],
  'ML / AI Engineer': ['Python Data Engineering', 'Feature Engineering', 'Model Training', 'Precision-Recall Tuning', 'RAG & Vector Retrieval', 'LLM Orchestration', 'Deep Learning', 'Model Serving APIs', 'MLOps & Pipelines', 'Statistical Analysis'],
  'Frontend Developer': ['HTML5 & CSS Grid', 'React Components', 'Tailwind CSS', 'Web Accessibility (a11y)', 'Client State Caching', 'Frontend Testing', 'Next.js App Router', 'Browser DevTools', 'TypeScript Types', 'Web Performance'],
  'Data Analyst': ['SQL Reporting', 'Pandas & NumPy', 'Dashboard Design', 'Statistical Testing', 'ETL Pipelines', 'Data Visualization', 'Business Intelligence', 'Data Quality Auditing', 'Regression Modeling', 'Stakeholder Presentations'],
};

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    // 1. Get profile
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id as any),
    });

    // 2. Get active career goal & role (ordered by most recent)
    const goal = await db.query.careerGoals.findFirst({
      where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
      orderBy: [desc(careerGoals.updatedAt), desc(careerGoals.createdAt)],
    });

    let activeRole = null;
    if (goal?.targetRoleId) {
      activeRole = await db.query.roles.findFirst({
        where: eq(roles.id, goal.targetRoleId),
        with: { discipline: true },
      });
    }

    if (!activeRole) {
      activeRole = await db.query.roles.findFirst({
        where: eq(roles.slug, 'data-analyst'),
        with: { discipline: true },
      }) || await db.query.roles.findFirst({
        with: { discipline: true },
      });
    }

    const roleId = activeRole!.id;
    const roleName = activeRole!.name;
    const roleSlug = activeRole!.slug;
    const domainSlug = activeRole!.discipline?.slug || 'data_science';

    // 3. Get Authoritative Career ELO
    const eloRecord = await db.query.eloRecords.findFirst({
      where: and(eq(eloRecords.userId, user.id as any), eq(eloRecords.roleId, roleId)),
    }) || await db.query.eloRecords.findFirst({
      where: eq(eloRecords.userId, user.id as any),
      orderBy: [desc(eloRecords.updatedAt), desc(eloRecords.createdAt)],
    });

    const eloScore = eloRecord?.eloScore || 400;

    const eloHistory = await db.query.eloChanges.findMany({
      where: eq(eloChanges.userId, user.id as any),
      orderBy: [desc(eloChanges.createdAt)],
      limit: 10,
    });

    // 4. Get Mission Attempts (Locks, Pass Rate & Evidence)
    const attempts = await db.query.userMissionAttempts.findMany({
      where: eq(userMissionAttempts.userId, user.id as any),
      orderBy: [desc(userMissionAttempts.createdAt)],
    });

    const totalEvaluatedMissions = Math.max(eloRecord?.totalMissions || 0, attempts.length);
    const passedMissionsCount = attempts.length > 0
      ? attempts.filter(a => a.passed).length
      : (eloRecord?.passedMissions || 0);

    const passRate = totalEvaluatedMissions > 0
      ? Math.round((passedMissionsCount / totalEvaluatedMissions) * 100)
      : null; // null explicitly means "No evaluated missions yet"

    // 5. Get Stream Rating
    const streamDef = getStreamDefinition(profile?.stream || 'Computer Science & Engineering');
    const streamRecord = await db.query.streamRatings.findFirst({
      where: and(eq(streamRatings.userId, user.id as any), eq(streamRatings.streamSlug, streamDef.slug)),
    }) || await db.query.streamRatings.findFirst({
      where: eq(streamRatings.userId, user.id as any),
      orderBy: [desc(streamRatings.updatedAt)],
    });

    const streamRating = streamRecord?.rating || 500;

    // 6. Assemble Comprehensive Skill Graph for Active Role
    const dbRoleSkills = await db.query.roleSkills.findMany({
      where: eq(roleSkills.roleId, roleId),
      with: { skill: true },
    });

    const userSkillsList = await db.query.userSkills.findMany({
      where: eq(userSkills.userId, user.id as any),
    });
    const userSkillMap = new Map(userSkillsList.map(us => [us.skillId, us]));

    const canonicalList = CANONICAL_ROLE_SKILLS[roleSlug] || CANONICAL_ROLE_SKILLS['data-analyst']!;

    const skillGraph = canonicalList.map(cs => {
      const dbMatch = dbRoleSkills.find(rs => rs.skill.slug === cs.slug || rs.skill.name.toLowerCase().includes(cs.name.toLowerCase().split(' ')[0] || ''));
      const us = dbMatch ? userSkillMap.get(dbMatch.skillId) : null;
      
      // Credit demonstrated skills from verified mission attempts
      const hasMissionDemonstration = attempts.some(a => 
        a.passed && (
          JSON.stringify(a.skills || []).toLowerCase().includes(cs.slug.replace('-', '')) ||
          JSON.stringify(a.skills || []).toLowerCase().includes(cs.name.toLowerCase().split(' ')[0] || '')
        )
      );

      const evidenceCount = (us?.evidenceCount || 0) + (hasMissionDemonstration ? 1 : 0);
      const baseProficiency = eloScore > 400 ? Math.min(96, Math.round(cs.weight * (eloScore / 500))) : cs.weight;
      const proficiency = hasMissionDemonstration ? Math.min(100, baseProficiency + 6) : baseProficiency;

      return {
        id: cs.slug,
        name: cs.name,
        slug: cs.slug,
        category: cs.category,
        weight: cs.weight,
        isCore: cs.isCore,
        proficiency,
        evidenceCount,
        eloScore: eloScore,
      };
    });

    const demonstratedCount = skillGraph.filter(s => s.evidenceCount > 0 || s.proficiency >= 85).length;

    // 7. Radar Dimensions Calibrated to Role
    const defaultDims = ROLE_RADAR_DIMENSIONS['Software Engineer']!;
    const radarDimensionNames = ROLE_RADAR_DIMENSIONS[roleName] || defaultDims;
    const radarSkills = radarDimensionNames.map(dimName => {
      const matched = skillGraph.find(s => s.name.toLowerCase().includes(dimName.toLowerCase().split(' ')[0] || ''));
      return {
        dimension: dimName,
        score: matched ? matched.proficiency : Math.min(95, Math.round(55 + (eloScore - 400) * 0.2)),
        evidenceCount: matched ? matched.evidenceCount : 0,
        isCore: true,
      };
    });

    // 8. Dynamic Role Readiness
    const avgSkillScore = Math.round(skillGraph.reduce((acc, s) => acc + s.proficiency, 0) / skillGraph.length);
    const practicalScore = totalEvaluatedMissions > 0 ? (passRate || 0) : 30;
    const userInterviews = await db.query.auraInterviews.findMany({
      where: eq(auraInterviews.userId, user.id as any),
      orderBy: [desc(auraInterviews.createdAt)],
    });
    const latestInterview = userInterviews[0];
    const interviewReadiness = latestInterview?.readinessScore || (userInterviews.length > 0 ? 72 : 45);
    const interviewScore = latestInterview?.score || 75;
    const evidenceScore = Math.min(100, (demonstratedCount / skillGraph.length) * 100);
    const consistencyScore = 85;

    const overallReadiness = Math.round(
      avgSkillScore * 0.35 +
      practicalScore * 0.25 +
      interviewScore * 0.20 +
      evidenceScore * 0.15 +
      consistencyScore * 0.05
    );

    // 9. Next Best Action
    const sortedGaps = [...skillGraph].sort((a, b) => a.proficiency - b.proficiency);
    const topGap = sortedGaps[0] || { name: 'SQL Query Optimization', slug: 'sql-querying', proficiency: 52 };

    const nextBestAction = {
      title: `Improve ${topGap.name}`,
      reason: `${topGap.name} is currently ${topGap.proficiency}% (Target for ${roleName} is 80%+)`,
      skillName: topGap.name,
      difficulty: 'Intermediate',
      estimatedMinutes: 15,
      expectedEloImpact: '+8 to +16 ELO',
      arenaUrl: '/arena',
      skillStudioUrl: '/skill-studio',
    };

    // 10. Recent Evidence Items from userMissionAttempts and auraInterviews
    const arenaEvidence = attempts.map(a => ({
      id: a.id,
      missionTitle: a.title,
      roleName: a.roleSlug ? a.roleSlug.replace('-', ' ').toUpperCase() : roleName,
      passed: a.passed,
      score: a.score,
      eloDelta: a.eloChange,
      submittedAt: a.createdAt,
      type: a.trackType === 'stream' ? 'Stream Challenge' : 'Arena Simulation',
      verificationHash: a.verificationHash || `sha256:${a.missionId}`,
    }));

    const interviewEvidence = userInterviews.map(i => ({
      id: i.id,
      missionTitle: `${roleName} AI Technical Interview`,
      roleName: roleName.toUpperCase(),
      passed: i.score >= 70,
      score: i.score,
      eloDelta: 0,
      submittedAt: i.createdAt,
      type: 'AI Technical Interview',
      verificationHash: i.verificationHash || `sha256:${i.id}`,
    }));

    const recentEvidence = [...arenaEvidence, ...interviewEvidence]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 8);

    // 11. Portfolio Items
    const portfolio = await db.query.portfolioItems.findMany({
      where: eq(portfolioItems.userId, user.id as any),
      orderBy: [desc(portfolioItems.createdAt)],
      limit: 6,
    });

    // 12. Personal Branding Profile
    let branding = await db.query.personalBrandingProfiles.findFirst({
      where: and(eq(personalBrandingProfiles.userId, user.id as any), eq(personalBrandingProfiles.roleId, roleId)),
    });

    if (!branding) {
      branding = {
        id: 'default',
        userId: user.id as any,
        roleId: roleId as any,
        targetRoleName: roleName,
        scriptText: `Hi, I'm ${profile?.displayName || 'Venkata Kopuri'}, a ${roleName} specializing in reliable systems, data-driven decisions, and verified problem solving through hands-on Arena simulations.`,
        videoStatus: 'draft',
        videoUrl: null,
        durationSeconds: 45,
        topCapabilities: radarDimensionNames.slice(0, 4),
        achievements: ['Completed Arena Sprint Simulation with deterministic verification', 'Verified core role competencies in Vault'],
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // 13. Code DNA Profile
    const codeDna = {
      primaryLanguage: roleSlug.includes('cyber') ? 'Python / Bash' : roleSlug.includes('data') ? 'SQL / Python' : 'TypeScript',
      languageBreakdown: roleSlug.includes('cyber')
        ? [{ name: 'Python', percentage: 65 }, { name: 'Bash', percentage: 25 }, { name: 'Wireshark / PCAP', percentage: 10 }]
        : roleSlug.includes('data')
        ? [{ name: 'SQL', percentage: 70 }, { name: 'Python', percentage: 25 }, { name: 'R', percentage: 5 }]
        : [
            { name: 'TypeScript', percentage: 72 },
            { name: 'Python', percentage: 18 },
            { name: 'SQL', percentage: 10 },
          ],
      strengths: [
        'Deterministic Assertions & Query Precision',
        'Clean Data Pipelines & Transformations',
        'Strict Schema & Type Boundary Handling',
      ],
      areasToImprove: [
        'Complex Window Aggregation Optimization',
        'Distributed Cache & Lock Contention',
      ],
      codeQualityScore: 92,
      testingHabitScore: 88,
    };

    return ok({
      user: { id: user.id, email: user.email },
      profile: {
        displayName: profile?.displayName || user.email?.split('@')[0] || 'Candidate',
        headline: profile?.headline || `${profile?.stream || 'Engineering'} Student @ ${profile?.collegeName || 'University'}`,
        collegeName: profile?.collegeName || null,
        universityName: profile?.universityName || null,
        department: profile?.department || null,
        stream: profile?.stream || 'CSE',
        graduationYear: profile?.graduationYear || null,
        avatarUrl: profile?.avatarUrl,
        location: profile?.location,
      },
      activeRole: {
        id: roleId,
        name: roleName,
        slug: roleSlug,
        discipline: domainSlug,
        level: goal?.currentLevel || 'student',
        timeline: goal?.timeline || 'immediate',
      },
      elo: {
        current: eloScore,
        baseline: 400,
        deltaFromBaseline: eloScore - 400,
        totalMissions: totalEvaluatedMissions,
        passedMissions: passedMissionsCount,
        passRate, // number or null
        history: eloHistory,
      },
      stream: {
        slug: streamDef.slug,
        name: streamDef.streamName,
        shortCode: streamDef.shortCode,
        rating: streamRating,
      },
      readiness: {
        overall: overallReadiness,
        technical: avgSkillScore,
        practical: practicalScore,
        interview: interviewReadiness,
        interviewTrend: 8,
        latestInterviewScore: interviewScore,
        evidence: Math.round(evidenceScore),
        consistency: consistencyScore,
      },
      latestInterview: latestInterview ? {
        id: latestInterview.id,
        score: latestInterview.score,
        readinessScore: latestInterview.readinessScore || 72,
        mode: latestInterview.interviewMode || 'technical',
        status: latestInterview.status,
        date: latestInterview.createdAt,
        verificationHash: latestInterview.verificationHash,
      } : null,
      demonstratedSkills: {
        count: demonstratedCount,
        total: skillGraph.length,
      },
      skillGraph,
      radarSkills,
      nextBestAction,
      recentEvidence,
      portfolio,
      branding,
      codeDna,
    });
  } catch (error: any) {
    console.error('Aura overview error:', error);
    return serverError(error.message);
  }
}
