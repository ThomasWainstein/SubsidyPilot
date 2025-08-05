"""Tests for the Supabase datastore helper."""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from datastore import save_subsidy


class _DummyTable:
    def __init__(self) -> None:
        self.inserted = None

    def insert(self, data):
        self.inserted = data
        return self

    def execute(self):
        class _Resp:
            error = None

        return _Resp()


class _DummyClient:
    def __init__(self) -> None:
        self.table_obj = _DummyTable()

    def table(self, name):
        assert name == "subsidies"
        return self.table_obj


def test_save_subsidy_inserts_record():
    client = _DummyClient()
    data = {"title": "Test"}

    assert save_subsidy(data, client=client) is True
    assert client.table_obj.inserted == data
