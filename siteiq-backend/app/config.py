import json
import os

from dotenv import load_dotenv

load_dotenv()

# ── Cache ────────────────────────────────────────────────────────────────────
CACHE_DIR = os.getenv("CACHE_DIR", "./.cache")
CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days

# ── Earth Engine service account ────────────────────────────────────────────
raw_key = os.getenv("EE_SERVICE_ACCOUNT_JSON")

if raw_key is None:
    raise RuntimeError("EE_SERVICE_ACCOUNT_JSON is not set. Check Render Environment tab.")

key_dict = json.loads(raw_key)
