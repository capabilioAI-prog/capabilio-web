export interface PulseTopicData {
  name: string;
  slug: string;
  domain: string;
  trendingScore: number;
  growthRate: string;
  description: string;
  followersCount: number;
}

export const pulseTopicsData: PulseTopicData[] = [
  // Software Engineering
  {
    name: 'TypeScript',
    slug: 'typescript',
    domain: 'software_engineering',
    trendingScore: 98,
    growthRate: '+24%',
    description: 'Strict static typing, generic constraints, and modern ECMAScript standards.',
    followersCount: 1420
  },
  {
    name: 'Next.js App Router',
    slug: 'nextjs',
    domain: 'software_engineering',
    trendingScore: 95,
    growthRate: '+19%',
    description: 'React Server Components, server actions, streaming, and edge runtimes.',
    followersCount: 1180
  },
  {
    name: 'API Rate Limiting',
    slug: 'api-rate-limiting',
    domain: 'software_engineering',
    trendingScore: 89,
    growthRate: '+14%',
    description: 'Token bucket, sliding window, and Redis-backed gateway throttling.',
    followersCount: 840
  },
  {
    name: 'Deterministic Testing',
    slug: 'deterministic-testing',
    domain: 'software_engineering',
    trendingScore: 92,
    growthRate: '+31%',
    description: 'Hermetic test fixtures, contract tests, and boundary value validation.',
    followersCount: 960
  },

  // Machine Learning & AI
  {
    name: 'LLM Fine-Tuning & RAG',
    slug: 'llm-rag',
    domain: 'machine_learning',
    trendingScore: 99,
    growthRate: '+42%',
    description: 'Retrieval-Augmented Generation, vector embeddings, and parameter-efficient tuning (LoRA).',
    followersCount: 2150
  },
  {
    name: 'MLOps & Inference',
    slug: 'mlops',
    domain: 'machine_learning',
    trendingScore: 91,
    growthRate: '+22%',
    description: 'Model deployment, latency optimization, quantization, and drift monitoring.',
    followersCount: 1320
  },

  // Cybersecurity
  {
    name: 'SIEM & Threat Hunting',
    slug: 'siem-threat-hunting',
    domain: 'cybersecurity',
    trendingScore: 94,
    growthRate: '+27%',
    description: 'Authentication log correlation, IOC detection, and automated incident triage.',
    followersCount: 980
  },
  {
    name: 'Zero Trust & IAM',
    slug: 'zero-trust-iam',
    domain: 'cybersecurity',
    trendingScore: 88,
    growthRate: '+16%',
    description: 'Least-privilege access, SSO tokens, and perimeterless security architecture.',
    followersCount: 750
  },

  // Data & Analytics
  {
    name: 'SaaS Unit Economics',
    slug: 'saas-unit-economics',
    domain: 'data_science',
    trendingScore: 87,
    growthRate: '+18%',
    description: 'MRR breakdown, LTV:CAC ratios, net revenue retention, and cohort tracking.',
    followersCount: 810
  },
  {
    name: 'PostgreSQL Query Optimization',
    slug: 'postgres-query-tuning',
    domain: 'database_administration',
    trendingScore: 93,
    growthRate: '+21%',
    description: 'EXPLAIN ANALYZE, B-tree vs GIN indexes, and buffer pool optimization.',
    followersCount: 1040
  },

  // Engineering & Product
  {
    name: 'GD&T Tolerance Stacks',
    slug: 'gdt-tolerance',
    domain: 'mechanical_engineering',
    trendingScore: 84,
    growthRate: '+12%',
    description: 'ISO 286 fits (H7/g6), datum reference frames, and manufacturing limits.',
    followersCount: 420
  },
  {
    name: 'Structural Concrete Takeoff',
    slug: 'concrete-boq',
    domain: 'civil_engineering',
    trendingScore: 82,
    growthRate: '+10%',
    description: 'Bill of quantities, steel reinforcement ratios, and IS 456 standards.',
    followersCount: 390
  },
  {
    name: 'RICE Prioritization',
    slug: 'rice-prioritization',
    domain: 'mba',
    trendingScore: 90,
    growthRate: '+17%',
    description: 'Reach, Impact, Confidence, Effort scorecards for product roadmap scoping.',
    followersCount: 920
  }
];

export interface PulsePostData {
  authorName: string;
  authorHeadline: string;
  authorRole: string;
  authorAvatarUrl?: string;
  category: 'sparks' | 'architecture' | 'incident' | 'career_win' | 'technical_news' | 'evidence_share' | 'question' | 'insight';
  title?: string;
  content: string;
  tags: string[];
  domain: string;
  signalType?: 'career_signal' | 'tech_signal' | 'trend_signal' | 'network_signal';
  signalNote?: string;
  codeSnippet?: { language: string; code: string; filename?: string };
  evidenceData?: {
    missionId?: string;
    missionTitle: string;
    roleName: string;
    eloDelta: number;
    score: number;
    skillName: string;
    proofHash?: string;
  };
  actionPrompt?: {
    type: 'arena' | 'skill_studio' | 'launchpad';
    label: string;
    linkUrl: string;
    badgeText?: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  comments?: Array<{
    authorName: string;
    authorHeadline: string;
    content: string;
  }>;
}

export const pulsePostsData: PulsePostData[] = [
  // 1. Evidence Share — Software Engineer
  {
    authorName: 'Alex Chen',
    authorHeadline: 'Aspiring Software Engineer • ELO 1,092',
    authorRole: 'Software Engineer',
    category: 'evidence_share',
    title: 'Completed Sprint 42: Checkout Validation Bug Investigation',
    content: 'Just solved the checkout conversion drop regression on Fintech Velocity Core codebase. Investigated why PR #891 caused 40% drops: the isValid boolean logic had been inverted and card regex rejected spaces. Verified with 6 unit assertions in Monaco IDE.',
    tags: ['SoftwareEngineer', 'Sprint42', 'Testing', 'CapabilioProof'],
    domain: 'software_engineering',
    signalType: 'career_signal',
    signalNote: 'Verified Engineering Evidence deposited to Vault',
    evidenceData: {
      missionTitle: 'Checkout Conversion Drop — Investigate & Fix',
      roleName: 'Software Engineer',
      eloDelta: 16,
      score: 100,
      skillName: 'Unit Testing & Validation',
      proofHash: 'sha256:7f9a8e41bc2d890a'
    },
    actionPrompt: {
      type: 'arena',
      label: 'Practice this Sprint Ticket in Arena',
      linkUrl: '/arena',
      badgeText: 'Entry / Junior Workstation'
    },
    likesCount: 142,
    commentsCount: 18,
    sharesCount: 24,
    comments: [
      {
        authorName: 'David K.',
        authorHeadline: 'Staff Software Engineer @ Stripe',
        content: 'Solid RCA. Inverted boolean checks in checkout hooks cause an astonishing number of silent production drops. Well done adding the unit tests.'
      },
      {
        authorName: 'Elena Rostova',
        authorHeadline: 'Tech Lead @ CloudScale Systems',
        content: 'Love seeing real reproduction code instead of resume bullet points. This is exactly what we look for in candidate screening.'
      }
    ]
  },

  // 2. Technical Architecture — Rate Limiting
  {
    authorName: 'David K.',
    authorHeadline: 'Staff Software Engineer @ Stripe',
    authorRole: 'Software Engineer',
    category: 'architecture',
    title: 'Why Token-Bucket Rate Limiting with Retry-After Headers Saves Distributed Gateways',
    content: 'When handling sudden 10x traffic spikes on payment endpoints, returning generic 500 errors causes API clients to immediately retry in loops, triggering cascading outages. Implementing token buckets in Redis with proper Retry-After headers throttles bursts cleanly while keeping p99 latency under 25ms.',
    tags: ['Architecture', 'Redis', 'RateLimiting', 'APIs'],
    domain: 'software_engineering',
    signalType: 'tech_signal',
    signalNote: 'Matches your API Architecture & Systems Design skill',
    codeSnippet: {
      language: 'typescript',
      filename: 'src/middleware/rate-limiter.ts',
      code: `const bucket = await redis.get(\`rate:\${ip}\`);
if (bucket.tokens < cost) {
  return res.status(429).setHeader('Retry-After', '60').json({
    error: 'Too Many Requests',
    retryAfterSeconds: 60
  });
}`
    },
    actionPrompt: {
      type: 'arena',
      label: 'Solve Rate Limiting Middleware in Arena',
      linkUrl: '/arena',
      badgeText: 'Backend Workstation'
    },
    likesCount: 284,
    commentsCount: 39,
    sharesCount: 52,
    comments: [
      {
        authorName: 'Marcus Vance',
        authorHeadline: 'Backend Developer @ Vercel Ecosystem',
        content: 'Do you recommend sliding window logs or token buckets for multi-region Redis clusters?'
      },
      {
        authorName: 'David K.',
        authorHeadline: 'Staff Software Engineer @ Stripe',
        content: 'Token bucket with local in-memory fallback for transient Redis blips is usually the sweet spot for latency vs consistency.'
      }
    ]
  },

  // 3. Incident Post-Mortem — SQL Indexing
  {
    authorName: 'Dr. Priya Sharma',
    authorHeadline: 'Principal Database Architect • Ex-Oracle / AWS',
    authorRole: 'Database Administrator',
    category: 'incident',
    title: 'Incident Post-Mortem: Why a Missing Composite Index Locked 80,000 Customer Rows',
    content: 'During peak morning billing cycles, our order aggregation query degraded from 12ms to 4.2 seconds due to a sequential table scan across 1.4 million rows. Adding a composite B-tree index on (customer_id, status, created_at) dropped sequential scans to an Index Scan with 0 row locks.',
    tags: ['PostgreSQL', 'Indexing', 'QueryTuning', 'IncidentPostMortem'],
    domain: 'database_administration',
    signalType: 'trend_signal',
    signalNote: 'Trending in Database & Backend Engineering',
    codeSnippet: {
      language: 'sql',
      filename: 'migrations/0042_add_orders_composite_index.sql',
      code: `CREATE INDEX CONCURRENTLY idx_orders_customer_status_created 
ON orders (customer_id, status, created_at DESC);`
    },
    actionPrompt: {
      type: 'arena',
      label: 'Optimize Slow SQL Queries in Arena DBA Lab',
      linkUrl: '/arena',
      badgeText: 'DBA Workstation'
    },
    likesCount: 198,
    commentsCount: 27,
    sharesCount: 31
  },

  // 4. ML / AI Insight — F1 Metric Threshold Tuning
  {
    authorName: 'Elena Rostova',
    authorHeadline: 'Lead AI Engineer @ Aether Cloud Telemetry',
    authorRole: 'ML / AI Engineer',
    category: 'insight',
    title: 'Why Default 0.5 Decision Thresholds Sabotage Churn Prediction Models',
    content: 'When training classifiers on imbalanced customer churn datasets (e.g. 8% positive churn class), relying on default 0.5 probability cutoffs results in poor recall (< 0.45). Sweeping the precision-recall curve and shifting the threshold to 0.35 maximized F1-Score to 0.88 without excessive false positives.',
    tags: ['MachineLearning', 'PyTorch', 'ModelTuning', 'F1Score'],
    domain: 'machine_learning',
    signalType: 'tech_signal',
    signalNote: 'Relevant to ML / AI Engineering Track',
    actionPrompt: {
      type: 'arena',
      label: 'Tune Churn Classification in Arena AI Lab',
      linkUrl: '/arena',
      badgeText: 'AI Workstation'
    },
    likesCount: 312,
    commentsCount: 44,
    sharesCount: 68
  },

  // 5. Cybersecurity Threat Brief — Credential Stuffing
  {
    authorName: 'Vikram Mehta',
    authorHeadline: 'SOC Lead & Threat Hunter @ Sentinel Defense',
    authorRole: 'Cybersecurity Analyst',
    category: 'technical_news',
    title: 'Threat Intel: Coordinated Credential Stuffing Campaign Exploiting SSO Endpoints',
    content: 'We observed distributed botnets rotating over 4,000 residential IP proxies to execute credential stuffing across corporate SSO gateways. Correlating failed login spikes against user-agent hash variations enabled automated IP CIDR blocklisting within 90 seconds.',
    tags: ['Cybersecurity', 'SOC', 'ThreatIntel', 'IncidentResponse'],
    domain: 'cybersecurity',
    signalType: 'trend_signal',
    signalNote: 'Security Operations & Threat Hunting Signal',
    actionPrompt: {
      type: 'arena',
      label: 'Triage Credential Stuffing in SOC Terminal',
      linkUrl: '/arena',
      badgeText: 'Security Workstation'
    },
    likesCount: 220,
    commentsCount: 31,
    sharesCount: 45
  },

  // 6. Engineering Question & Community Discussion
  {
    authorName: 'Sarah Jenkins',
    authorHeadline: 'Frontend Engineer @ DesignCraft',
    authorRole: 'Frontend Developer',
    category: 'question',
    title: 'How is your team handling Server Actions vs Route Handlers in Next.js 14?',
    content: 'We are evaluating whether to migrate all mutation forms to React Server Actions with useOptimistic or keep standard REST route handlers. For teams who have scaled Server Actions to production, how do you manage centralized error boundaries and rate limiting headers?',
    tags: ['Nextjs', 'React', 'WebDev', 'Discussion'],
    domain: 'software_engineering',
    signalType: 'network_signal',
    signalNote: 'Active Discussion in Your Network',
    likesCount: 165,
    commentsCount: 52,
    sharesCount: 18,
    comments: [
      {
        authorName: 'Alex Chen',
        authorHeadline: 'Aspiring Software Engineer • ELO 1,092',
        content: 'We use Server Actions for standard form state and Route Handlers for high-frequency webhooks and public API consumers.'
      }
    ]
  },

  // 7. Mechanical & Civil Engineering Domain Sparks
  {
    authorName: 'Rajesh Nair',
    authorHeadline: 'Lead Structural & Civil Consultant • PE',
    authorRole: 'Civil Engineer',
    category: 'insight',
    title: 'Standardizing Reinforced Concrete Slab Estimation under IS 456:2000',
    content: 'Accurate concrete volume takeoff requires factoring in dry volume conversion multipliers (1.54) alongside steel percentage ratios (0.8% to 1.2% by volume). Automated calculation sheets prevent the 5-10% cost overruns commonly seen in manual BOQ estimations.',
    tags: ['CivilEngineering', 'StructuralDesign', 'IS456', 'BOQ'],
    domain: 'civil_engineering',
    signalType: 'career_signal',
    signalNote: 'Civil Engineering Domain Knowledge',
    likesCount: 94,
    commentsCount: 12,
    sharesCount: 15
  },

  // 8. Product & MBA Career Strategy
  {
    authorName: 'Sophia Lin',
    authorHeadline: 'VP of Product @ Nexus Enterprise',
    authorRole: 'Product Manager',
    category: 'career_win',
    title: 'RICE Scorecards: The Anti-Pattern of Subjective Confidence Multipliers',
    content: 'When product managers assign Confidence = 100% based on intuition alone, RICE rankings get skewed toward easy pet projects rather than high-impact platform bets. Enforce evidence-backed confidence scoring (telemetry = 100%, user interview = 80%, intuition = 50%).',
    tags: ['ProductManagement', 'RICE', 'Strategy', 'MBA'],
    domain: 'mba',
    signalType: 'career_signal',
    signalNote: 'Product Strategy & Unit Economics Signal',
    likesCount: 178,
    commentsCount: 29,
    sharesCount: 36
  }
];
