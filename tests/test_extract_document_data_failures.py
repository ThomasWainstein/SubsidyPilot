import os
import time
import json
import subprocess
import requests
import pytest

SERVER_PATH = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'functions', 'extract-document-data', 'index.ts')
CA_CERT = '/usr/local/share/ca-certificates/envoy-mitmproxy-ca-cert.crt'


def start_server(env_overrides=None):
    env = os.environ.copy()
    env['PATH'] = os.environ.get('PATH', '')
    env['DENO_CERT'] = CA_CERT
    if env_overrides:
        env.update(env_overrides)
    proc = subprocess.Popen([
        'deno', 'run', '--allow-net', '--allow-env', SERVER_PATH
    ], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(2)
    return proc

def stop_server(proc):
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()

@pytest.fixture
def missing_key_server():
    proc = start_server({
        'NEXT_PUBLIC_SUPABASE_URL': 'https://example.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'service-key'
        # SCRAPER_RAW_GPT_API intentionally missing
    })
    yield proc
    stop_server(proc)

def test_missing_openai_key_returns_error(missing_key_server):
    payload = {
        'documentId': 'doc1',
        'fileUrl': 'https://gvfgvbztagafjykncwto.supabase.co/storage/v1/object/public/docs/test.pdf',
        'fileName': 'test.pdf'
    }
    resp = requests.post('http://localhost:8000', json=payload)
    data = resp.json()
    assert resp.status_code == 500
    assert 'SCRAPER_RAW_GPT_API key not configured' in data.get('error', '')

import tempfile

def call_store_extraction_result():
    script = """
import { storeExtractionResult } from '/workspace/agri-tool-mvp/supabase/functions/extract-document-data/databaseService.ts';
const result = await storeExtractionResult('doc1', {}, 'https://invalid.localhost', 'invalid');
console.log(JSON.stringify(result));
"""
    env = os.environ.copy()
    env['PATH'] = os.environ.get('PATH', '')
    env['DENO_CERT'] = CA_CERT
    completed = subprocess.run([
        'deno', 'eval', script
    ], capture_output=True, text=True, env=env)
    last_line = completed.stdout.strip().split('\n')[-1]
    return json.loads(last_line)

def test_store_extraction_result_handles_failure():
    result = call_store_extraction_result()
    assert result['success'] is False
    assert 'Failed to store extraction' in result['error'] or 'Database insertion failed' in result['error']
