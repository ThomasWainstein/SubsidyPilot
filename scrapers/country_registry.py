"""Registry of supported countries, agencies and config references."""

COUNTRY_CONFIGS = {
    "france": {
        "agencies": ["franceagrimer", "bpifrance"],
        "languages": ["fr"],
        "rate_limits": {"requests_per_minute": 60},
        "document_types": ["pdf", "html"],
        "agency_configs": {
            "franceagrimer": "scrapers/configs/franceagrimer.json",
            "idf_chambres": "scrapers/configs/idf_chambres_listings.json",
            "idf_chambres_detail": "scrapers/configs/idf_chambres_detail.json",
        },
    },
    "spain": {
        "agencies": ["mapama"],
        "languages": ["es"],
        "rate_limits": {"requests_per_minute": 30},
        "document_types": ["pdf", "html", "doc"],
        "agency_configs": {},
    },
    "germany": {
        "agencies": ["ble"],
        "languages": ["de"],
        "rate_limits": {"requests_per_minute": 45},
        "document_types": ["pdf", "html"],
        "agency_configs": {},
    },
    "romania": {
        "agencies": ["afir", "apia_procurements", "oportunitati_ue"],
        "languages": ["ro"],
        "rate_limits": {"requests_per_minute": 60},
        "document_types": ["pdf", "html"],
        "agency_configs": {
            "afir": "scrapers/configs/afir.json",
            "apia_procurements": "scrapers/configs/apia_procurements.json",
            "oportunitati_ue": "scrapers/configs/oportunitati_ue.json",
            "oportunitati_detail": "scrapers/configs/oportunitati_detail.json",
        },
    },
    "eu": {
        "agencies": ["ec_horizon_detail"],
        "languages": ["en"],
        "rate_limits": {"requests_per_minute": 60},
        "document_types": ["pdf", "html"],
        "agency_configs": {
            "ec_horizon_detail": "scrapers/configs/ec_horizon_detail.json",
        },
    },
    "romania": {
        "agencies": ["afir"],
        "languages": ["ro"],
        "rate_limits": {"requests_per_minute": 30},
        "document_types": ["pdf", "html"],
    },
}
