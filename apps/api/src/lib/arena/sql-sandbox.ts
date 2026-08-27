import { createHash } from 'crypto';
import path from 'path';

let SQLInstance: any = null;

async function getSQLInstance() {
  if (!SQLInstance) {
    // Use dynamic require to avoid Webpack bundling issues with sql.js WASM
    const initSqlJs = eval('require')('sql.js');
    SQLInstance = await initSqlJs({
      locateFile: (file: string) => {
        return path.join(process.cwd(), 'node_modules/sql.js/dist', file);
      }
    });
  }
  return SQLInstance;
}

export interface SqlExecutionResult {
  success: boolean;
  queryHash: string;
  columns: string[];
  rows: Array<Record<string, any>>;
  rowCount: number;
  executionTimeMs: number;
  error?: {
    code: string;
    message: string;
    line?: number;
    column?: number;
  };
}

const FORBIDDEN_KEYWORDS = [
  'DROP', 'TRUNCATE', 'DELETE', 'UPDATE', 'ALTER', 'CREATE USER', 
  'GRANT', 'REVOKE', 'ATTACH', 'DETACH', 'PRAGMA', 'VACUUM', 'LOAD_EXTENSION'
];

// Comprehensive Sandbox Datasets for Arena Missions
export const SANDBOX_DATASETS: Record<string, { columns: string[]; rows: any[][] }> = {
  users: {
    columns: ['user_id', 'email', 'plan_tier', 'created_at', 'status'],
    rows: [
      ['usr_101', 'aarav@retail.io', 'pro', '2026-07-01 10:14:00', 'churned'],
      ['usr_102', 'meera@store.net', 'free', '2026-07-01 11:20:00', 'active'],
      ['usr_103', 'rohit@techcorp.in', 'enterprise', '2026-07-02 09:30:00', 'active'],
      ['usr_104', 'ananya@brands.co', 'pro', '2026-07-03 14:45:00', 'churned'],
      ['usr_105', 'vikram@shopline.com', 'pro', '2026-07-04 16:10:00', 'churned'],
      ['usr_106', 'siddharth@cloud.in', 'free', '2026-07-05 08:22:00', 'active'],
      ['usr_107', 'kavita@fintech.io', 'pro', '2026-07-06 13:40:00', 'churned'],
      ['usr_108', 'tanvi@hyper.net', 'enterprise', '2026-07-07 17:15:00', 'active'],
      ['usr_109', 'neha@apparel.com', 'free', '2026-07-08 10:05:00', 'active'],
      ['usr_110', 'rahul@matrix.org', 'pro', '2026-07-09 12:30:00', 'churned'],
      ['usr_111', 'divya@nexus.io', 'free', '2026-07-10 14:10:00', 'active'],
      ['usr_112', 'varun@urban.co', 'pro', '2026-07-11 16:45:00', 'churned'],
      ['usr_113', 'ishaan@core.net', 'enterprise', '2026-07-12 18:20:00', 'active'],
      ['usr_114', 'pooja@zenith.in', 'free', '2026-07-13 09:50:00', 'active'],
      ['usr_115', 'manish@bolt.io', 'pro', '2026-07-14 11:35:00', 'churned'],
    ],
  },
  orders: {
    columns: ['order_id', 'user_id', 'order_amount', 'order_date', 'payment_status'],
    rows: [
      ['ord_901', 'usr_101', 1499.00, '2026-07-05 12:00:00', 'paid'],
      ['ord_902', 'usr_103', 12500.00, '2026-07-08 15:30:00', 'paid'],
      ['ord_903', 'usr_104', 1499.00, '2026-07-10 18:20:00', 'paid'],
      ['ord_904', 'usr_102', 0.00, '2026-07-12 09:15:00', 'paid'],
      ['ord_905', 'usr_101', 1499.00, '2026-07-15 14:00:00', 'paid'],
      ['ord_906', 'usr_107', 1499.00, '2026-07-16 11:30:00', 'paid'],
      ['ord_907', 'usr_108', 12500.00, '2026-07-18 16:45:00', 'paid'],
      ['ord_908', 'usr_106', 0.00, '2026-07-20 10:10:00', 'paid'],
      ['ord_909', 'usr_110', 1499.00, '2026-07-22 13:25:00', 'paid'],
      ['ord_910', 'usr_113', 12500.00, '2026-07-25 15:50:00', 'paid'],
    ],
  },
  subscriptions: {
    columns: ['subscription_id', 'user_id', 'plan_tier', 'created_at', 'status', 'churned_at'],
    rows: [
      ['sub_01', 'usr_101', 'pro', '2026-07-01 10:00:00', 'churned', '2026-07-28 12:00:00'],
      ['sub_02', 'usr_102', 'free', '2026-07-01 11:00:00', 'active', null],
      ['sub_03', 'usr_103', 'enterprise', '2026-07-02 09:00:00', 'active', null],
      ['sub_04', 'usr_104', 'pro', '2026-07-03 14:00:00', 'churned', '2026-07-29 15:00:00'],
      ['sub_05', 'usr_105', 'pro', '2026-07-04 16:00:00', 'churned', '2026-07-30 18:00:00'],
      ['sub_06', 'usr_106', 'free', '2026-07-05 08:00:00', 'active', null],
      ['sub_07', 'usr_107', 'pro', '2026-07-06 13:00:00', 'churned', '2026-07-31 10:00:00'],
      ['sub_08', 'usr_108', 'enterprise', '2026-07-07 17:00:00', 'active', null],
      ['sub_09', 'usr_109', 'free', '2026-07-08 10:00:00', 'active', null],
      ['sub_10', 'usr_110', 'pro', '2026-07-09 12:00:00', 'churned', '2026-08-01 14:00:00'],
      ['sub_11', 'usr_111', 'free', '2026-07-10 14:00:00', 'active', null],
      ['sub_12', 'usr_112', 'pro', '2026-07-11 16:00:00', 'churned', '2026-08-02 11:00:00'],
      ['sub_13', 'usr_113', 'enterprise', '2026-07-12 18:00:00', 'active', null],
      ['sub_14', 'usr_114', 'free', '2026-07-13 09:00:00', 'active', null],
      ['sub_15', 'usr_115', 'pro', '2026-07-14 11:00:00', 'churned', '2026-08-03 16:00:00'],
    ],
  },
  invoice_events: {
    columns: ['invoice_id', 'subscription_id', 'user_id', 'amount', 'invoice_date', 'status'],
    rows: [
      ['inv_101', 'sub_01', 'usr_101', 1499.00, '2026-07-01 10:05:00', 'paid'],
      ['inv_102', 'sub_01', 'usr_101', 0.00, '2026-07-05 12:00:00', 'duplicate_event'],
      ['inv_103', 'sub_03', 'usr_103', 12500.00, '2026-07-02 09:05:00', 'paid'],
      ['inv_104', 'sub_04', 'usr_104', 1499.00, '2026-07-03 14:05:00', 'paid'],
      ['inv_105', 'sub_05', 'usr_105', 1499.00, '2026-07-04 16:05:00', 'paid'],
      ['inv_106', 'sub_07', 'usr_107', 1499.00, '2026-07-06 13:05:00', 'paid'],
      ['inv_107', 'sub_08', 'usr_108', 12500.00, '2026-07-07 17:05:00', 'paid'],
      ['inv_108', 'sub_10', 'usr_110', 1499.00, '2026-07-09 12:05:00', 'paid'],
      ['inv_109', 'sub_12', 'usr_112', 1499.00, '2026-07-11 16:05:00', 'paid'],
      ['inv_110', 'sub_13', 'usr_113', 12500.00, '2026-07-12 18:05:00', 'paid'],
    ],
  },
  sales_orders: {
    columns: ['order_id', 'rep_id', 'region', 'gross_revenue', 'discount_pct', 'cogs', 'created_at'],
    rows: [
      ['SO_501', 'REP_12', 'North', 850000.00, 28.50, 680000.00, '2026-07-05 10:00:00'],
      ['SO_502', 'REP_08', 'South', 340000.00, 4.00, 220000.00, '2026-07-08 11:30:00'],
      ['SO_503', 'REP_12', 'North', 1200000.00, 32.00, 980000.00, '2026-07-12 14:15:00'],
      ['SO_504', 'REP_19', 'West', 450000.00, 18.00, 390000.00, '2026-07-15 09:45:00'],
      ['SO_505', 'REP_05', 'East', 620000.00, 6.50, 410000.00, '2026-07-18 16:20:00'],
      ['SO_506', 'REP_12', 'North', 950000.00, 29.00, 740000.00, '2026-07-22 13:10:00'],
      ['SO_507', 'REP_08', 'South', 510000.00, 5.00, 330000.00, '2026-07-26 15:50:00'],
      ['SO_508', 'REP_19', 'West', 780000.00, 22.50, 640000.00, '2026-07-29 12:05:00'],
    ],
  },
  campaign_spend: {
    columns: ['channel', 'ad_spend', 'impressions', 'clicks', 'date'],
    rows: [
      ['Google Search', 650000.00, 420000, 31000, '2026-07-01'],
      ['Meta Ads', 850000.00, 1800000, 45000, '2026-07-01'],
      ['Influencer Affiliates', 400000.00, 900000, 12000, '2026-07-01'],
      ['Referral Program', 200000.00, 150000, 28000, '2026-07-01'],
    ],
  },
  shipment_events: {
    columns: ['shipment_id', 'tenant_id', 'status', 'carrier', 'created_at'],
    rows: [
      ['SHP_001', 'TNT_CORP_99', 'in_transit', 'BlueDart', '2026-07-01 10:00:00'],
      ['SHP_002', 'TNT_CORP_99', 'delivered', 'Delhivery', '2026-07-02 12:30:00'],
      ['SHP_003', 'TNT_CORP_99', 'in_transit', 'BlueDart', '2026-07-03 14:15:00'],
      ['SHP_004', 'TNT_CORP_12', 'delayed', 'FedEx', '2026-07-04 09:20:00'],
      ['SHP_005', 'TNT_CORP_99', 'in_transit', 'Delhivery', '2026-07-05 16:45:00'],
    ],
  }
};

/**
 * Transpiles PostgreSQL-specific syntax into SQLite/WASM compatible SQL
 * without changing the logical semantics of the user query.
 */
export function transpilePgToSqlite(sql: string): string {
  let res = sql;

  // 1. DATE_TRUNC expressions
  res = res.replace(/DATE_TRUNC\s*\(\s*['"]week['"]\s*,\s*([^)]+)\s*\)/gi, "strftime('%Y-W%W', $1)");
  res = res.replace(/DATE_TRUNC\s*\(\s*['"]month['"]\s*,\s*([^)]+)\s*\)/gi, "strftime('%Y-%m', $1)");
  res = res.replace(/DATE_TRUNC\s*\(\s*['"]day['"]\s*,\s*([^)]+)\s*\)/gi, "strftime('%Y-%m-%d', $1)");
  res = res.replace(/DATE_TRUNC\s*\(\s*['"]year['"]\s*,\s*([^)]+)\s*\)/gi, "strftime('%Y', $1)");
  res = res.replace(/DATE_TRUNC\s*\(\s*['"]hour['"]\s*,\s*([^)]+)\s*\)/gi, "strftime('%Y-%m-%d %H:00:00', $1)");

  // 2. Type Casts ::text, ::int, ::numeric, ::date, ::timestamp
  res = res.replace(/::\s*text\b/gi, '');
  res = res.replace(/::\s*(int|integer|bigint)\b/gi, '');
  res = res.replace(/::\s*(numeric|decimal|float|real)\b/gi, '');
  res = res.replace(/::\s*(date|timestamp|timestamptz)\b/gi, '');

  // 3. PostgreSQL ILIKE -> LIKE (SQLite LIKE is case-insensitive for ASCII)
  res = res.replace(/\bILIKE\b/gi, 'LIKE');

  // 4. NOW() / CURRENT_TIMESTAMP
  res = res.replace(/\bNOW\s*\(\s*\)/gi, "datetime('now')");

  // 5. INTERVAL '30 days' etc.
  res = res.replace(/INTERVAL\s*['"](\d+)\s*days?['"]/gi, "'+$1 days'");

  return res;
}

export async function executeSandboxSql(
  query: string,
  scenarioFamily = 'customer_churn'
): Promise<SqlExecutionResult> {
  const startTime = performance.now();
  const trimmed = query.trim();
  const queryHash = createHash('sha256').update(trimmed).digest('hex').slice(0, 16);

  // 1. Security Check
  const upper = trimmed.toUpperCase();
  for (const kw of FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(upper)) {
      return {
        success: false,
        queryHash,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        error: {
          code: 'SECURITY_VIOLATION',
          message: `Security Violation: Operational statement "${kw}" is disabled in the Analytics Workstation sandbox. Only read-only analytical queries (SELECT, WITH, JOIN, GROUP BY) are permitted.`,
        },
      };
    }
  }

  // 2. Syntax Validation Check (Incomplete clauses)
  if (
    upper.endsWith('WHERE') || 
    upper.endsWith('FROM') || 
    upper.endsWith('JOIN') || 
    upper.endsWith('ON') || 
    upper.endsWith('GROUP BY') || 
    upper.endsWith('ORDER BY') || 
    upper.endsWith('HAVING')
  ) {
    return {
      success: false,
      queryHash,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
      error: {
        code: 'SQL_SYNTAX_ERROR',
        message: `Syntax Error: Incomplete SQL clause near "${trimmed.slice(-8)}". Query terminates prematurely without expression or condition.`,
      },
    };
  }

  // 3. Isolated Sandbox Execution
  let db: any = null;
  try {
    const SQL = await getSQLInstance();
    db = new SQL.Database();

    // Create & Seed all sandbox tables in fresh isolated context
    for (const [tName, tDef] of Object.entries(SANDBOX_DATASETS)) {
      const colDefs = tDef.columns.map(c => `${c} TEXT`).join(', ');
      db.run(`CREATE TABLE ${tName} (${colDefs});`);
      const placeholders = tDef.columns.map(() => '?').join(', ');
      for (const r of tDef.rows) {
        db.run(`INSERT INTO ${tName} VALUES (${placeholders});`, r);
      }
    }

    const transpiledQuery = transpilePgToSqlite(trimmed);
    const execResult = db.exec(transpiledQuery);
    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

    if (execResult && execResult.length > 0) {
      const { columns, values } = execResult[0];
      const rows = values.map((valArr: any[]) => {
        const obj: Record<string, any> = {};
        columns.forEach((col: string, idx: number) => {
          obj[col] = valArr[idx];
        });
        return obj;
      });

      db.close();
      db = null;

      return {
        success: true,
        queryHash,
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs,
      };
    }

    db.close();
    db = null;

    return {
      success: true,
      queryHash,
      columns: ['result'],
      rows: [],
      rowCount: 0,
      executionTimeMs,
    };
  } catch (sqlErr: any) {
    if (db) {
      try { db.close(); } catch (_) {}
      db = null;
    }

    const errMsg = sqlErr?.message || String(sqlErr);
    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

    // Controlled SQL Error response
    return {
      success: false,
      queryHash,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs,
      error: {
        code: 'SQL_EXECUTION_ERROR',
        message: `Query Error: ${errMsg}`,
      },
    };
  }
}
