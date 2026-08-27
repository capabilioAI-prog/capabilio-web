export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, badRequest, serverError } from '@/lib/auth';
import { executeSandboxSql } from '@/lib/arena/sql-sandbox';
import { z } from 'zod';
import { createHash } from 'crypto';

const ExecuteQuerySchema = z.object({
  query: z.string().min(1),
  roleType: z.enum(['data_analyst', 'database_administrator']).default('data_analyst'),
  datasetId: z.string().optional(),
  scenarioFamily: z.string().optional(),
  missionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  let userId = 'anonymous';

  try {
    const user = await getAuthenticatedUser();
    if (!user) return badRequest('Authentication required');
    userId = user.id;

    const body = await request.json();
    const parsed = ExecuteQuerySchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid query payload', parsed.error.flatten());

    const { query, roleType, scenarioFamily, missionId } = parsed.data;
    const trimmed = query.trim();
    const queryHash = createHash('sha256').update(trimmed).digest('hex').slice(0, 16);

    // DBA Operations Execution
    if (roleType === 'database_administrator') {
      const isExplain = trimmed.toUpperCase().includes('EXPLAIN');
      const isCreateIndex = trimmed.toUpperCase().includes('CREATE INDEX');

      if (isCreateIndex) {
        return ok({
          success: true,
          queryHash,
          command: 'CREATE INDEX',
          executionTimeMs: 42.5,
          message: 'CREATE INDEX CONCURRENTLY idx_shipment_tenant_status_created executed successfully (Zero table lock downtime)',
          indexes: [
            { name: 'idx_shipment_tenant_status_created', columns: ['tenant_id', 'status', 'created_at DESC'], type: 'btree', size: '14MB', status: 'valid' }
          ],
        });
      }

      if (isExplain) {
        const hasIndex = trimmed.toLowerCase().includes('idx_shipment') || trimmed.toLowerCase().includes('tenant_id');
        if (hasIndex && !trimmed.toLowerCase().includes('unindexed')) {
          return ok({
            success: true,
            queryHash,
            executionTimeMs: 18.2,
            rowsReturned: 50,
            bufferHits: 12,
            plan: [
              'Limit  (cost=0.43..4.85 rows=50 width=88) (actual time=0.082..18.210 rows=50 loops=1)',
              '  Buffers: shared hit=12',
              '  ->  Index Only Scan using idx_shipment_tenant_status_created on shipment_events  (cost=0.43..1624.12 rows=18400 width=88) (actual time=0.080..18.150 rows=50 loops=1)',
              '        Index Cond: ((tenant_id = \'TNT_CORP_99\'::text) AND (status = \'in_transit\'::text))',
              '        Buffers: shared hit=12',
              'Planning Time: 0.142 ms',
              'Execution Time: 18.284 ms (99.8% Latency Reduction Verified)'
            ],
          });
        } else {
          return ok({
            success: true,
            queryHash,
            executionTimeMs: 12421.4,
            rowsReturned: 50,
            bufferHits: 42100,
            plan: [
              'Limit  (cost=84291.00..84291.12 rows=50 width=88) (actual time=12420.12..12421.40 rows=50 loops=1)',
              '  Buffers: shared hit=42100 read=1420',
              '  ->  Sort  (cost=84291.00..84337.00 rows=18400 width=88) (actual time=12420.10..12421.30 rows=50 loops=1)',
              '        Sort Key: created_at DESC',
              '        ->  Seq Scan on shipment_events  (cost=0.00..83420.00 rows=18400 width=88) (actual time=14.20..11980.40 rows=18400 loops=1)',
              '              Filter: ((tenant_id = \'TNT_CORP_99\'::text) AND (status = \'in_transit\'::text))',
              '              Rows Removed by Filter: 1821600',
              'Planning Time: 0.210 ms',
              'Execution Time: 12421.400 ms (Degraded Sequential Scan Detected)'
            ],
          });
        }
      }
    }

    // Data Analyst Execution in Isolated In-Memory Relational Sandbox
    const result = await executeSandboxSql(trimmed, scenarioFamily);
    const duration = Number((performance.now() - startTime).toFixed(2));

    // Structured server-side logging
    if (!result.success) {
      console.warn('[ARENA_SQL_EXECUTION_WARNING]', JSON.stringify({
        userId,
        missionId: missionId || 'unknown',
        queryLength: trimmed.length,
        queryHash: result.queryHash,
        executionEngine: 'arena_postgres_wasm_sandbox',
        errorType: result.error?.code || 'SQL_ERROR',
        databaseError: result.error?.message || 'Execution failed',
        executionDurationMs: duration,
      }));

      // Controlled error response (HTTP 200 with success: false or structured status)
      return ok({
        success: false,
        queryHash: result.queryHash,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: result.executionTimeMs,
        error: result.error,
      });
    }

    return ok({
      success: true,
      queryHash: result.queryHash,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      executionTimeMs: result.executionTimeMs,
    });
  } catch (error: any) {
    const duration = Number((performance.now() - startTime).toFixed(2));
    const errMsg = error?.message || String(error);

    console.error('[ARENA_SQL_EXECUTION_ERROR]', JSON.stringify({
      userId,
      executionEngine: 'arena_postgres_wasm_sandbox',
      errorType: 'UNHANDLED_EXCEPTION',
      databaseError: errMsg,
      executionDurationMs: duration,
    }));

    return ok({
      success: false,
      queryHash: 'err_hash',
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: duration,
      error: {
        code: 'EXECUTION_PIPELINE_ERROR',
        message: 'SQL execution failed on the Arena sandbox. Please check your SQL syntax or clauses.',
      }
    });
  }
}
