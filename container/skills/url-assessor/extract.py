#!/usr/bin/env python3
"""
Extract spoken transcript from an Instagram Reel URL using Supadata.
Usage: python extract.py <instagram_url>
Output: JSON with keys: transcript, url
"""
import sys
import json
import os
from supadata import Supadata


def extract(url: str) -> dict:
    client = Supadata(api_key=os.environ["SUPADATA_API_KEY"])
    try:
        result = client.transcript(url=url, text=True, mode="auto")
        transcript = result.content if hasattr(result, "content") else ""
        if not transcript:
            return {"error": "no_transcript", "url": url}
        return {"transcript": transcript, "url": url}
    except Exception as e:
        error_msg = str(e).lower()
        if "404" in error_msg or "not found" in error_msg or "private" in error_msg:
            return {"error": "private_or_unavailable", "url": url}
        return {"error": f"transcript_failed: {e}", "url": url}


if __name__ == "__main__":
    url = sys.argv[1]
    print(json.dumps(extract(url)))
