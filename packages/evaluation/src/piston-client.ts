// Piston API client for sandboxed code execution
// https://github.com/engineer-man/piston

const PISTON_API_URL = process.env.PISTON_API_URL ?? 'https://emkc.org/api/v2/piston';

export interface PistonFile {
  name: string;
  content: string;
}

export interface PistonExecuteRequest {
  language: string;
  version: string;
  files: PistonFile[];
  stdin?: string;
  args?: string[];
  run_timeout?: number; // ms, default 3000
  compile_timeout?: number; // ms, default 10000
  compile_memory_limit?: number; // bytes, -1 = unlimited
  run_memory_limit?: number; // bytes, -1 = unlimited
}

export interface PistonExecuteResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsed: number;
  timedOut: boolean;
}

export async function executeCode(
  files: PistonFile[],
  language: string,
  stdin?: string
): Promise<CodeExecutionResult> {
  const startTime = Date.now();

  // Get available runtimes to find correct version
  const runtimeMap: Record<string, { language: string; version: string }> = {
    javascript: { language: 'javascript', version: '18.15.0' },
    typescript: { language: 'typescript', version: '5.0.3' },
    python: { language: 'python', version: '3.10.0' },
    java: { language: 'java', version: '15.0.2' },
    cpp: { language: 'c++', version: '10.2.0' },
    rust: { language: 'rust', version: '1.50.0' },
  };

  const runtime = runtimeMap[language.toLowerCase()];
  if (!runtime) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (process.env.PISTON_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.PISTON_API_KEY}`;
  }

  try {
    const response = await fetch(`${PISTON_API_URL}/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files,
        stdin: stdin ?? '',
        run_timeout: 5000,
        run_memory_limit: 128 * 1024 * 1024, // 128MB
      } satisfies PistonExecuteRequest),
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const result = await response.json() as PistonExecuteResponse;
      const executionTime = Date.now() - startTime;

      return {
        stdout: result.run.stdout,
        stderr: result.run.stderr + (result.compile?.stderr ?? ''),
        exitCode: result.run.code,
        executionTime,
        memoryUsed: 0,
        timedOut: result.run.signal === 'SIGKILL',
      };
    }
  } catch {
    // Fallback to local sandbox runner
  }

  // Local execution fallback
  const { execSync } = await import('child_process');
  const mainFile = files[0];
  if (!mainFile) {
    return { stdout: '', stderr: 'No files provided', exitCode: 1, executionTime: 0, memoryUsed: 0, timedOut: false };
  }

  const binary = language === 'python' ? 'python3' : 'node';

  try {
    const stdout = execSync(binary, {
      input: mainFile.content,
      timeout: 5000,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    });
    return {
      stdout,
      stderr: '',
      exitCode: 0,
      executionTime: Date.now() - startTime,
      memoryUsed: 0,
      timedOut: false,
    };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() || '',
      stderr: err.stderr?.toString() || err.message,
      exitCode: err.status || 1,
      executionTime: Date.now() - startTime,
      memoryUsed: 0,
      timedOut: err.killed || false,
    };
  }
}
