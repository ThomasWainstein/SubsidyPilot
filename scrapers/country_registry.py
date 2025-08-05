"""Registry of supported countries and agencies."""

COUNTRY_CONFIGS = {
    "france": {
        "agencies": ["franceagrimer", "bpifrance"],
        "languages": ["fr"],
        "rate_limits": {"requests_per_minute": 60},
        "document_types": ["pdf", "html"],
    },
    "spain": {
        "agencies": ["mapama"],
        "languages": ["es"],
        "rate_limits": {"requests_per_minute": 30},
        "document_types": ["pdf", "html", "doc"],
    },
    "germany": {
        "agencies": ["ble"],
        "languages": ["de"],
        "rate_limits": {"requests_per_minute": 45},
        "document_types": ["pdf", "html"],
    },
    "romania": {
        "agencies": ["afir"],
        "languages": ["ro"],
        "rate_limits": {"requests_per_minute": 30},
        "document_types": ["pdf", "html"],
    },
}
