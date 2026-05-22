"""Notify search engines (Bing, Yandex, Seznam, IndexNow consortium) of all
current URLs via IndexNow. Run once after every significant content change.

Usage:
    python -X utf8 _indexnow_ping.py

Requires the key file (q4fk8p5789hx7m0ksngisk7hsx1ejw9o.txt) to be live
at https://www.liwa1.com/<KEY>.txt — that's already in the repo.
"""
import json
import re
import urllib.request
import urllib.error

KEY = "q4fk8p5789hx7m0ksngisk7hsx1ejw9o"
HOST = "www.liwa1.com"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"

# Extract all URLs from sitemap
with open("sitemap.xml", "r", encoding="utf-8") as f:
    sitemap = f.read()
urls = re.findall(r"<loc>([^<]+)</loc>", sitemap)
print(f"Loaded {len(urls)} URLs from sitemap.xml")

payload = {
    "host": HOST,
    "key": KEY,
    "keyLocation": KEY_LOCATION,
    "urlList": urls,
}

endpoints = [
    "https://api.indexnow.org/IndexNow",
    "https://www.bing.com/indexnow",
    "https://yandex.com/indexnow",
]

data = json.dumps(payload).encode("utf-8")

for ep in endpoints:
    req = urllib.request.Request(
        ep,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            print(f"  [{resp.status}] {ep}")
    except urllib.error.HTTPError as e:
        # 200/202 = success; 422 = some URLs queued
        print(f"  [{e.code}] {ep} — {e.reason}")
    except Exception as e:
        print(f"  [ERR] {ep} — {e}")

print("Done. Bing/Yandex/Seznam should re-crawl listed URLs within minutes.")
