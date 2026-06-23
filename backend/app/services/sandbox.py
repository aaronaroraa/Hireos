import asyncio
import random

class CodeSandboxSimulator:
    """
    In Phase 3, this is a mock.
    In Production, this will interface with a secure Docker or Firecracker VM
    to safely execute untrusted candidate code against unit tests.
    """
    
    @staticmethod
    async def evaluate_code(code: str, language: str = 'python') -> dict:
        """
        Simulates running code and grading it.
        """
        # Simulate network/processing delay
        await asyncio.sleep(2)
        
        # Super simple mock evaluation
        if "print" in code or "def" in code:
            score = random.randint(70, 100)
            status = 'passed' if score >= 80 else 'failed'
            feedback = "Code executed successfully. Good logic structure."
        else:
            score = random.randint(0, 40)
            status = 'failed'
            feedback = "Compilation error or empty submission."

        return {
            "score": score,
            "status": status,
            "feedback": feedback,
            "execution_time_ms": random.randint(15, 120),
            "memory_usage_mb": round(random.uniform(10.5, 50.2), 2)
        }
