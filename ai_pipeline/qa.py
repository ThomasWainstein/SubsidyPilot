import json
from typing import Dict, List


def compute_qa_metrics(results: List[Dict[str, str]]) -> Dict[str, object]:
    """Compute simple QA statistics from extraction results.

    The function inspects the ``structured_output`` field of each entry and
    calculates metrics such as missing outputs and field-level blank values.
    The metrics are lightweight and intended mainly for regression testing and
    developer insight rather than exhaustive auditing.
    """

    total = len(results)
    missing_output = 0
    field_counts: Dict[str, int] = {}
    field_blanks: Dict[str, int] = {}
    lengths: List[int] = []

    for entry in results:
        output = entry.get("structured_output")
        if not output:
            missing_output += 1
            continue

        lengths.append(len(output))
        try:
            data = json.loads(output)
        except json.JSONDecodeError:
            # If the model returned non-JSON text we can't do field analysis
            continue

        for field, value in data.items():
            field_counts[field] = field_counts.get(field, 0) + 1
            if value in (None, "", "N/A", "TBD", "Unknown"):
                field_blanks[field] = field_blanks.get(field, 0) + 1

    avg_length = sum(lengths) / len(lengths) if lengths else 0
    field_failure_rate = {
        field: field_blanks.get(field, 0) / count
        for field, count in field_counts.items()
    }

    return {
        "total_records": total,
        "missing_structured_output": missing_output,
        "missing_rate": missing_output / total if total else 0,
        "avg_response_length": avg_length,
        "field_failure_rate": field_failure_rate,
    }
