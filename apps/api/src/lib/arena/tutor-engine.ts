export interface TutorEngineRequest {
  missionId: string;
  roleSlug: string;
  userMessage?: string;
  requestedLevel?: number;
  currentCode?: string;
  executionResults?: any;
  executionError?: string | null;
  executiveSummary?: string;
  hintsUsedCount: number;
}

export interface TutorEngineResponse {
  response: string;
  hintLevel: number;
  mentorRole: string;
  hintsUsedTotal: number;
  isRefusal: boolean;
  guidanceTopic?: string;
}

export function processTutorRequest(input: TutorEngineRequest): TutorEngineResponse {
  const isDba = input.roleSlug.includes('dba') || input.roleSlug.includes('database');
  const code = (input.currentCode || '').trim();
  const lowerCode = code.toLowerCase();
  const msg = (input.userMessage || '').trim().toLowerCase();
  const mentorRole = isDba ? 'Senior Database Reliability Mentor' : 'Senior Business Intelligence Mentor';

  let responseText = '';
  let hintLevelApplied = input.requestedLevel || 1;
  let isRefusal = false;

  // 1. Direct answer refusal guardrail
  const asksForDirectSolution =
    msg.includes('give me the exact') ||
    msg.includes('write the query for me') ||
    msg.includes('solve this for me') ||
    msg.includes('what is the solution') ||
    msg.includes('give me the answer') ||
    msg.includes('write the code') ||
    msg.includes('give me sql');

  if (asksForDirectSolution) {
    isRefusal = true;
    if (isDba) {
      responseText = `I won't write the final DDL/optimization script for you because this mission evaluates your diagnostic ability. Look at your EXPLAIN ANALYZE plan: which table is causing high sequential scan cost? Examine the WHERE filter predicates (tenant_id, status) and consider the leading column order in a composite B-Tree index.`;
    } else {
      responseText = `I won't write the final query for you because this mission evaluates your ability to analyze customer cohorts independently. Look at the relationship between \`users\` and \`orders\`: can one user have multiple orders? What happens to your count after that JOIN? Try adjusting your aggregation to count unique users.`;
    }

    return {
      response: responseText,
      hintLevel: hintLevelApplied,
      mentorRole,
      hintsUsedTotal: input.hintsUsedCount,
      isRefusal: true,
      guidanceTopic: isDba ? 'Indexing Strategy' : 'Relational Deduplication',
    };
  }

  // 2. Contextual Question Answering
  if (input.userMessage && input.userMessage.trim().length > 0) {
    if (msg.includes('duplicate') || msg.includes('inflated') || msg.includes('count') || msg.includes('cardinality')) {
      if (lowerCode.includes('join') && lowerCode.includes('count(')) {
        responseText = `Check what happens to the number of rows after your JOIN. When joining \`users\` with \`orders\`, a customer with 3 orders produces 3 rows in your joined set. If you use \`COUNT(*)\` or \`COUNT(o.order_id)\`, that customer is counted 3 times! Use \`COUNT(DISTINCT u.user_id)\` so each customer is counted once per cohort.`;
      } else {
        responseText = `To prevent duplicate customer counts when aggregating transactions across multiple tables, always use \`COUNT(DISTINCT user_id)\` rather than row-based \`COUNT(*)\`.`;
      }
    } else if (msg.includes('index') || msg.includes('slow') || msg.includes('scan')) {
      if (isDba) {
        responseText = `Postgres cannot use a single index on \`created_at\` efficiently when the query filters by \`tenant_id\` and \`status\`. You need a composite B-Tree index where the leading columns match the equality filter predicates.`;
      } else {
        responseText = `Ensure your query joins on primary/foreign key pairs (\`u.user_id = o.user_id\`) and filters for relevant time ranges.`;
      }
    } else if (msg.includes('is this correct') || msg.includes('check my query') || msg.includes('review')) {
      if (input.executionError) {
        responseText = `Your query currently encounters a syntax error: "${input.executionError}". Check clause order and make sure all non-aggregated columns are in GROUP BY.`;
      } else if (lowerCode.includes('count(distinct') && lowerCode.includes('group by')) {
        responseText = `Your query structure looks strong! You are correctly deduplicating user counts with \`COUNT(DISTINCT ...)\` and aggregating by cohort week and plan tier. Next, check Week 1 vs Week 4 numbers to see which tier experienced the sharpest attrition cliff.`;
      } else if (lowerCode.includes('count(*)') && lowerCode.includes('join')) {
        responseText = `Your JOIN connects customers to orders, but using \`COUNT(*)\` produces an inflated customer count because customers with multiple orders duplicate rows. Reconsider your aggregation to count unique users.`;
      } else {
        responseText = `Your query is grouping data, but make sure your SELECT clause includes both the cohort time bucket (e.g. \`DATE_TRUNC('week', created_at)\`) and \`plan_tier\` so the business team can isolate tier-specific attrition.`;
      }
    } else if (input.executionError) {
      responseText = `I noticed your last execution failed with: "${input.executionError}". Check clause order (SELECT -> FROM -> WHERE -> GROUP BY -> ORDER BY) and verify table column names in the Dataset Explorer.`;
    } else {
      if (isDba) {
        responseText = `In this scenario, we want to eliminate sequential scans on the 1.8M row table without taking table locks. Focus on identifying the leading columns in the WHERE clause: \`tenant_id\` and \`status\`.`;
      } else {
        responseText = `We are investigating why Q3 churn spiked by 18%. Look at the retention rates across \`free\`, \`pro\`, and \`enterprise\` tiers in Week 1 vs Week 4 to isolate which customer tier dropped off.`;
      }
    }

    return {
      response: responseText,
      hintLevel: hintLevelApplied,
      mentorRole,
      hintsUsedTotal: input.hintsUsedCount,
      isRefusal: false,
      guidanceTopic: 'Contextual Query Guidance',
    };
  }

  // 3. Progressive Hints (L1 - L5)
  if (input.requestedLevel) {
    if (isDba) {
      switch (input.requestedLevel) {
        case 1: responseText = 'What scan type is Postgres performing on the `tenant_id` and `status` predicates in EXPLAIN ANALYZE?'; break;
        case 2: responseText = 'A single-column index on `created_at` alone forces Postgres to read all rows before filtering by tenant. A composite index matches multiple predicates simultaneously.'; break;
        case 3: responseText = 'Create a composite B-Tree index with the exact leading order: `(tenant_id, status, created_at DESC)`.'; break;
        case 4: responseText = 'Pattern: `CREATE INDEX CONCURRENTLY idx_shipment_tenant_status_created ON shipment_events (tenant_id, status, created_at DESC);`'; break;
        case 5: responseText = 'Complete Explanation: `CREATE INDEX CONCURRENTLY` builds the index without exclusive table locks. Running `ANALYZE shipment_events;` immediately refreshes planner histograms to convert Seq Scan to an Index-Only scan.'; break;
      }
    } else {
      switch (input.requestedLevel) {
        case 1: responseText = 'What happens to the customer count when one customer has multiple orders in the same week?'; break;
        case 2: responseText = 'Think about the difference between counting rows (`COUNT(*)`) and counting unique customers (`COUNT(DISTINCT user_id)`).'; break;
        case 3: responseText = 'Group your dates using `DATE_TRUNC(\'week\', u.created_at)` and compute retention percentage as `ROUND(active_users * 100.0 / total_users, 2)`.'; break;
        case 4: responseText = 'Query Pattern:\nSELECT \n  DATE_TRUNC(\'week\', u.created_at) AS cohort_week,\n  u.plan_tier,\n  COUNT(DISTINCT u.user_id) AS total_users,\n  COUNT(DISTINCT o.user_id) AS active_users\nFROM users u LEFT JOIN orders o ON u.user_id = o.user_id\nGROUP BY 1, 2;'; break;
        case 5: responseText = 'Complete Solution Guide: Join users with orders on `user_id`, group by signup week and plan tier, and calculate retention dropoffs. Notice that the Pro tier experienced a 46% retention cliff between Week 1 and Week 4.'; break;
      }
    }
  }

  return {
    response: responseText,
    hintLevel: hintLevelApplied,
    mentorRole,
    hintsUsedTotal: input.hintsUsedCount + 1,
    isRefusal: false,
    guidanceTopic: `Progressive Hint L${hintLevelApplied}`,
  };
}
