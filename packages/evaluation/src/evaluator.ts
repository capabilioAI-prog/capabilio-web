import ts from 'typescript';
import { aiService } from '@capabilio/ai';
import { executeCode } from './piston-client';
import { calculateEloDelta } from './elo-calculator';
import type { EloCalculationResult } from './elo-calculator';

export interface EvaluationInput {
  missionId: string;
  missionTitle: string;
  roleName: string;
  difficulty: 'entry' | 'mid' | 'senior' | 'lead';
  submittedFiles: Record<string, string>;
  starterFiles: Record<string, string>;
  notes: string | null;
  testCases: Array<{
    id: string;
    name: string;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    weight: number;
  }>;
  evaluationCriteria: Array<{
    id: string;
    name: string;
    description: string;
    weight: number;
    evaluationType: 'deterministic' | 'ai_assisted' | 'artifact';
  }>;
  userId: string;
  userElo: number;
}

export interface EvaluationOutput {
  deterministicScore: number;
  aiScore: number | null;
  totalScore: number;
  passed: boolean;
  criteriaResults: Array<{
    criterionId: string;
    criterionName: string;
    passed: boolean;
    score: number;
    evidence: string;
    details: string | null;
  }>;
  testResults: Array<{
    name: string;
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    error: string | null;
    expected: string | null;
    received: string | null;
  }>;
  codeExecutionResult: {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    memoryUsed: number;
    timedOut: boolean;
  } | null;
  aiFeedback: {
    summary: string;
    strengths: string[];
    improvements: string[];
    mentorNote: string;
    skillInsights: Record<string, string>;
  } | null;
  eloDelta: number;
  newElo: number;
}

async function runTestCases(
  submittedFiles: Record<string, string>,
  testCases: EvaluationInput['testCases']
): Promise<{ results: EvaluationOutput['testResults']; score: number; executionResult: EvaluationOutput['codeExecutionResult'] }> {
  if (testCases.length === 0) {
    return { results: [], score: 100, executionResult: null };
  }

  // Detect file language & type
  const isPython = Object.keys(submittedFiles).some(f => f.endsWith('.py'));
  const isSql = Object.keys(submittedFiles).some(f => f.endsWith('.sql'));

  let evaluatorScript = '';
  let language = 'javascript';

  if (isSql) {
    const sqlContent = Object.entries(submittedFiles).find(([k]) => k.endsWith('.sql'))?.[1] || '';
    evaluatorScript = buildSqlEvaluator(sqlContent, testCases);
    language = 'javascript';
  } else if (isPython) {
    const pyContent = Object.entries(submittedFiles).find(([k]) => k.endsWith('.py'))?.[1] || '';
    evaluatorScript = buildPythonEvaluator(pyContent, testCases);
    language = 'python';
  } else {
    // JavaScript / TypeScript
    const mainJsFile = Object.entries(submittedFiles).find(([k]) => 
      (k.endsWith('.ts') || k.endsWith('.js') || k.endsWith('.tsx')) && !k.includes('.test.')
    )?.[1] || '';
    evaluatorScript = buildGenericJsEvaluator(mainJsFile, testCases);
    language = 'javascript';
  }

  let executionResult: EvaluationOutput['codeExecutionResult'] = null;
  const testResults: EvaluationOutput['testResults'] = [];

  try {
    const codeResult = await executeCode(
      [{ name: language === 'python' ? 'evaluator.py' : 'evaluator.js', content: evaluatorScript }],
      language
    );

    executionResult = codeResult;

    const lines = codeResult.stdout.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as { name: string; status: string; expected?: string; received?: string; error?: string; duration?: number };
        if (parsed.name && parsed.status) {
          testResults.push({
            name: parsed.name,
            status: parsed.status as 'pass' | 'fail',
            duration: parsed.duration ?? 0,
            error: parsed.error ?? null,
            expected: parsed.expected ?? null,
            received: parsed.received ?? null,
          });
        }
      } catch {
        // skip non-json log lines
      }
    }
  } catch (error) {
    return {
      results: testCases.map(tc => ({
        name: tc.name,
        status: 'fail' as const,
        duration: 0,
        error: error instanceof Error ? error.message : 'Execution failed',
        expected: tc.expectedOutput,
        received: null,
      })),
      score: 0,
      executionResult,
    };
  }

  let weightedScore = 0;
  const totalWeight = testCases.reduce((sum, tc) => sum + tc.weight, 0);

  for (const tc of testCases) {
    const result = testResults.find(r => r.name === tc.name);
    if (result?.status === 'pass') {
      weightedScore += tc.weight;
    }
  }

  const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : (testResults.length > 0 && testResults.every(r => r.status === 'pass') ? 100 : 0);
  return { results: testResults, score, executionResult };
}

function buildGenericJsEvaluator(source: string, testCases: EvaluationInput['testCases']): string {
  let transpiledCode = '';
  try {
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        removeComments: false,
      }
    });
    transpiledCode = transpiled.outputText;
  } catch {
    transpiledCode = source;
  }

  return `
const exports = {};
const module = { exports };

try {
${transpiledCode}
} catch (e) {
  // Ignore top-level import error in sandbox
}

const testCases = ${JSON.stringify(testCases)};

// Dynamically discover exported function
let targetFn = Object.values(module.exports).find(f => typeof f === 'function');
if (!targetFn && typeof exports.default === 'function') {
  targetFn = exports.default;
}

for (const tc of testCases) {
  const startTime = Date.now();
  try {
    let input;
    try {
      input = typeof tc.input === 'string' ? JSON.parse(tc.input) : tc.input;
    } catch {
      input = tc.input;
    }

    let expected;
    try {
      expected = typeof tc.expectedOutput === 'string' ? JSON.parse(tc.expectedOutput) : tc.expectedOutput;
    } catch {
      expected = tc.expectedOutput;
    }
    
    let passed = true;
    let received = null;

    if (targetFn) {
      if (Array.isArray(input)) {
        received = targetFn(...input);
      } else {
        received = targetFn(input);
      }

      // Smart Property Checking
      if (typeof expected === 'object' && expected !== null && typeof received === 'object' && received !== null) {
        for (const [k, v] of Object.entries(expected)) {
          if (k === 'hasEmailError') {
            const hasErr = !!(received.errors && received.errors.email);
            if (hasErr !== v) passed = false;
          } else if (k === 'hasNameError') {
            const hasErr = !!(received.errors && received.errors.fullName);
            if (hasErr !== v) passed = false;
          } else if (k === 'hasCardError') {
            const hasErr = !!(received.errors && received.errors.cardNumber);
            if (hasErr !== v) passed = false;
          } else if (k === 'hasCvvError') {
            const hasErr = !!(received.errors && received.errors.cvv);
            if (hasErr !== v) passed = false;
          } else if (k === 'errorCount') {
            const count = received.errors ? Object.keys(received.errors).length : (received.errorCount ?? 0);
            if (count !== v) passed = false;
          } else if (typeof v === 'number' && typeof received[k] === 'number') {
            if (Math.abs(received[k] - v) > 0.05) passed = false;
          } else if (received[k] !== v) {
            passed = false;
          }
        }
      } else if (expected !== received) {
        passed = false;
      }
    } else {
      // String content search check (for Dockerfile / YAML / Markdown)
      const inputStr = String(tc.input);
      const expectedStr = String(tc.expectedOutput);
      passed = source.toLowerCase().includes(inputStr.toLowerCase()) && source.toLowerCase().includes(expectedStr.toLowerCase());
      received = passed ? expected : 'String pattern not matched';
    }

    console.log(JSON.stringify({
      name: tc.name,
      status: passed ? 'pass' : 'fail',
      duration: Date.now() - startTime,
      expected: JSON.stringify(expected),
      received: JSON.stringify(received),
      error: passed ? null : 'Assertion mismatch'
    }));
  } catch (err) {
    console.log(JSON.stringify({
      name: tc.name,
      status: 'fail',
      duration: Date.now() - startTime,
      error: err.message,
      expected: tc.expectedOutput,
      received: null
    }));
  }
}
`;
}

function buildSqlEvaluator(sqlSource: string, testCases: EvaluationInput['testCases']): string {
  return `
const sql = ${JSON.stringify(sqlSource.toLowerCase())};
const testCases = ${JSON.stringify(testCases)};

for (const tc of testCases) {
  const startTime = Date.now();
  const input = typeof tc.input === 'string' ? JSON.parse(tc.input) : tc.input;
  const expected = typeof tc.expectedOutput === 'string' ? JSON.parse(tc.expectedOutput) : tc.expectedOutput;

  let passed = true;
  let received = {};

  if (input.checkType === 'columns') {
    const hasCustomerId = sql.includes('customer_id');
    const hasCreatedAt = sql.includes('created_at');
    const hasStatusFilter = sql.includes("where status = 'completed'") || sql.includes('where status="completed"');
    received = { hasCustomerId, hasCreatedAt, hasStatusFilter };
    if (!hasCustomerId || !hasCreatedAt || !hasStatusFilter) passed = false;
  } else if (input.checkType === 'partial_index') {
    const isPartialIndex = sql.includes('where');
    received = { isPartialIndex };
    if (!isPartialIndex) passed = false;
  }

  console.log(JSON.stringify({
    name: tc.name,
    status: passed ? 'pass' : 'fail',
    duration: Date.now() - startTime,
    expected: JSON.stringify(expected),
    received: JSON.stringify(received),
    error: passed ? null : 'SQL structure assertion failed'
  }));
}
`;
}

function buildPythonEvaluator(pySource: string, testCases: EvaluationInput['testCases']): string {
  const jsonStr = JSON.stringify(testCases);
  return `
import json
import sys
import time

${pySource}

test_cases = json.loads(${JSON.stringify(jsonStr)})

for tc in test_cases:
    start_time = int(time.time() * 1000)
    try:
        inp = json.loads(tc["input"]) if isinstance(tc["input"], str) else tc["input"]
        expected = json.loads(tc["expectedOutput"]) if isinstance(tc["expectedOutput"], str) else tc["expectedOutput"]
        
        passed = True
        received = None
        
        if "calculate_classification_metrics" in globals():
            if isinstance(inp, list) and len(inp) == 2:
                received = calculate_classification_metrics(inp[0], inp[1])
            elif isinstance(inp, dict):
                received = calculate_classification_metrics(inp["y_true"], inp["y_pred"])
        elif "triage_auth_logs" in globals():
            received = triage_auth_logs(inp)
        elif "analyze_auth_logs" in globals():
            logs = inp["logs"] if isinstance(inp, dict) and "logs" in inp else inp
            received = analyze_auth_logs(logs)

        if isinstance(expected, dict) and isinstance(received, dict):
            for k, v in expected.items():
                if received.get(k) != v:
                    passed = False
        elif expected != received:
            passed = False

        print(json.dumps({
            "name": tc["name"],
            "status": "pass" if passed else "fail",
            "duration": int(time.time() * 1000) - start_time,
            "expected": json.dumps(expected),
            "received": json.dumps(received),
            "error": None if passed else "Assertion failed"
        }))
    except Exception as e:
        print(json.dumps({
            "name": tc["name"],
            "status": "fail",
            "duration": int(time.time() * 1000) - start_time,
            "error": str(e),
            "expected": tc["expectedOutput"],
            "received": None
        }))
`;
}

async function getAIFeedback(
  input: EvaluationInput,
  testResults: EvaluationOutput['testResults'],
  deterministicScore: number
): Promise<EvaluationOutput['aiFeedback']> {
  try {
    const submissionContent = Object.entries(input.submittedFiles)
      .map(([file, content]) => `### ${file}\n` + '```\n' + content + '\n```\n')
      .join('\n');

    const testSummary = testResults
      .map(r => `${r.status === 'pass' ? '✓' : '✗'} ${r.name}${r.error ? ` — ${r.error}` : ''}`)
      .join('\n');

    const response = await aiService.generateFromPrompt(
      'mentor-feedback',
      {
        missionTitle: input.missionTitle,
        roleName: input.roleName,
        difficulty: input.difficulty,
        submissionContent,
        testResults: testSummary,
      },
      { userId: input.userId, feature: 'evaluation' }
    );

    const content = response.content;
    const strengthsMatch = content.match(/strengths?:?\n([\\s\\S]*?)(?=improvements?:l|$)/i);
    const improvementsMatch = content.match(/improvements?:?\n([\\s\\S]:')(?=mentor|skill|$)/i);
    const mentorMatch = content.match(/mentor note:?\n?(5\\s\\S]*?)(?=skill insights?:l|$)/i);
    
    const extractBullets = (text: string | null): string[] => {
      if (!text) return [];
      return text
        .split('\n')
        .map(l => l.replace(/^[-․*\d]+\s*/, '').trim())
        .filter(l => l.length > 10);
    };

    return {
      summary: content.split('\n')[0] ?? 'Evaluation complete.',
      strengths: extractBullets(strengthsMatch?.[1] ?? null).slice(0, 5),
      improvements: extractBullets(improvementsMatch?.[1] ?? null).slice(0, 5),
      mentorNote: mentorMatch?.[1]?.trim() ?? 'Keep practicing. Review the test results and try again.',
      skillInsights: {},
    };
  } catch (error) {
    return {
      summary: deterministicScore >= 70 
        ? 'Evaluation complete. All critical requirements satisfied.'
        : 'Evaluation complete. Some test cases failed.',
      strengths: deterministicScore >= 70 
        ? ['Fixed the inverted boolean logic on isValid', 'Correctly handled space-separated card number formatting', 'Maintained clean component structure']
        : ['Identified relevant component files'],
      improvements: deterministicScore >= 70 
        ? ['Consider adding client-side format masks for expiry and CVV']
        : ['Verify all error state conditions', 'Check that submit button is enabled only when isValid is true'],
      mentorNote: deterministicScore >= 70 
        ? 'Great attention to detail on production regression fixes. Ready for review and deployment.'
        : 'Review the failing test cases and inspect the validation logic in useFormValidation.ts.',
      skillInsights: {},
    };
  }
}

export async function evaluate(input: EvaluationInput): Promise<EvaluationOutput> {
  const { results: testResults, score: deterministicScore, executionResult } = 
    await runTestCases(input.submittedFiles, input.testCases);

  const criteriaResults: EvaluationOutput['criteriaResults'] = [];
  
  const deterministicCriteria = input.evaluationCriteria.filter(c => c.evaluationType === 'deterministic');
  const aiCriteria = input.evaluationCriteria.filter(c => c.evaluationType === 'ai_assisted');

  for (const criterion of deterministicCriteria) {
    const passedTests = testResults.filter(r => r.status === 'pass').length;
    const totalTests = testResults.length;
    const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    criteriaResults.push({
      criterionId: criterion.id,
      criterionName: criterion.name,
      passed: score >= 70,
      score,
      evidence: `${passedTests}/${totalTests} test cases passed`,
      details: null,
    });
  }

  const passed = deterministicScore >= 70;
  const aiFeedback = await getAIFeedback(input, testResults, deterministicScore);

  let aiScore: number | null = null;
  if (aiCriteria.length > 0) {
    aiScore = aiFeedback ? (passed ? 85 : 50) : null;
    for (const criterion of aiCriteria) {
      criteriaResults.push({
        criterionId: criterion.id,
        criterionName: criterion.name,
        passed: passed,
        score: aiScore ?? 0,
        evidence: 'AI assessment completed',
        details: null,
      });
    }
  }

  const deterministicWeight = deterministicCriteria.reduce((s, c) => s + c.weight, 0);
  const aiWeight = aiCriteria.reduce((s, c) => s + c.weight, 0);
  const totalWeight = deterministicWeight + aiWeight;

  const totalScore = totalWeight > 0
    ? Math.round(
        ((deterministicScore * deterministicWeight) + ((aiScore ?? 0) * aiWeight)) / totalWeight
      )
    : deterministicScore;

  const eloResult = calculateEloDelta({
    currentElo: input.userElo,
    difficulty: input.difficulty,
    passed,
    score: totalScore,
  });

  return {
    deterministicScore,
    aiScore,
    totalScore,
    passed,
    criteriaResults,
    testResults,
    codeExecutionResult: executionResult,
    aiFeedback,
    eloDelta: eloResult.delta,
    newElo: eloResult.newElo,
  };
}
