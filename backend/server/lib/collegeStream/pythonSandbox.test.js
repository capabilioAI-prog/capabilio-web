import { test } from "node:test"
import assert from "node:assert/strict"
import {
  runPython, evaluatePythonStdout, scanForDangerousPatterns, checkPythonAvailable, PythonSandboxError,
} from "./pythonSandbox.js"

// These tests actually spawn python3 — skip cleanly (not fail the suite) on
// an environment where it isn't installed, since that's exactly the honest
// "this challenge type can't be scored here" case the sandbox itself
// surfaces via PythonSandboxError at request time.
const HAS_PYTHON = checkPythonAvailable()

test("checkPythonAvailable reflects real availability", () => {
  assert.equal(typeof HAS_PYTHON, "boolean")
})

test("scanForDangerousPatterns flags os/subprocess/eval/exec/open/import tricks", () => {
  assert.equal(scanForDangerousPatterns("import os\nprint(os.getcwd())"), true)
  assert.equal(scanForDangerousPatterns("import subprocess"), true)
  assert.equal(scanForDangerousPatterns("eval('1+1')"), true)
  assert.equal(scanForDangerousPatterns("exec('x=1')"), true)
  assert.equal(scanForDangerousPatterns("open('/etc/passwd')"), true)
  assert.equal(scanForDangerousPatterns("__import__('os')"), true)
})

test("scanForDangerousPatterns allows plain computation", () => {
  assert.equal(scanForDangerousPatterns("total = sum(range(1, 11))\nprint(total)"), false)
})

test("evaluatePythonStdout rejects a non-string expected_stdout", async () => {
  await assert.rejects(
    () => evaluatePythonStdout({ type: "python_stdout_match", expected_stdout: 55 }, "print(55)"),
    PythonSandboxError,
  )
})

test("evaluatePythonStdout blocks dangerous code before spawning, scores it as a clean fail", async () => {
  const result = await evaluatePythonStdout(
    { type: "python_stdout_match", expected_stdout: "x" },
    "import os\nprint(os.getcwd())",
  )
  assert.equal(result.passed, false)
  assert.equal(result.score, 0)
  assert.match(result.error, /disallowed operation/)
})

if (HAS_PYTHON) {
  test("runPython executes plain code and captures stdout", async () => {
    const { stdout, exitCode, timedOut } = await runPython("print(2 + 2)")
    assert.equal(stdout.trim(), "4")
    assert.equal(exitCode, 0)
    assert.equal(timedOut, false)
  })

  test("runPython enforces the wall-clock timeout on an infinite loop", async () => {
    const { timedOut, exitCode } = await runPython("while True:\n    pass", { timeoutMs: 800 })
    assert.equal(timedOut, true)
    assert.equal(exitCode, null)
  })

  test("runPython enforces the memory ulimit on a large allocation", async () => {
    const { exitCode, stderr } = await runPython("x = bytearray(1_000_000_000)\nprint(len(x))", { timeoutMs: 4000 })
    assert.notEqual(exitCode, 0)
    assert.match(stderr, /MemoryError/)
  })

  test("evaluatePythonStdout: correct output passes with score 100", async () => {
    const result = await evaluatePythonStdout(
      { type: "python_stdout_match", expected_stdout: "55" },
      "total = 0\nfor i in range(1, 11):\n    total += i\nprint(total)",
    )
    assert.deepEqual({ score: result.score, passed: result.passed }, { score: 100, passed: true })
  })

  test("evaluatePythonStdout: wrong output fails with score 0, not an error", async () => {
    const result = await evaluatePythonStdout(
      { type: "python_stdout_match", expected_stdout: "55" },
      "print(50)",
    )
    assert.deepEqual({ score: result.score, passed: result.passed }, { score: 0, passed: false })
  })

  test("evaluatePythonStdout: trims trailing whitespace/newlines before comparing", async () => {
    const result = await evaluatePythonStdout(
      { type: "python_stdout_match", expected_stdout: "hello" },
      "print('hello')",
    )
    assert.equal(result.passed, true)
  })

  test("evaluatePythonStdout: a runtime exception is a clean fail with the error surfaced", async () => {
    const result = await evaluatePythonStdout(
      { type: "python_stdout_match", expected_stdout: "x" },
      "raise ValueError('boom')",
    )
    assert.equal(result.passed, false)
    assert.match(result.error, /boom/)
  })
} else {
  test("python3 not available in this environment — code-execution challenges honestly unscoreable here", () => {
    assert.equal(HAS_PYTHON, false)
  })
}
