import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from nlp_classifier import classify_project_text


def test_classifier_heuristics():
    text = (
        "This project develops solar panels on farmland in Occitanie "
        "for an SAS company raising livestock."
    )
    result = classify_project_text(text)
    assert result["project_type"] == "agri-voltaic"
    assert result["region"] == "Occitanie"
    assert result["legal_entity"] == "SAS"
    assert "solar" in result["keywords"]
    assert "livestock" in result["keywords"]
