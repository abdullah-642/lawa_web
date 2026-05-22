"""
Background remover for client logos.

Usage:
  1) Install once:
       pip install rembg pillow
  2) Drop original logo images in:  assets/clients/raw/
  3) Run:
       python -X utf8 _remove_bg.py
  4) Processed PNGs (transparent bg) saved to:  assets/clients/

Tip: rename your files to match the exact names expected by the site
(see assets/clients/README.txt) before processing.
"""
import os, sys

try:
    from rembg import remove
    from PIL import Image
    import io
except ImportError:
    print("Missing dependencies. Run: pip install rembg pillow")
    sys.exit(1)

RAW = os.path.join("assets", "clients", "raw")
OUT = os.path.join("assets", "clients")

if not os.path.isdir(RAW):
    os.makedirs(RAW, exist_ok=True)
    print(f"Created {RAW}/ — drop your logo files here and re-run.")
    sys.exit(0)

processed = 0
for fn in os.listdir(RAW):
    src = os.path.join(RAW, fn)
    if not os.path.isfile(src):
        continue
    name, ext = os.path.splitext(fn)
    if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
        continue
    out_path = os.path.join(OUT, f"{name}.png")
    print(f"Processing {fn} -> {out_path}")
    with open(src, "rb") as f:
        data = f.read()
    result = remove(data)
    with open(out_path, "wb") as f:
        f.write(result)
    processed += 1

print(f"\nDone. {processed} logos processed.")
