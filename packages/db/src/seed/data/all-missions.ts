export interface SeedMissionDefinition {
  roleSlug: string;
  title: string;
  slug: string;
  difficulty: 'entry' | 'mid' | 'senior' | 'lead';
  estimatedMinutes: number;
  company: {
    name: string;
    industry: string;
    size: string;
    description: string;
  };
  managerName: string;
  managerTitle: string;
  department: string;
  sprint: string;
  businessContext: string;
  problemStatement: string;
  requirements: Array<{
    id: string;
    description: string;
    isRequired: boolean;
    weight: number;
  }>;
  acceptanceCriteria: string[];
  evaluationCriteria: Array<{
    id: string;
    name: string;
    description: string;
    weight: number;
    evaluationType: 'deterministic' | 'ai_assisted' | 'artifact';
  }>;
  availableTools: string[];
  expectedDeliverable: string;
  referenceDocumentation: string;
  starterFiles: Record<string, string>;
  testCases: Array<{
    id: string;
    name: string;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    weight: number;
  }>;
  skillSlugs: string[];
}

export const allMissionsData: SeedMissionDefinition[] = [
  // 1. Software Engineer: Checkout Form Validation Regression
  {
    roleSlug: 'software-engineer',
    title: 'Checkout Conversion Drop — Investigate & Fix',
    slug: 'checkout-conversion-drop',
    difficulty: 'mid',
    estimatedMinutes: 45,
    company: {
      name: 'TechFlow',
      industry: 'E-commerce SaaS',
      size: 'Scaleup (120 engineers)',
      description: 'TechFlow powers high-volume checkout funnels for 2,000+ direct-to-consumer retailers globally.'
    },
    managerName: 'Sarah Chen',
    managerTitle: 'Engineering Manager',
    department: 'Checkout Platform',
    sprint: 'Sprint 42',
    businessContext: 'On Tuesday at 14:00 UTC, the analytics team detected a 23% drop in checkout conversion across desktop and mobile. User session recordings show shoppers clicking the "Complete Purchase" button repeatedly with no response, while some users report card validation errors despite entering valid 16-digit cards.',
    problemStatement: 'PR #891 introduced regressions in `useFormValidation.ts`: (1) the card number regex was updated to require hyphens rather than accepting space-separated cards, and (2) the `isValid` boolean condition was inadvertently inverted (`errors.length > 0`).',
    requirements: [
      { id: 'req-1', description: 'Update cardNumber regex to accept 16-digit cards formatted with spaces or hyphens.', isRequired: true, weight: 35 },
      { id: 'req-2', description: 'Fix the isValid boolean so the form is valid when there are zero errors.', isRequired: true, weight: 35 },
      { id: 'req-3', description: 'Author an engineering post-mortem note in ENGINEERING_NOTE.md detailing the root cause.', isRequired: true, weight: 30 },
    ],
    acceptanceCriteria: [
      'Valid form data returns isValid=true and errorCount=0',
      'Space-separated card numbers (1234 5678 9012 3456) pass validation',
      'Empty form returns isValid=false with all validation error keys populated',
      'All automated unit test cases pass with 100% assertions satisfied'
    ],
    evaluationCriteria: [
      { id: 'crit-1', name: 'Deterministic Test Suite Pass', description: 'All unit test cases in test matrix pass', weight: 60, evaluationType: 'deterministic' },
      { id: 'crit-2', name: 'Card Formatting Edge Cases', description: 'Supports standard space and hyphen formats', weight: 20, evaluationType: 'deterministic' },
      { id: 'crit-3', name: 'Engineering Root Cause Analysis', description: 'Clear explanation in ENGINEERING_NOTE.md', weight: 20, evaluationType: 'ai_assisted' },
    ],
    availableTools: ['TypeScript Compiler', 'Monaco IDE', 'Unit Test Runner', 'AI Staff Mentor'],
    expectedDeliverable: 'Fixed useFormValidation.ts passing 100% of test assertions and updated ENGINEERING_NOTE.md.',
    referenceDocumentation: 'Payment form standard: 16 digits formatted as 4-4-4-4 with space or hyphen delimiter. Form valid when error map is empty.',
    starterFiles: {
      'src/hooks/useFormValidation.ts': `import { useMemo } from 'react';

interface FormData {
  fullName: string;
  email: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

interface ValidationErrors {
  fullName?: string;
  email?: string;
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
}

interface ValidationResult {
  errors: ValidationErrors;
  isValid: boolean;
}

export function useFormValidation(formData: FormData): ValidationResult {
  const errors: ValidationErrors = {};

  if (!formData.fullName || formData.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  }

  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!formData.email || !emailRegex.test(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // BUG 1: Requires hyphens only, but placeholder displays spaces
  const cardRegex = /^\\d{4}-\\d{4}-\\d{4}-\\d{4}$/;
  if (!formData.cardNumber || !cardRegex.test(formData.cardNumber)) {
    errors.cardNumber = 'Please enter a valid 16-digit card number';
  }

  const expiryRegex = /^(0[1-9]|1[0-2])\\/\\d{2}$/;
  if (!formData.expiry || !expiryRegex.test(formData.expiry)) {
    errors.expiry = 'Please enter a valid expiry date (MM/YY)';
  }

  const cvvRegex = /^\\d{3}$/;
  if (!formData.cvv || !cvvRegex.test(formData.cvv)) {
    errors.cvv = 'CVV must be 3 digits';
  }

  // BUG 2: Inverted logic (true when errors exist)
  const isValid = Object.keys(errors).length > 0;

  return { errors, isValid };
}
`,
      'src/components/CheckoutForm.tsx': `import React, { useState } from 'react';
import { useFormValidation } from '../hooks/useFormValidation';

export function CheckoutForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });

  const { errors, isValid } = useFormValidation(formData);

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Complete Payment</h2>
      <button disabled={!isValid} className="w-full py-2 bg-brand text-white rounded font-bold disabled:opacity-50">
        Complete Purchase
      </button>
    </div>
  );
}
`,
      'src/hooks/useFormValidation.test.ts': `import { useFormValidation } from './useFormValidation';

// Unit Test Suite for Checkout Form Validation
// Tests space-separated cards, error counts, and isValid logic.
`,
      'ENGINEERING_NOTE.md': `# Engineering Note — Sprint 42 Checkout Investigation
**Engineer:** Alex Chen
**Ticket:** PROD-4821

## Summary of Findings
Investigate why isValid boolean and card regex caused conversion drops.
`
    },
    testCases: [
      {
        id: 'tc-1',
        name: 'Valid form data returns isValid=true',
        input: JSON.stringify({ fullName: 'John Smith', email: 'john@example.com', cardNumber: '1234 5678 9012 3456', expiry: '12/25', cvv: '123' }),
        expectedOutput: JSON.stringify({ isValid: true, errorCount: 0 }),
        isHidden: false,
        weight: 20
      },
      {
        id: 'tc-2',
        name: 'Invalid email returns isValid=false and email error',
        input: JSON.stringify({ fullName: 'John Smith', email: 'bad-email', cardNumber: '1234 5678 9012 3456', expiry: '12/25', cvv: '123' }),
        expectedOutput: JSON.stringify({ isValid: false, hasEmailError: true }),
        isHidden: false,
        weight: 15
      },
      {
        id: 'tc-3',
        name: 'Short name returns isValid=false and name error',
        input: JSON.stringify({ fullName: 'A', email: 'john@example.com', cardNumber: '1234 5678 9012 3456', expiry: '12/25', cvv: '123' }),
        expectedOutput: JSON.stringify({ isValid: false, hasNameError: true }),
        isHidden: false,
        weight: 15
      },
      {
        id: 'tc-4',
        name: 'Space-separated 16-digit card number is valid',
        input: JSON.stringify({ fullName: 'John Smith', email: 'john@example.com', cardNumber: '1234 5678 9012 3456', expiry: '12/25', cvv: '123' }),
        expectedOutput: JSON.stringify({ isValid: true, hasCardError: false }),
        isHidden: false,
        weight: 20
      },
      {
        id: 'tc-5',
        name: 'Invalid CVV returns isValid=false and cvv error',
        input: JSON.stringify({ fullName: 'John Smith', email: 'john@example.com', cardNumber: '1234 5678 9012 3456', expiry: '12/25', cvv: '12' }),
        expectedOutput: JSON.stringify({ isValid: false, hasCvvError: true }),
        isHidden: false,
        weight: 15
      },
      {
        id: 'tc-6',
        name: 'Empty form has all errors',
        input: JSON.stringify({ fullName: '', email: '', cardNumber: '', expiry: '', cvv: '' }),
        expectedOutput: JSON.stringify({ isValid: false, errorCount: 5 }),
        isHidden: true,
        weight: 15
      },
    ],
    skillSlugs: ['typescript', 'react', 'debugging', 'testing', 'tech-communication']
  },

  // 2. Frontend Developer: Responsive Pricing Component & Accessibility
  {
    roleSlug: 'frontend-developer',
    title: 'Responsive Pricing Table & A11y Toggle',
    slug: 'responsive-pricing-table',
    difficulty: 'entry',
    estimatedMinutes: 40,
    company: {
      name: 'FinFlow Cloud',
      industry: 'Fintech / Payments',
      size: 'Series B (65 engineers)',
      description: 'FinFlow provides cross-border billing infrastructures for software companies.'
    },
    managerName: 'Marcus Vance',
    managerTitle: 'Lead Frontend Architect',
    department: 'Growth Engineering',
    sprint: 'Sprint 18',
    businessContext: 'The growth team noticed that on mobile devices, the pricing tier cards overlap horizontally and the annual/monthly billing toggle is inaccessible to screen readers and keyboard tab navigation.',
    problemStatement: 'Implement a responsive pricing tier calculator and ensure annual billing calculates a 20% discount cleanly with proper ARIA attributes.',
    requirements: [
      { id: 'fe-1', description: 'Implement calculateAnnualPrice(monthlyPrice, discountPercent) returning the rounded discounted price.', isRequired: true, weight: 40 },
      { id: 'fe-2', description: 'Add accessible toggle state and keyboard support in PricingToggle.tsx.', isRequired: true, weight: 30 },
      { id: 'fe-3', description: 'Author unit test assertions for annual pricing math.', isRequired: true, weight: 30 },
    ],
    acceptanceCriteria: [
      'calculateAnnualPrice(50, 20) returns 40',
      'calculateAnnualPrice(100, 15) returns 85',
      'Discount calculation handles 0% and invalid inputs gracefully'
    ],
    evaluationCriteria: [
      { id: 'fe-crit-1', name: 'Pricing Math Accuracy', description: 'Deterministic verification of discount calculation', weight: 70, evaluationType: 'deterministic' },
      { id: 'fe-crit-2', name: 'Accessibility Standards', description: 'ARIA role and keyboard toggle compliance', weight: 30, evaluationType: 'deterministic' },
    ],
    availableTools: ['React', 'Tailwind CSS', 'Vitest', 'Chrome DevTools'],
    expectedDeliverable: 'Fixed calculatePricing.ts and accessible PricingToggle.tsx.',
    referenceDocumentation: 'Annual billing formula: monthlyPrice * (1 - discountPercent / 100). All interactive elements require role="switch" and aria-checked.',
    starterFiles: {
      'src/utils/calculatePricing.ts': `export function calculateAnnualPrice(monthlyPrice: number, discountPercent: number = 20): number {
  if (monthlyPrice <= 0) return 0;
  // BUG: Subtracts discountPercent directly instead of multiplying ratio
  const discounted = monthlyPrice - discountPercent;
  return Math.round(discounted);
}
`,
      'src/components/PricingToggle.tsx': `import React from 'react';

interface Props {
  isAnnual: boolean;
  onToggle: () => void;
}

export function PricingToggle({ isAnnual, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={isAnnual}
      className="px-4 py-2 bg-graphite-100 rounded-full text-xs font-semibold"
    >
      {isAnnual ? 'Billed Annually (Save 20%)' : 'Billed Monthly'}
    </button>
  );
}
`,
      'ENGINEERING_NOTE.md': `# Pricing Component Refactor
**Engineer:** Frontend Developer
`
    },
    testCases: [
      {
        id: 'fe-tc-1',
        name: 'Calculates 20% discount on $50/mo plan ($40)',
        input: JSON.stringify({ monthlyPrice: 50, discountPercent: 20 }),
        expectedOutput: JSON.stringify({ annualMonthlyPrice: 40 }),
        isHidden: false,
        weight: 35
      },
      {
        id: 'fe-tc-2',
        name: 'Calculates 15% discount on $100/mo plan ($85)',
        input: JSON.stringify({ monthlyPrice: 100, discountPercent: 15 }),
        expectedOutput: JSON.stringify({ annualMonthlyPrice: 85 }),
        isHidden: false,
        weight: 35
      },
      {
        id: 'fe-tc-3',
        name: 'Handles 0% discount plan ($120)',
        input: JSON.stringify({ monthlyPrice: 120, discountPercent: 0 }),
        expectedOutput: JSON.stringify({ annualMonthlyPrice: 120 }),
        isHidden: true,
        weight: 30
      }
    ],
    skillSlugs: ['html-css', 'react-components', 'tailwind-css', 'accessibility', 'client-state']
  },

  // 3. Backend Developer: API Rate Limiting & Auth Middleware
  {
    roleSlug: 'backend-developer',
    title: 'API Rate Limiting & Auth Middleware',
    slug: 'rate-limiting-auth-middleware',
    difficulty: 'mid',
    estimatedMinutes: 50,
    company: {
      name: 'AuthGuard Cloud',
      industry: 'Cybersecurity / Auth Infrastructure',
      size: 'Scaleup (80 engineers)',
      description: 'AuthGuard provides API gateway token validation and rate limiting for enterprise microservices.'
    },
    managerName: 'Vikram Patel',
    managerTitle: 'Staff Backend Architect',
    department: 'API Gateway Team',
    sprint: 'Sprint 27',
    businessContext: 'A spike in malicious bot traffic caused unauthenticated request floods to overwhelm backend worker pools. We need a sliding window rate limiter middleware that blocks IPs exceeding 100 requests per minute and rejects invalid JWT tokens.',
    problemStatement: 'The current rate limiter in `rateLimiter.ts` fails to expire timestamps properly and permits requests with missing Authorization headers.',
    requirements: [
      { id: 'be-1', description: 'Implement checkRateLimit(ip, maxRequests, windowMs) sliding window counter.', isRequired: true, weight: 40 },
      { id: 'be-2', description: 'Validate Bearer token format and return 401 when missing or malformed.', isRequired: true, weight: 30 },
      { id: 'be-3', description: 'Include X-RateLimit-Remaining headers in response map.', isRequired: true, weight: 30 },
    ],
    acceptanceCriteria: [
      'First request returns allowed=true with remaining=99',
      'Requests exceeding limit return allowed=false with status 429',
      'Expired window timestamps are purged from the memory store'
    ],
    evaluationCriteria: [
      { id: 'be-crit-1', name: 'Rate Limiter Algorithm', description: 'Sliding window timestamp accuracy', weight: 60, evaluationType: 'deterministic' },
      { id: 'be-crit-2', name: 'Auth Token Enforcement', description: 'Bearer header inspection', weight: 40, evaluationType: 'deterministic' },
    ],
    availableTools: ['Node.js', 'Express', 'JWT', 'Vitest'],
    expectedDeliverable: 'Fixed rateLimiter.ts with robust sliding window enforcement and unit tests.',
    referenceDocumentation: 'Rate limiter specification: maintain timestamp array per IP; filter items within Date.now() - windowMs. Block when length > maxRequests.',
    starterFiles: {
      'src/middleware/rateLimiter.ts': `interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  statusCode: number;
}

const requestStore = new Map<string, number[]>();

export function checkRateLimit(
  ip: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const timestamps = requestStore.get(ip) || [];

  // BUG: Does not filter timestamps older than windowMs
  timestamps.push(now);
  requestStore.set(ip, timestamps);

  const allowed = timestamps.length <= maxRequests;
  const remaining = Math.max(0, maxRequests - timestamps.length);

  return {
    allowed,
    remaining,
    statusCode: allowed ? 200 : 429
  };
}
`,
      'ENGINEERING_NOTE.md': `# Rate Limiting Middleware Analysis
`
    },
    testCases: [
      {
        id: 'be-tc-1',
        name: 'Allows requests within threshold (remaining decrements)',
        input: JSON.stringify({ ip: '192.168.1.1', maxRequests: 5, requestsToSend: 3 }),
        expectedOutput: JSON.stringify({ allowed: true, remaining: 2, statusCode: 200 }),
        isHidden: false,
        weight: 50
      },
      {
        id: 'be-tc-2',
        name: 'Blocks requests exceeding threshold with HTTP 429',
        input: JSON.stringify({ ip: '10.0.0.1', maxRequests: 3, requestsToSend: 4 }),
        expectedOutput: JSON.stringify({ allowed: false, remaining: 0, statusCode: 429 }),
        isHidden: false,
        weight: 50
      }
    ],
    skillSlugs: ['nodejs', 'backend-rest', 'auth-security', 'input-validation', 'logging']
  },

  // 4. Database Administrator: Slow Query Indexing & Query Plan Optimization
  {
    roleSlug: 'database-administrator',
    title: 'Slow Query Indexing & Query Plan Optimization',
    slug: 'slow-query-indexing-audit',
    difficulty: 'mid',
    estimatedMinutes: 45,
    company: {
      name: 'DataScale Systems',
      industry: 'Enterprise Data Platform',
      size: 'Series C (150 engineers)',
      description: 'DataScale manages analytical database clusters processing 50M transactions daily.'
    },
    managerName: 'Daniel Thorne',
    managerTitle: 'Principal Database Architect',
    department: 'Database Operations',
    sprint: 'Sprint 34',
    businessContext: 'During peak morning hours, the orders search endpoint latency spiked from 45ms to 2,800ms. Database CPU hit 92% due to repeated sequential table scans on the 4-million row `orders` table.',
    problemStatement: 'The `orders` query filters by `customer_id`, `status = "completed"`, and orders by `created_at DESC`. Without a composite index, Postgres must scan all 4M rows.',
    requirements: [
      { id: 'dba-1', description: 'Write optimized PostgreSQL CREATE INDEX statement with correct column order.', isRequired: true, weight: 50 },
      { id: 'dba-2', description: 'Include partial filter index WHERE status = "completed" to save 60% disk index size.', isRequired: true, weight: 30 },
      { id: 'dba-3', description: 'Document EXPLAIN ANALYZE cost improvements in audit memo.', isRequired: true, weight: 20 },
    ],
    acceptanceCriteria: [
      'Index statement contains customer_id, created_at DESC',
      'Uses CREATE INDEX CONCURRENTLY to avoid production table locks',
      'Execution plan cost drops from 125,000+ cost units to < 50 cost units'
    ],
    evaluationCriteria: [
      { id: 'dba-crit-1', name: 'Index Syntax & Column Ordering', description: 'Composite B-Tree index structure', weight: 60, evaluationType: 'deterministic' },
      { id: 'dba-crit-2', name: 'Lock Prevention (CONCURRENTLY)', description: 'Safe online index creation flag', weight: 40, evaluationType: 'deterministic' },
    ],
    availableTools: ['PostgreSQL', 'EXPLAIN ANALYZE', 'SQL Console'],
    expectedDeliverable: 'Optimized schema_index.sql script and engineering performance memo.',
    referenceDocumentation: 'Postgres indexing rule: Equality columns first (customer_id), followed by range/sort columns (created_at DESC). Use CONCURRENTLY in production.',
    starterFiles: {
      'schema_index.sql': `-- Production Index Optimization Script
-- Target Table: orders (4,200,000 rows)
-- Query: SELECT id, total, created_at FROM orders WHERE customer_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 20;

-- TODO: Replace the unindexed query with an optimized composite partial index:
CREATE INDEX idx_orders_customer_created 
ON orders (customer_id, created_at DESC) 
WHERE status = 'completed';
`,
      'ENGINEERING_NOTE.md': `# Database Performance Audit
**Target:** orders table query latency
`
    },
    testCases: [
      {
        id: 'dba-tc-1',
        name: 'Contains composite index on customer_id and created_at',
        input: JSON.stringify({ checkType: 'columns' }),
        expectedOutput: JSON.stringify({ hasCustomerId: true, hasCreatedAt: true, hasStatusFilter: true }),
        isHidden: false,
        weight: 50
      },
      {
        id: 'dba-tc-2',
        name: 'Uses partial index condition to minimize storage overhead',
        input: JSON.stringify({ checkType: 'partial_index' }),
        expectedOutput: JSON.stringify({ isPartialIndex: true }),
        isHidden: false,
        weight: 50
      }
    ],
    skillSlugs: ['query-optimization', 'indexing-architecture', 'explain-analyze', 'schema-design', 'concurrency-locks']
  },

  // 5. ML / AI Engineer: Customer Churn Classification & F1 Metric Tuning
  {
    roleSlug: 'ml-ai-engineer',
    title: 'Customer Churn Classification & F1 Metric Tuning',
    slug: 'churn-prediction-pipeline',
    difficulty: 'mid',
    estimatedMinutes: 50,
    company: {
      name: 'PredictAI Labs',
      industry: 'Applied Machine Learning',
      size: 'Growth Stage (40 engineers)',
      description: 'PredictAI builds automated predictive intelligence models for B2B subscription software.'
    },
    managerName: 'Dr. Aris Thorne',
    managerTitle: 'Head of Applied Machine Learning',
    department: 'Predictive Modeling',
    sprint: 'Sprint 29',
    businessContext: 'The marketing team needs an accurate customer churn predictor. With an imbalanced dataset (only 12% churn rate), the previous model achieved 88% raw accuracy simply by predicting non-churn for everyone, resulting in a disastrous 0.00 Recall and missing 100% of churners.',
    problemStatement: 'Write a Python data preprocessing and evaluation function `calculate_classification_metrics(y_true, y_pred)` that computes Precision, Recall, and F1-Score accurately.',
    requirements: [
      { id: 'ml-1', description: 'Implement calculate_classification_metrics computing True Positives, False Positives, False Negatives.', isRequired: true, weight: 40 },
      { id: 'ml-2', description: 'Calculate F1-score = 2 * (Precision * Recall) / (Precision + Recall).', isRequired: true, weight: 30 },
      { id: 'ml-3', description: 'Handle zero division edge cases when no positive predictions occur.', isRequired: true, weight: 30 },
    ],
    acceptanceCriteria: [
      'Precision and Recall calculated accurately against ground truth vectors',
      'F1 score accurately reflects harmonic mean',
      'Zero division returns 0.0 without throwing unhandled exceptions'
    ],
    evaluationCriteria: [
      { id: 'ml-crit-1', name: 'Classification Metric Formulas', description: 'Mathematical precision of F1, Precision, Recall', weight: 70, evaluationType: 'deterministic' },
      { id: 'ml-crit-2', name: 'Imbalance Edge Cases', description: 'Handling zero positive predictions', weight: 30, evaluationType: 'deterministic' },
    ],
    availableTools: ['Python', 'Pandas', 'NumPy', 'Scikit-Learn'],
    expectedDeliverable: 'Fixed metrics.py pipeline with tested F1 evaluation.',
    referenceDocumentation: 'F1 Score = 2 * (Precision * Recall) / (Precision + Recall). Precision = TP / (TP + FP). Recall = TP / (TP + FN).',
    starterFiles: {
      'metrics.py': `def calculate_classification_metrics(y_true, y_pred):
    """
    Computes precision, recall, and F1-score for binary classification.
    """
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    return {
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1_score": round(f1, 3)
    }
`,
      'ENGINEERING_NOTE.md': `# ML Model Evaluation Retrospective
`
    },
    testCases: [
      {
        id: 'ml-tc-1',
        name: 'Calculates correct precision, recall, and F1 on standard predictions',
        input: JSON.stringify({ y_true: [1, 0, 1, 1, 0, 1, 0, 0], y_pred: [1, 0, 1, 0, 0, 1, 1, 0] }),
        expectedOutput: JSON.stringify({ precision: 0.75, recall: 0.75, f1_score: 0.75 }),
        isHidden: false,
        weight: 50
      },
      {
        id: 'ml-tc-2',
        name: 'Handles zero positive predictions without division error',
        input: JSON.stringify({ y_true: [1, 1, 1], y_pred: [0, 0, 0] }),
        expectedOutput: JSON.stringify({ precision: 0.0, recall: 0.0, f1_score: 0.0 }),
        isHidden: false,
        weight: 50
      }
    ],
    skillSlugs: ['python-data', 'feature-engineering', 'scikit-learn', 'ml-metrics', 'ml-inference']
  },

  // 6. Cybersecurity Analyst: SOC Incident Triage & IOC Correlation
  {
    roleSlug: 'cybersecurity-analyst',
    title: 'Brute Force & Credential Stuffing IOC Triage',
    slug: 'brute-force-ioc-investigation',
    difficulty: 'entry',
    estimatedMinutes: 40,
    company: {
      name: 'SecOps Defense Cloud',
      industry: 'Managed Security Operations',
      size: 'Enterprise (220 security engineers)',
      description: 'SecOps Defense delivers 24/7 SIEM monitoring and threat hunting for Fortune 500 clients.'
    },
    managerName: 'Katarina Novak',
    managerTitle: 'SOC Incident Commander',
    department: 'Threat Detection & Response',
    sprint: 'Incident INC-9042',
    businessContext: 'At 03:15 UTC, the SIEM triggered high-severity alerts for credential stuffing targeting the customer login portal. Thousands of authentication attempts failed with HTTP 401 across distributed IP addresses, followed by two successful logins on executive accounts.',
    problemStatement: 'Parse the web authentication access log, extract malicious IP addresses attempting > 5 failed logins within the attack window, and identify compromised user accounts.',
    requirements: [
      { id: 'sec-1', description: 'Implement parse_security_logs to extract attacking IPs with failure counts.', isRequired: true, weight: 40 },
      { id: 'sec-2', description: 'Identify compromised usernames that had failed attempts followed by HTTP 200 from the same attacker IP.', isRequired: true, weight: 35 },
      { id: 'sec-3', description: 'Draft containment recommendation memo (IP block & forced session revocation).', isRequired: true, weight: 25 },
    ],
    acceptanceCriteria: [
      'Correctly extracts attacker IP addresses exceeding threshold',
      'Identifies compromised usernames precisely',
      'Produces structured incident JSON payload'
    ],
    evaluationCriteria: [
      { id: 'sec-crit-1', name: 'Attacker IP Extraction', description: 'Accurate IP list matching log telemetry', weight: 60, evaluationType: 'deterministic' },
      { id: 'sec-crit-2', name: 'Threat Containment Action', description: 'Incident response remediation accuracy', weight: 40, evaluationType: 'deterministic' },
    ],
    availableTools: ['SIEM Log Analyzer', 'IOC Parser', 'Linux Terminal'],
    expectedDeliverable: 'Completed log_parser.py and incident report memo.',
    referenceDocumentation: 'Log format: TIMESTAMP IP_ADDRESS STATUS_CODE USERNAME. Attacker threshold = 5+ 401s.',
    starterFiles: {
      'log_parser.py': `def analyze_auth_logs(log_entries, threshold=5):
    """
    Parses security logs to extract malicious IPs and compromised accounts.
    """
    fail_counts = {}
    compromised = []
    attacker_ips = []
    
    for entry in log_entries:
        ip = entry.get("ip")
        status = entry.get("status")
        username = entry.get("username")
        
        if status == 401:
            fail_counts[ip] = fail_counts.get(ip, 0) + 1
        elif status == 200 and fail_counts.get(ip, 0) >= threshold:
            if username not in compromised:
                compromised.append(username)
                
    for ip, count in fail_counts.items():
        if count >= threshold:
            attacker_ips.append(ip)
            
    return {
        "attacker_ips": attacker_ips,
        "compromised_accounts": compromised,
        "threat_severity": "HIGH" if compromised else "MEDIUM"
    }
`,
      'INCIDENT_REPORT.md': `# SOC Incident Report: INC-9042
**Analyst:** Security Analyst
`
    },
    testCases: [
      {
        id: 'sec-tc-1',
        name: 'Extracts attacker IP exceeding threshold and detects compromised account',
        input: JSON.stringify({
          logs: [
            { ip: '198.51.100.4', status: 401, username: 'admin' },
            { ip: '198.51.100.4', status: 401, username: 'admin' },
            { ip: '198.51.100.4', status: 401, username: 'admin' },
            { ip: '198.51.100.4', status: 401, username: 'admin' },
            { ip: '198.51.100.4', status: 401, username: 'admin' },
            { ip: '198.51.100.4', status: 200, username: 'admin' },
            { ip: '192.0.2.1', status: 200, username: 'john' }
          ]
        }),
        expectedOutput: JSON.stringify({
          attacker_ips: ['198.51.100.4'],
          compromised_accounts: ['admin'],
          threat_severity: 'HIGH'
        }),
        isHidden: false,
        weight: 100
      }
    ],
    skillSlugs: ['log-analysis', 'ioc-detection', 'incident-response', 'owasp-top10', 'security-reporting']
  },

  // 7. DevOps Engineer: Dockerfile Multi-Stage Optimization
  {
    roleSlug: 'devops-engineer',
    title: 'Container Layer Optimization & Port Exposure',
    slug: 'devops-dockerfile-layer-optimization',
    difficulty: 'entry',
    estimatedMinutes: 25,
    company: {
      name: 'CloudScale Systems',
      industry: 'Cloud Platform & Infrastructure',
      size: 'Scaleup (110 engineers)',
      description: 'CloudScale provides Kubernetes cluster automation and container image optimization.'
    },
    managerName: 'Kavita Rao',
    managerTitle: 'Director of Platform Engineering',
    department: 'DevOps & CI/CD',
    sprint: 'Sprint 15',
    businessContext: 'Our Node.js service container image is bloated because development build tooling is bundled into production.',
    problemStatement: 'Structure a multi-stage Dockerfile with builder and runner stages using alpine base images, copy only dist and prod dependencies, and expose port 3000.',
    requirements: [
      { id: 'req-1', description: 'Define builder and runner stages.', isRequired: true, weight: 50 },
      { id: 'req-2', description: 'Set NODE_ENV=production and expose port 3000.', isRequired: true, weight: 50 },
    ],
    acceptanceCriteria: [
      'Dockerfile contains FROM node:20-alpine AS builder and runner',
      'Exposes port 3000 with CMD [\"node\", \"dist/index.js\"]'
    ],
    evaluationCriteria: [
      { id: 'crit-1', name: 'Dockerfile Multi-Stage Verification', description: 'Valid multi-stage structure', weight: 100, evaluationType: 'deterministic' }
    ],
    availableTools: ['Docker', 'Alpine Linux', 'Node.js'],
    expectedDeliverable: 'Optimized Dockerfile.',
    referenceDocumentation: 'Multi-stage Docker builds reduce image footprint.',
    starterFiles: {
      'Dockerfile': `# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
`
    },
    testCases: [
      {
        id: 'devops-tc-1',
        name: 'Dockerfile multi-stage stages present',
        input: 'builder',
        expectedOutput: 'builder',
        isHidden: false,
        weight: 100
      }
    ],
    skillSlugs: ['docker-containers', 'cicd-pipelines', 'linux-shell', 'deploy-troubleshooting']
  },

  // 8. Full Stack Developer: Feedback Submission Pipeline
  {
    roleSlug: 'full-stack-developer',
    title: 'Customer Feedback Submission Pipeline',
    slug: 'fullstack-feedback-submission',
    difficulty: 'entry',
    estimatedMinutes: 25,
    company: {
      name: 'PulseMetrics SaaS',
      industry: 'Product Telemetry',
      size: 'Scaleup (90 engineers)',
      description: 'Customer feedback and in-app sentiment collection platform.'
    },
    managerName: 'Clara Oswald',
    managerTitle: 'Full Stack Engineering Lead',
    department: 'Product Growth',
    sprint: 'Sprint 21',
    businessContext: 'We need an end-to-end feedback processor that validates client submissions and formats database records.',
    problemStatement: 'Implement validateAndFormatFeedback(rating, comment, userId). Rating must be 1-5, comment >= 10 chars. Return sentiment (positive for >=4, neutral for 3, negative for <=2).',
    requirements: [
      { id: 'req-1', description: 'Validate rating (1-5) and comment (>=10 chars).', isRequired: true, weight: 50 },
      { id: 'req-2', description: 'Format record with sentiment classification.', isRequired: true, weight: 50 },
    ],
    acceptanceCriteria: [
      'Valid feedback returns { success: true, sentiment: \"positive\" }',
      'Short comments return { success: false, error: \"...\" }'
    ],
    evaluationCriteria: [
      { id: 'crit-1', name: 'Deterministic Full Stack Validation', description: 'All test cases pass', weight: 100, evaluationType: 'deterministic' }
    ],
    availableTools: ['TypeScript', 'Node.js', 'React'],
    expectedDeliverable: 'Completed src/feedbackService.ts.',
    referenceDocumentation: 'Feedback validation spec: 1-5 rating, >=10 char comment.',
    starterFiles: {
      'src/feedbackService.ts': `export function validateAndFormatFeedback(rating: number, comment: string, userId: string) {
  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' };
  }
  if (!comment || comment.trim().length < 10) {
    return { success: false, error: 'Comment must be at least 10 characters' };
  }

  let sentiment = 'neutral';
  if (rating >= 4) sentiment = 'positive';
  else if (rating <= 2) sentiment = 'negative';

  return {
    success: true,
    data: {
      userId,
      sentiment,
      score: rating
    }
  };
}
`
    },
    testCases: [
      {
        id: 'fs-tc-1',
        name: 'Valid positive rating',
        input: JSON.stringify({ rating: 5, comment: 'The platform is intuitive and fast!', userId: 'u-101' }),
        expectedOutput: JSON.stringify({ success: true, data: { userId: 'u-101', sentiment: 'positive', score: 5 } }),
        isHidden: false,
        weight: 100
      }
    ],
    skillSlugs: ['fs-typescript', 'nextjs-fs', 'postgres-fs', 'form-pipelines']
  },

  // 9. Data Analyst: MRR & ARPU Calculation Query
  {
    roleSlug: 'data-analyst',
    title: 'Monthly Recurring Revenue (MRR) & Cohort Metrics',
    slug: 'da-mrr-arpu-kpi',
    difficulty: 'entry',
    estimatedMinutes: 20,
    company: {
      name: 'SaaSMetrics Analytics',
      industry: 'B2B Business Intelligence',
      size: 'Scaleup (75 engineers)',
      description: 'Analytics platform delivering subscription intelligence to SaaS CFOs.'
    },
    managerName: 'Rachel Green',
    managerTitle: 'VP of Analytics',
    department: 'Revenue BI',
    sprint: 'Sprint 10',
    businessContext: 'The executive team needs a verified SQL query computing Monthly Recurring Revenue (MRR) and ARPU across active subscriptions.',
    problemStatement: 'Write an SQL query calculating sum(plan_amount) AS total_mrr, count(id) AS active_subscribers, and round(sum(plan_amount) / count(id), 2) AS arpu from subscriptions where status = \'active\'.',
    requirements: [
      { id: 'req-1', description: 'Filter status = \'active\'.', isRequired: true, weight: 40 },
      { id: 'req-2', description: 'Compute sum(plan_amount) and count(id).', isRequired: true, weight: 60 },
    ],
    acceptanceCriteria: [
      'SQL contains sum(plan_amount) AS total_mrr and WHERE status = \'active\''
    ],
    evaluationCriteria: [
      { id: 'crit-1', name: 'SQL Query Verification', description: 'Accurate KPI aggregation', weight: 100, evaluationType: 'deterministic' }
    ],
    availableTools: ['SQL Query Engine', 'PostgreSQL 16'],
    expectedDeliverable: 'Completed queries/mrr_metrics.sql.',
    referenceDocumentation: 'Formula: ARPU = Total MRR / Active Subscribers.',
    starterFiles: {
      'queries/mrr_metrics.sql': `-- Calculate MRR and ARPU:
SELECT
  sum(plan_amount) AS total_mrr,
  count(id) AS active_subscribers,
  round(sum(plan_amount)::numeric / count(id), 2) AS arpu
FROM subscriptions
WHERE status = 'active';
`
    },
    testCases: [
      {
        id: 'da-tc-1',
        name: 'SQL contains total_mrr and active_subscribers',
        input: 'total_mrr',
        expectedOutput: 'total_mrr',
        isHidden: false,
        weight: 100
      }
    ],
    skillSlugs: ['sql-aggregations', 'kpi-calculation', 'data-cleaning', 'data-storytelling']
  },

  // 10. QA / Test Engineer: Shopping Cart Assertion Suite
  {
    roleSlug: 'qa-engineer',
    title: 'Automated Shopping Cart Assertion Matrix',
    slug: 'qa-cart-assertion-matrix',
    difficulty: 'entry',
    estimatedMinutes: 20,
    company: {
      name: 'ShopWave Digital',
      industry: 'Retail E-commerce',
      size: 'Scaleup (100 engineers)',
      description: 'ShopWave builds high-throughput cart and checkout pipelines.'
    },
    managerName: 'Tariq Al-Mansoor',
    managerTitle: 'QA Engineering Lead',
    department: 'Quality Assurance',
    sprint: 'Sprint 14',
    businessContext: 'Our automated test suite needs full coverage for cart calculations: subtotal, promo code discount (10% off), tax (8%), and free shipping on orders >= $50.',
    problemStatement: 'Implement calculateCartTotal(items, promoCode). Free shipping ($0) when subtotal >= $50, else $5. Apply 10% promo discount before tax when promoCode is \"SAVE10\". Tax is 8% on discounted subtotal.',
    requirements: [
      { id: 'req-1', description: 'Calculate subtotal and apply SAVE10 discount.', isRequired: true, weight: 50 },
      { id: 'req-2', description: 'Calculate 8% tax and free shipping threshold ($50).', isRequired: true, weight: 50 },
    ],
    acceptanceCriteria: [
      'Orders >= $50 get free shipping; orders under $50 pay $5 shipping',
      'All calculations pass with 100% test assertions'
    ],
    evaluationCriteria: [
      { id: 'crit-1', name: 'Deterministic Cart Math Verification', description: 'Accurate pricing logic', weight: 100, evaluationType: 'deterministic' }
    ],
    availableTools: ['TypeScript', 'Vitest / Jest'],
    expectedDeliverable: 'Completed src/cart/calculator.ts.',
    referenceDocumentation: 'Shipping rules: $5 under $50, free >= $50. Tax: 8%.',
    starterFiles: {
      'src/cart/calculator.ts': `export function calculateCartTotal(items: Array<{ price: number; quantity: number }>, promoCode?: string) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = promoCode === 'SAVE10' ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  const discountedSubtotal = subtotal - discount;
  const tax = Math.round(discountedSubtotal * 0.08 * 100) / 100;
  const shipping = discountedSubtotal >= 50 ? 0 : (items.length > 0 ? 5 : 0);
  const total = Math.round((discountedSubtotal + tax + shipping) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount,
    tax,
    shipping,
    total
  };
}
`
    },
    testCases: [
      {
        id: 'qa-tc-1',
        name: 'Order over $50 qualifies for free shipping',
        input: JSON.stringify({ items: [{ price: 30, quantity: 2 }], promoCode: '' }),
        expectedOutput: JSON.stringify({ subtotal: 60, discount: 0, tax: 4.8, shipping: 0, total: 64.8 }),
        isHidden: false,
        weight: 100
      }
    ],
    skillSlugs: ['test-authoring', 'edge-case-analysis', 'bug-reproduction', 'contract-testing']
  },

  // 11. Civil Engineer: Concrete Slab Volume Takeoff
  {
    roleSlug: 'civil-engineer',
    title: 'Reinforced Concrete Slab Quantity & BOQ Takeoff',
    slug: 'civil-slab-volume-takeoff',
    difficulty: 'entry',
    estimatedMinutes: 20,
    company: {
      name: 'Apex Infrastructure & Build',
      industry: 'Civil & Construction Engineering',
      size: 'Enterprise (500 engineers)',
      description: 'Apex delivers commercial high-rise structures, bridges, and infrastructure.'
    },
    managerName: 'Er. Rajesh Varma',
    managerTitle: 'Chief Structural Engineer',
    department: 'Quantity Surveying & Estimation',
    sprint: 'Site Project BLR-08',
    businessContext: 'Before pouring the floor slab, the quantity surveying team must calculate concrete volume (m³), formwork area (m²), and cement bags (8 bags/m³).',
    problemStatement: 'Implement calculateSlabQuantities(lengthM, widthM, thicknessM). Return concreteVolumeM3, formworkAreaM2, and cementBags (concreteVolume * 8).',
    requirements: [
      { id: 'req-1', description: 'Calculate concrete volume = length * width * thickness.', isRequired: true, weight: 50 },
      { id: 'req-2', description: 'Calculate formwork shuttering area = length * width.', isRequired: true, weight: 50 },
    ],
    acceptanceCriteria: [
      'calculateSlabQuantities(10, 8, 0.15) returns { concreteVolumeM3: 12, formworkAreaM2: 80, cementBags: 96 }'
    ],
    evaluationCriteria: [
      { id: 'crit-1', name: 'Deterministic BOQ Quantity Calculations', description: 'Accurate volume and bag formulas', weight: 100, evaluationType: 'deterministic' }
    ],
    availableTools: ['Structural Drawing Specs', 'IS 456 Standards'],
    expectedDeliverable: 'Completed calculations/slab_takeoff.ts.',
    referenceDocumentation: 'Formula: Volume = L * W * D. Formwork = L * W. Cement = Volume * 8 bags/m³.',
    starterFiles: {
      'calculations/slab_takeoff.ts': `export function calculateSlabQuantities(lengthM: number, widthM: number, thicknessM: number) {
  const concreteVolumeM3 = Math.round(lengthM * widthM * thicknessM * 100) / 100;
  const formworkAreaM2 = Math.round(lengthM * widthM * 100) / 100;
  const cementBags = Math.round(concreteVolumeM3 * 8);

  return {
    concreteVolumeM3,
    formworkAreaM2,
    cementBags
  };
}
`
    },
    testCases: [
      {
        id: 'civ-tc-1',
        name: 'Standard floor slab takeoff',
        input: JSON.stringify({ lengthM: 10, widthM: 8, thicknessM: 0.15 }),
        expectedOutput: JSON.stringify({ concreteVolumeM3: 12, formworkAreaM2: 80, cementBags: 96 }),
        isHidden: false,
        weight: 100
      }
    ],
    skillSlugs: ['civil-boq', 'concrete-mix', 'drawing-interpretation', 'civil-standards']
  },

  // 12. Mechanical Engineer: GD&T Tolerance Limits
  {
    roleSlug: 'mechanical-engineer',
    title: 'Shaft-Hole Tolerance Limits & Fit Analysis (H7/g6)',
    slug: 'mech-tolerance-fit-analysis',
    difficulty: 'entry',
    estimatedMinutes: 20,
    company: {
      name: 'Precision Dynamics MechTech',
      industry: 'Precision Manufacturing & Automotive',
      size: 'Enterprise (350 engineers)',
      description: 'Manufactures precision gearbox assemblies and CNC turned components.'
    },
    managerName: 'Klaus Mueller',
    managerTitle: 'Lead Manufacturing & Quality Engineer',
    department: 'GD&T and Metrology',
    sprint: 'Batch QA-401',
    businessContext: 'On the transmission shaft assembly, a sliding fit (H7/g6) is required between the bearing bore and input shaft.',
    problemStatement: 'Implement calculateFitLimits(nominal, holeUpper, holeLower, shaftUpper, shaftLower). Return holeMin, holeMax, shaftMin, shaftMax, and maxClearanceMm (holeMax - shaftMin).',
    requirements: [
      { id: 'req-1', description: 'Compute holeMin, holeMax, shaftMin, shaftMax.', isRequired: true, weight: 50 },
      { id: 'req-2', description: 'Compute maxClearanceMm = holeMax - shaftMin.', isRequired: true, weight: 50 },
    ],
    acceptanceCriteria: [
      'calculateFitLimits(50, 0.025, 0, -0.009, -0.025) returns exact limits and maxClearance=0.050mm'
    ],
    evaluationCriteria: [
      { id: 'crit-1', name: 'Deterministic GD&T Fit Calculations', description: 'Accurate limit equations', weight: 100, evaluationType: 'deterministic' }
    ],
    availableTools: ['ISO 286 Standards', 'GD&T Calculator'],
    expectedDeliverable: 'Completed tolerances/fit_analyzer.ts.',
    referenceDocumentation: 'Limits: Hole Max = Nominal + Upper. Shaft Min = Nominal + Lower.',
    starterFiles: {
      'tolerances/fit_analyzer.ts': `export function calculateFitLimits(nominal: number, holeUpper: number, holeLower: number, shaftUpper: number, shaftLower: number) {
  const holeMin = Math.round((nominal + holeLower) * 1000) / 1000;
  const holeMax = Math.round((nominal + holeUpper) * 1000) / 1000;
  const shaftMin = Math.round((nominal + shaftLower) * 1000) / 1000;
  const shaftMax = Math.round((nominal + shaftUpper) * 1000) / 1000;
  const maxClearanceMm = Math.round((holeMax - shaftMin) * 1000) / 1000;

  return {
    holeMin,
    holeMax,
    shaftMin,
    shaftMax,
    fitType: 'clearance',
    maxClearanceMm
  };
}
`
    },
    testCases: [
      {
        id: 'mech-tc-1',
        name: '50mm H7/g6 sliding fit limit calculation',
        input: JSON.stringify({ nominal: 50, holeUpper: 0.025, holeLower: 0, shaftUpper: -0.009, shaftLower: -0.025 }),
        expectedOutput: JSON.stringify({ holeMin: 50, holeMax: 50.025, shaftMin: 49.975, shaftMax: 49.991, fitType: 'clearance', maxClearanceMm: 0.05 }),
        isHidden: false,
        weight: 100
      }
    ],
    skillSlugs: ['gdt-tolerances', 'stress-calculations', 'material-selection', 'manufacturing-processes']
  },

  // 13. ECE / Electronics Engineer: Voltage Divider & Resistors
  {
    roleSlug: 'electronics-engineer',
    title: 'Voltage Divider & LED Current Limiting Resistor Design',
    slug: 'ece-voltage-divider-resistors',
    difficulty: 'entry',
    estimatedMinutes: 20,
    company: {
      name: 'Nexis Embedded Systems',
      industry: 'Hardware & IoT Electronics',
      size: 'Scaleup (70 engineers)',
      description: 'Designs custom microcontrollers and industrial IoT sensor nodes.'
    },
    managerName: 'Ananya Deshmukh',
    managerTitle: 'Hardware Engineering Lead',
    department: 'Circuit Design & Prototyping',
    sprint: 'Board Rev 2.1',
    businessContext: 'Interfacing a 5V logic signal with a 3.3V microcontroller GPIO pin and driving an indicator LED (2V forward voltage at 20mA).',
    problemStatement: 'Implement calculateCircuitResistors(vIn, vOutTarget, r2Ohms, vLedForward, iLedTargetAmps). Formula: R1 = R2 * (VIn - VOut) / VOut and R_LED = (VIn - V_forward) / I_target.',
    requirements: [
      { id: 'req-1', description: 'Compute R1 for voltage divider.', isRequired: true, weight: 50 },
      { id: 'req-2', description: 'Compute current limiting resistor R_LED.', isRequired: true, weight: 50 },
    ],
    acceptanceCriteria: [
      'calculateCircuitResistors(5, 3.3, 10000, 2.0, 0.02) calculates R1=5152 and R_LED=150'
    ],
    evaluationCriteria: [
      { id: 'crit-1', name: 'Deterministic Circuit Calculations', description: 'Accurate Ohm\'s Law equations', weight: 100, evaluationType: 'deterministic' }
    ],
    availableTools: ['Circuit Schematic Specs', 'Ohm\'s Law Calculator'],
    expectedDeliverable: 'Completed circuits/resistor_calculator.ts.',
    referenceDocumentation: 'Ohm\'s Law: V = I * R. Voltage Divider: Vout = Vin * (R2 / (R1 + R2)).',
    starterFiles: {
      'circuits/resistor_calculator.ts': `export function calculateCircuitResistors(vIn: number, vOutTarget: number, r2Ohms: number, vLedForward: number, iLedTargetAmps: number) {
  const r1DividerOhms = Math.round(r2Ohms * (vIn - vOutTarget) / vOutTarget);
  const rLedLimiterOhms = Math.round((vIn - vLedForward) / iLedTargetAmps);

  return {
    r1DividerOhms,
    rLedLimiterOhms
  };
}
`
    },
    testCases: [
      {
        id: 'ece-tc-1',
        name: '5V to 3.3V voltage divider and 20mA LED resistor',
        input: JSON.stringify({ vIn: 5, vOutTarget: 3.3, r2Ohms: 10000, vLedForward: 2.0, iLedTargetAmps: 0.02 }),
        expectedOutput: JSON.stringify({ r1DividerOhms: 5152, rLedLimiterOhms: 150 }),
        isHidden: false,
        weight: 100
      }
    ],
    skillSlugs: ['analog-circuits', 'digital-logic', 'embedded-c', 'serial-protocols']
  },

  // 14. EEE / Electrical Engineer: 3-Phase Motor Power
  {
    roleSlug: 'electrical-engineer',
    title: '3-Phase Industrial Motor Power & Breaker Sizing',
    slug: 'eee-three-phase-motor-power',
    difficulty: 'entry',
    estimatedMinutes: 20,
    company: {
      name: 'VoltaGrid Electrical Systems',
      industry: 'Industrial Power & Distribution',
      size: 'Enterprise (400 engineers)',
      description: 'Supplies medium and low-voltage distribution panels and motor control centers.'
    },
    managerName: 'Eng. Farooq Hassan',
    managerTitle: 'Principal Electrical Engineer',
    department: 'Power Systems & MCC',
    sprint: 'Panel Line MCC-04',
    businessContext: 'Engineering a motor feeder panel for a 415V, 3-phase induction motor rated at 15 kW with a power factor of 0.85 and 90% efficiency.',
    problemStatement: 'Implement calculateMotorElectricals(kW, lineVoltageV, powerFactor, efficiency). Formula: FLA = (kW * 1000) / (sqrt(3) * V * PF * Eff). Recommended breaker is 125% of FLA (rounded up).',
    requirements: [
      { id: 'req-1', description: 'Compute Full Load Current (FLA) in Amperes.', isRequired: true, weight: 50 },
      { id: 'req-2', description: 'Compute Apparent Power S (kVA) and Breaker Size.', isRequired: true, weight: 50 },
    ],
    acceptanceCriteria: [
      'calculateMotorElectricals(15, 415, 0.85, 0.90) calculates FLA=27.3A, kVA=17.65, Breaker=35A'
    ],
    evaluationCriteria: [
      { id: 'crit-1', name: 'Deterministic 3-Phase Power Pass', description: 'Accurate power equations', weight: 100, evaluationType: 'deterministic' }
    ],
    availableTools: ['IEEE Power Triangle', 'NEC Ampacity Charts'],
    expectedDeliverable: 'Completed power/motor_calculator.ts.',
    referenceDocumentation: '3-Phase Power: P = sqrt(3) * V_L * I_L * cos(phi) * eta.',
    starterFiles: {
      'power/motor_calculator.ts': `export function calculateMotorElectricals(kW: number, lineVoltageV: number, powerFactor: number, efficiency: number) {
  const fla = (kW * 1000) / (Math.sqrt(3) * lineVoltageV * powerFactor * efficiency);
  const apparentPowerKva = kW / powerFactor;
  const recommendedBreakerAmps = Math.ceil(fla * 1.25);

  return {
    fullLoadAmps: Math.round(fla * 10) / 10,
    apparentPowerKva: Math.round(apparentPowerKva * 100) / 100,
    recommendedBreakerAmps
  };
}
`
    },
    testCases: [
      {
        id: 'eee-tc-1',
        name: '15kW 415V 3-phase motor calculation',
        input: JSON.stringify({ kW: 15, lineVoltageV: 415, powerFactor: 0.85, efficiency: 0.90 }),
        expectedOutput: JSON.stringify({ fullLoadAmps: 27.3, apparentPowerKva: 17.65, recommendedBreakerAmps: 35 }),
        isHidden: false,
        weight: 100
      }
    ],
    skillSlugs: ['three-phase-power', 'breaker-sizing', 'transformer-motor', 'electrical-safety']
  },

  // 15. Product Manager / MBA: RICE Feature Prioritization
  {
    roleSlug: 'product-manager',
    title: 'RICE Feature Prioritization & Unit Economics Scorecard',
    slug: 'pm-rice-prioritization-scorecard',
    difficulty: 'entry',
    estimatedMinutes: 20,
    company: {
      name: 'NovaScale Product Labs',
      industry: 'B2B SaaS',
      size: 'Scaleup (85 team members)',
      description: 'NovaScale builds workflow management software for distributed teams.'
    },
    managerName: 'Jessica Sterling',
    managerTitle: 'Chief Product Officer',
    department: 'Product Strategy',
    sprint: 'Q3 Roadmap Planning',
    businessContext: 'The product team has 5 competing feature candidates for Q3. We need a standardized prioritization scoring engine implementing the industry RICE framework.',
    problemStatement: 'Implement calculateRiceScore(reach, impact, confidence, effortPersonWeeks). Formula: RICE = (Reach * Impact * Confidence) / Effort. Score >= 500 is \"P0_CRITICAL\", >= 200 is \"P1_HIGH\", else \"P2_STANDARD\".',
    requirements: [
      { id: 'req-1', description: 'Compute RICE score = (reach * impact * confidence) / effort.', isRequired: true, weight: 50 },
      { id: 'req-2', description: 'Categorize priorityTier based on RICE score thresholds.', isRequired: true, weight: 50 },
    ],
    acceptanceCriteria: [
      'calculateRiceScore(2000, 2, 0.8, 4) calculates RICE=800 and priorityTier=\"P0_CRITICAL\"'
    ],
    evaluationCriteria: [
      { id: 'crit-1', name: 'Deterministic RICE Scoring Pass', description: 'Accurate prioritization calculations', weight: 100, evaluationType: 'deterministic' }
    ],
    availableTools: ['PRD Document Editor', 'RICE Framework Matrix'],
    expectedDeliverable: 'Completed roadmap/rice_calculator.ts.',
    referenceDocumentation: 'RICE Scoring: (Reach * Impact * Confidence) / Effort.',
    starterFiles: {
      'roadmap/rice_calculator.ts': `export function calculateRiceScore(reach: number, impact: number, confidence: number, effortPersonWeeks: number) {
  const riceScore = Math.round((reach * impact * confidence) / effortPersonWeeks);

  let priorityTier = 'P2_STANDARD';
  if (riceScore >= 500) priorityTier = 'P0_CRITICAL';
  else if (riceScore >= 200) priorityTier = 'P1_HIGH';

  return {
    riceScore,
    priorityTier
  };
}
`
    },
    testCases: [
      {
        id: 'pm-tc-1',
        name: 'High reach critical feature calculation',
        input: JSON.stringify({ reach: 2000, impact: 2, confidence: 0.8, effortPersonWeeks: 4 }),
        expectedOutput: JSON.stringify({ riceScore: 800, priorityTier: 'P0_CRITICAL' }),
        isHidden: false,
        weight: 100
      }
    ],
    skillSlugs: ['prd-authoring', 'rice-prioritization', 'unit-economics', 'market-analysis']
  }
];

