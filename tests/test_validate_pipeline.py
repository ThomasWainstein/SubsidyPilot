import os
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "validate_pipeline.py"


def run_validate(tmp_path, args):
    env = os.environ.copy()
    env.update({
        "OPENAI_API_KEY": "test-key",
        "SUPABASE_URL": "https://example.supabase.co",
    })
    return subprocess.run(
        [sys.executable, str(SCRIPT)] + args,
        cwd=tmp_path,
        env=env,
        capture_output=True,
    )


def test_validation_success(tmp_path):
    result = run_validate(
        tmp_path,
        ["--mode", "scraping", "--site", "franceagrimer", "--max-pages", "1"],
    )
    assert result.returncode == 0


def test_validation_failure(tmp_path):
    result = run_validate(
        tmp_path,
        ["--mode", "scraping", "--site", "franceagrimer", "--max-pages", "0"],
    )
    assert result.returncode != 0
