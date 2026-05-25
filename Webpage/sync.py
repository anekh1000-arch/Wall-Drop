"""
Rebuild wallpapers.json from images in desktop/ and mobile/ folders.

Drop images into:
  images/wallpapers/desktop/
  images/wallpapers/mobile/

Optional filename prefix for category:
  dark--my-wall.jpg   → category: dark, title: My Wall
  minimal--slate.png  → category: minimal

Without prefix → category defaults to "dark", title from filename.

Run:  python sync.py   (or double-click update-gallery.bat)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from image_size import format_resolution, read_image_size

ROOT = Path(__file__).resolve().parent
DESKTOP = ROOT / "images" / "wallpapers" / "desktop"
MOBILE = ROOT / "images" / "wallpapers" / "mobile"
OUT = ROOT / "wallpapers.json"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
CATEGORIES = {"dark", "minimal", "abstract", "monochrome", "gradient"}
FALLBACK_RES = {"desktop": "3840×2160", "mobile": "1284×2778"}


def title_from_stem(stem: str) -> str:
    s = stem.replace("-", " ").replace("_", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s.title() if s else "Untitled"


def parse_filename(name: str) -> tuple[str, str, str]:
    """Return (category, title_stem, filename)."""
    stem = Path(name).stem
    if "--" in stem:
        prefix, rest = stem.split("--", 1)
        cat = prefix.strip().lower()
        if cat in CATEGORIES and rest.strip():
            return cat, rest.strip(), name
    return "dark", stem, name


def scan_folder(folder: Path, device: str) -> list[dict]:
    items = []
    if not folder.is_dir():
        return items
    for path in sorted(folder.iterdir()):
        if path.suffix.lower() not in IMAGE_EXT:
            continue
        cat, title_stem, filename = parse_filename(path.name)
        size = read_image_size(path)
        res = format_resolution(*size) if size else FALLBACK_RES[device]
        entry = {
            "title": title_from_stem(title_stem),
            "category": cat,
            "device": device,
            "resolution": res,
            "image": filename,
        }
        if size:
            entry["width"] = size[0]
            entry["height"] = size[1]
        items.append(entry)
    return items


def main() -> int:
    DESKTOP.mkdir(parents=True, exist_ok=True)
    MOBILE.mkdir(parents=True, exist_ok=True)

    wallpapers = scan_folder(DESKTOP, "desktop") + scan_folder(MOBILE, "mobile")
    data = {"wallpapers": wallpapers}

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"WallDrop sync: {len(wallpapers)} wallpaper(s) → wallpapers.json")
    print(f"  desktop: {len(scan_folder(DESKTOP, 'desktop'))}")
    print(f"  mobile:  {len(scan_folder(MOBILE, 'mobile'))}")
    if not wallpapers:
        print("  (drop JPG/PNG/WebP into images/wallpapers/desktop or mobile)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
