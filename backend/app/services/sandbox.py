"""
Code Sandbox — Secure Python Code Execution Engine.

Executes untrusted candidate code in a subprocess with:
- 5-second timeout
- Blocked dangerous imports (os, sys, subprocess, shutil, etc.)
- Stdout/stderr capture
- Scoring based on: execution success, output quality, code structure
"""
import asyncio
import subprocess
import tempfile
import re
import os
from pathlib import Path


# Imports that candidates are NOT allowed to use
BLOCKED_IMPORTS = {
    "os", "sys", "subprocess", "shutil", "socket", "http",
    "urllib", "requests", "pathlib", "importlib", "ctypes",
    "signal", "multiprocessing", "threading", "pickle",
    "__import__", "eval", "exec", "compile", "open",
}

EXECUTION_TIMEOUT_SECONDS = 5
MAX_OUTPUT_LENGTH = 5000


def _check_security(code: str) -> list[str]:
    """
    Static analysis — scan for dangerous patterns before execution.
    Returns a list of violations found.
    """
    violations = []

    for blocked in BLOCKED_IMPORTS:
        # Check for `import os`, `from os import`, `__import__('os')`
        patterns = [
            rf'\bimport\s+{re.escape(blocked)}\b',
            rf'\bfrom\s+{re.escape(blocked)}\b',
            rf'__import__\s*\(\s*["\'].*{re.escape(blocked)}',
        ]
        for pattern in patterns:
            if re.search(pattern, code):
                violations.append(f"Blocked import/call: {blocked}")
                break

    # Block open() for file access
    if re.search(r'\bopen\s*\(', code):
        violations.append("File access (open) is not allowed")

    # Block eval/exec
    if re.search(r'\b(eval|exec|compile)\s*\(', code):
        violations.append("Dynamic code execution (eval/exec/compile) is not allowed")

    return violations


def _score_code(code: str, stdout: str, stderr: str, exit_code: int) -> dict:
    """
    Score the candidate's code based on multiple quality signals.
    Returns: {score: 0-100, feedback: str, breakdown: dict}
    """
    breakdown = {
        "execution": 0,       # max 35 — did it run without errors?
        "output": 0,          # max 25 — did it produce meaningful output?
        "structure": 0,       # max 25 — functions, classes, docstrings?
        "code_quality": 0,    # max 15 — variable naming, comments, length
    }
    feedback_parts = []

    # ── Execution (0-35) ──
    if exit_code == 0:
        breakdown["execution"] = 35
        feedback_parts.append("Code executed successfully without errors.")
    elif stderr and "SyntaxError" in stderr:
        breakdown["execution"] = 0
        feedback_parts.append(f"Syntax error detected: {stderr[:200]}")
    elif stderr and "NameError" in stderr:
        breakdown["execution"] = 10
        feedback_parts.append(f"Runtime error — undefined variable: {stderr[:200]}")
    elif stderr:
        breakdown["execution"] = 15
        feedback_parts.append(f"Runtime error: {stderr[:200]}")
    else:
        breakdown["execution"] = 5
        feedback_parts.append("Code did not execute cleanly.")

    # ── Output quality (0-25) ──
    output_stripped = stdout.strip()
    if output_stripped:
        lines = output_stripped.split('\n')
        if len(lines) >= 3:
            breakdown["output"] = 25
            feedback_parts.append(f"Produced meaningful output ({len(lines)} lines).")
        elif len(lines) >= 1:
            breakdown["output"] = 15
            feedback_parts.append("Produced some output.")
        else:
            breakdown["output"] = 5
    else:
        breakdown["output"] = 0
        if exit_code == 0:
            feedback_parts.append("Code ran but produced no output. Consider adding print statements or return values.")

    # ── Code structure (0-25) ──
    has_functions = bool(re.search(r'\bdef\s+\w+\s*\(', code))
    has_classes = bool(re.search(r'\bclass\s+\w+', code))
    has_docstrings = bool(re.search(r'""".*?"""|\'\'\'.*?\'\'\'', code, re.DOTALL))
    has_type_hints = bool(re.search(r'->\s*\w+|:\s*(int|str|float|list|dict|bool|tuple|None)', code))

    if has_classes:
        breakdown["structure"] += 10
    if has_functions:
        breakdown["structure"] += 8
    if has_docstrings:
        breakdown["structure"] += 4
    if has_type_hints:
        breakdown["structure"] += 3

    structure_items = []
    if has_functions: structure_items.append("functions")
    if has_classes: structure_items.append("classes")
    if has_docstrings: structure_items.append("docstrings")
    if has_type_hints: structure_items.append("type hints")

    if structure_items:
        feedback_parts.append(f"Good code structure: uses {', '.join(structure_items)}.")
    else:
        feedback_parts.append("Consider structuring your code with functions or classes.")

    # ── Code quality (0-15) ──
    code_lines = [l for l in code.split('\n') if l.strip() and not l.strip().startswith('#')]
    comment_lines = [l for l in code.split('\n') if l.strip().startswith('#')]

    if len(code_lines) >= 10:
        breakdown["code_quality"] += 5
    elif len(code_lines) >= 5:
        breakdown["code_quality"] += 3

    if len(comment_lines) >= 2:
        breakdown["code_quality"] += 5
        feedback_parts.append("Well-commented code.")

    # Check for meaningful variable names (not single char, except i, j, k, x, y)
    single_char_vars = re.findall(r'\b([a-hm-wz])\s*=', code)
    if len(single_char_vars) <= 1:
        breakdown["code_quality"] += 5
    else:
        feedback_parts.append("Consider using more descriptive variable names.")

    total_score = sum(breakdown.values())

    return {
        "score": min(100, max(0, total_score)),
        "feedback": " ".join(feedback_parts),
        "breakdown": breakdown,
        "stdout": output_stripped[:500] if output_stripped else None,
    }


class CodeSandboxSimulator:
    """
    Secure Python code execution engine.
    Runs candidate code in an isolated subprocess with resource limits.
    """

    @staticmethod
    async def evaluate_code(code: str, language: str = 'python') -> dict:
        """
        Execute candidate code securely and return evaluation results.
        """
        # ── Step 1: Security check ──
        violations = _check_security(code)
        if violations:
            return {
                "score": 0,
                "status": "failed",
                "feedback": f"Security violation(s): {'; '.join(violations)}. Please remove restricted operations.",
                "execution_time_ms": 0,
                "memory_usage_mb": 0.0,
            }

        # ── Step 2: Write code to temp file ──
        tmp_dir = Path(tempfile.mkdtemp(prefix="sandbox_"))
        code_file = tmp_dir / "solution.py"

        try:
            code_file.write_text(code, encoding="utf-8")

            # ── Step 3: Execute in subprocess with timeout ──
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, _run_subprocess, str(code_file))

            exit_code = result["exit_code"]
            stdout = result["stdout"]
            stderr = result["stderr"]
            execution_time_ms = result["execution_time_ms"]

            # ── Step 4: Score the result ──
            scored = _score_code(code, stdout, stderr, exit_code)

            status = "passed" if scored["score"] >= 50 else "failed"

            return {
                "score": scored["score"],
                "status": status,
                "feedback": scored["feedback"],
                "execution_time_ms": execution_time_ms,
                "memory_usage_mb": 0.0,  # Accurate measurement requires cgroups
                "stdout": scored.get("stdout"),
                "breakdown": scored["breakdown"],
            }

        except Exception as e:
            return {
                "score": 0,
                "status": "failed",
                "feedback": f"Internal sandbox error: {str(e)[:200]}",
                "execution_time_ms": 0,
                "memory_usage_mb": 0.0,
            }
        finally:
            # Cleanup
            try:
                code_file.unlink(missing_ok=True)
                tmp_dir.rmdir()
            except Exception:
                pass


def _run_subprocess(code_path: str) -> dict:
    """
    Run Python code in a subprocess with timeout and resource restrictions.
    """
    import time
    start = time.monotonic()

    try:
        proc = subprocess.run(
            ["python3", code_path],
            capture_output=True,
            text=True,
            timeout=EXECUTION_TIMEOUT_SECONDS,
            # Restrict environment — remove dangerous env vars
            env={
                "PATH": "/usr/bin:/usr/local/bin",
                "HOME": "/tmp",
                "LANG": "en_US.UTF-8",
            },
        )

        elapsed_ms = int((time.monotonic() - start) * 1000)

        return {
            "exit_code": proc.returncode,
            "stdout": proc.stdout[:MAX_OUTPUT_LENGTH] if proc.stdout else "",
            "stderr": proc.stderr[:MAX_OUTPUT_LENGTH] if proc.stderr else "",
            "execution_time_ms": elapsed_ms,
        }

    except subprocess.TimeoutExpired:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return {
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Execution timed out after {EXECUTION_TIMEOUT_SECONDS} seconds.",
            "execution_time_ms": elapsed_ms,
        }
    except Exception as e:
        return {
            "exit_code": -1,
            "stdout": "",
            "stderr": str(e)[:500],
            "execution_time_ms": 0,
        }
