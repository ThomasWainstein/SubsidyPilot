"""AI extractor module with model and prompt dispatching."""
from pathlib import Path
from typing import Dict

PROMPT_DIR = Path(__file__).parent / "ai" / "prompts"

MODEL_REGISTRY: Dict[str, str] = {
    "gpt-4": "openai:gpt-4",
    "claude": "anthropic:claude-v1",
    "local": "local-model",
}

PROMPT_FILES: Dict[str, str] = {
    "fr": "fr_en_funding.txt",
    "es": "es_subvenciones.txt",
    "de": "de_foerderung.txt",
}


def get_model(model_name: str) -> str:
    """Return model identifier from registry."""
    return MODEL_REGISTRY.get(model_name.lower(), MODEL_REGISTRY["gpt-4"])


def load_prompt(language: str) -> str:
    """Load prompt template for given language."""
    file_name = PROMPT_FILES.get(language.lower())
    if not file_name:
        raise ValueError(f"No prompt template for language '{language}'")
    file_path = PROMPT_DIR / file_name
    return file_path.read_text(encoding="utf-8")


def run_ai_pipeline(
    batch_folder: str = "batches", model_name: str = "gpt-4", language: str = "fr"
) -> None:
    """Run AI processing pipeline using provided configuration."""
    model = get_model(model_name)
    prompt = load_prompt(language)
    print(
        f"Running AI pipeline with model '{model}' on batches in '{batch_folder}'"
    )
    print(f"Using prompt snippet: {prompt[:40]}...")
