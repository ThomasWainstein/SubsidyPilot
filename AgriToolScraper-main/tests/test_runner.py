import os
import csv
import pytest

CANONICAL_FIELDS = [
    "url", "title", "description", "eligibility", "documents", "deadline",
    "amount", "program", "agency", "region", "sector", "funding_type",
    "co_financing_rate", "project_duration", "payment_terms", "application_method",
    "evaluation_criteria", "previous_acceptance_rate", "priority_groups",
    "legal_entity_type", "funding_source", "reporting_requirements",
    "compliance_requirements", "language", "technical_support", "matching_algorithm_score"
]

def test_consultant_data_csv_exists():
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "extracted", "consultant_data.csv")
    assert os.path.exists(csv_path), \
        f"consultant_data.csv was not found at {csv_path}. Run a scrape first!"

def test_consultant_data_csv_fields():
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "extracted", "consultant_data.csv")
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames

        missing_fields = [f for f in CANONICAL_FIELDS if f not in header]
        extra_fields = [f for f in header if f not in CANONICAL_FIELDS]

        print("\n========== CSV HEADER DEBUG ==========")
        print(f"Header fields ({len(header)}): {header}")
        print(f"Missing canonical fields ({len(missing_fields)}): {missing_fields}")
        print(f"Extra (non-canonical) fields ({len(extra_fields)}): {extra_fields}")
        print("======================================\n")

        # Print the first data row, if available, for field visibility
        rows = list(reader)
        if rows:
            print("First data row sample:")
            print(rows[0])
        else:
            print("CSV is empty!")

        # All canonical fields must be present
        assert set(CANONICAL_FIELDS).issubset(header), \
            f"Not all canonical fields are present in the CSV header! Missing: {missing_fields} Extra: {extra_fields}"

        # No unexpected fields
        for field in header:
            assert field in CANONICAL_FIELDS, f"Unexpected field in CSV: {field}"

        # At least one row or skip
        if len(rows) == 0:
            pytest.skip("CSV file is empty—no records to check.")

        # Every row must have all canonical fields (may be 'N/A' but must exist)
        for i, row in enumerate(rows):
            for field in CANONICAL_FIELDS:
                assert field in row, f"Missing field {field} in row {i+1}"

        # Optional: warn if all fields are 'N/A' in any row
        for i, row in enumerate(rows):
            if all(row[field] == "N/A" for field in CANONICAL_FIELDS):
                print(f"WARNING: Row {i+1} is all 'N/A' (check extraction logic).")

