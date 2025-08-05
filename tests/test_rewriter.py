import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from project_rewriter import optimize_project_description


def test_optimize_project_description():
    text = "This farm will be very efficient."
    result = optimize_project_description(text)
    assert result["original"] == text
    assert "agricultural project" in result["optimized"]
    assert "farm -> agricultural project" in result["changes"]
