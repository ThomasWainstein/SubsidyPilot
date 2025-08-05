"""Supabase datastore utilities for saving subsidy records.

The module exposes a :func:`save_subsidy` helper which inserts a single
subsidy dictionary into the ``subsidies`` table. Connection details are
read from environment variables and a minimal amount of error handling is
performed to keep the function resilient during batch operations.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from supabase import Client, create_client


def get_client() -> Client:
    """Create and return a Supabase client from environment variables."""

    load_dotenv()
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Missing Supabase URL or service role key in environment variables")
    return create_client(url, key)


def save_subsidy(data: Dict[str, Any], client: Optional[Client] = None) -> bool:
    """Persist a single subsidy record to Supabase.

    Parameters
    ----------
    data:
        Subsidy information to insert.
    client:
        Optional existing Supabase client to reuse. When ``None`` a new
        client is created for the call.

    Returns
    -------
    bool
        ``True`` if the insert succeeded, ``False`` otherwise.
    """

    client = client or get_client()
    try:
        response = client.table("subsidies").insert(data).execute()
        # ``error`` attribute is used by supabase-py >=2.0
        if getattr(response, "error", None):  # pragma: no cover - defensive
            print(f"[Supabase] Error saving '{data.get('title', 'unknown')}': {response.error}")
            return False
        print(f"[Supabase] Saved: {data.get('title', 'unknown')}")
        return True
    except Exception as exc:  # pragma: no cover - network failure path
        print(f"[Supabase] Exception saving '{data.get('title', 'unknown')}': {exc}")
        return False


__all__ = ["save_subsidy", "get_client"]
