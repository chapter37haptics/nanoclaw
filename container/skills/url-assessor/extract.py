#!/usr/bin/env python3
"""
Extract Instagram post metadata + transcript from a URL.
Usage: python extract.py <instagram_url>
Output: JSON with keys: poster, date, caption, transcript, url
"""
import sys
import json
import os
import requests
from supadata import Supadata

def extract(url: str) -> dict:
    # HikerAPI: metadata
    hiker_resp = requests.get(
        "https://api.hikerapi.com/v1/media/by/url",
        params={"url": url},
        headers={"Authorization": f"Bearer {os.environ['HIKERAPI_KEY']}"},
        timeout=15,
    )
    if hiker_resp.status_code == 404:
        return {"error": "private_or_unavailable"}
    hiker_resp.raise_for_status()
    media = hiker_resp.json()

    # Supadata: transcript
    client = Supadata(api_key=os.environ["SUPADATA_API_KEY"])
    try:
        result = client.transcript(url=url, text=True, mode="auto")
        transcript = result.content if hasattr(result, "content") else ""
    except Exception as e:
        transcript = f"[transcript unavailable: {e}]"

    return {
        "poster": media.get("user", {}).get("username", "unknown"),
        "date": media.get("taken_at", "unknown"),
        "caption": media.get("caption_text", ""),
        "transcript": transcript,
        "url": url,
    }

if __name__ == "__main__":
    url = sys.argv[1]
    print(json.dumps(extract(url)))
