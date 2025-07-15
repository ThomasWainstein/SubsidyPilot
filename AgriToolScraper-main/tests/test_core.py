import pytest
from scraper.core import guess_canonical_field_fr

idf_chambres_labels = [
    "Titre de l’aide", "Présentation", "Critère d’éligibilité", "Pièces jointes", "Date limite", "Montant", "Type de financement"
]
franceagrimer_labels = [
    "Titre", "Description", "Éligibilité", "Documents à joindre", "Date de clôture"
]

@pytest.mark.parametrize("label,expected", [
    ("Titre de l’aide", "title"),
    ("Présentation", "description"),
    ("Critère d’éligibilité", "eligibility"),
    ("Pièces jointes", "documents"),
    ("Date limite", "deadline"),
    ("Montant", "amount"),
    ("Type de financement", "funding_type"),
])
def test_idf_chambres_keyword_mapping(label, expected):
    mapped = guess_canonical_field_fr(label)
    assert mapped == expected, f"For label '{label}', expected '{expected}', got '{mapped}'"

@pytest.mark.parametrize("label,expected", [
    ("Titre", "title"),
    ("Description", "description"),
    ("Éligibilité", "eligibility"),
    ("Documents à joindre", "documents"),
    ("Date de clôture", "deadline"),
])
def test_franceagrimer_keyword_mapping(label, expected):
    mapped = guess_canonical_field_fr(label)
    assert mapped == expected, f"For label '{label}', expected '{expected}', got '{mapped}'"
