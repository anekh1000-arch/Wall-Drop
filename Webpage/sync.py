"""
Rebuild wallpapers.json from images in desktop/ and mobile/ folders.

Drop images into:
  images/wallpapers/desktop/
  images/wallpapers/mobile/
  images/wallpapers/mac/

Optional filename prefix for category:
  dark--my-wall.jpg   → category: dark, title: My Wall
  minimal--slate.png  → category: minimal

Without prefix → category defaults to "dark", title from filename.

Run:  python sync.py   (or double-click update-gallery.bat)
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

from image_size import format_resolution, read_image_size

ROOT = Path(__file__).resolve().parent
DESKTOP = ROOT / "images" / "wallpapers" / "desktop"
MOBILE = ROOT / "images" / "wallpapers" / "mobile"
MAC = ROOT / "images" / "wallpapers" / "mac"
OUT = ROOT / "wallpapers.json"
INDEX_HTML = ROOT / "index.html"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
CATEGORIES = {"dark", "minimal", "abstract", "monochrome"}
FALLBACK_RES = {"desktop": "3840×2160", "mobile": "1284×2778", "mac": "3024×1964"}


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


def generate_gallery_html(wallpapers: list[dict]) -> str:
    """Generate static HTML for gallery cards to reduce client-side rendering."""
    if not wallpapers:
        return ""
    
    html_parts = []
    for index, item in enumerate(wallpapers):
        # Resolve image path
        device = item["device"]
        image_path = f"images/wallpapers/{device}/{item['image']}"
        resolution = item["resolution"]
        width = item.get("width", "")
        height = item.get("height", "")
        aspect_ratio = f"{width} / {height}" if width and height else "auto"
        
        # Device tag
        device_tag_map = {"desktop": "Desktop", "mobile": "Mobile", "mac": "Mac"}
        device_tag = device_tag_map.get(device, device)
        
        # Build card HTML (simplified version matching Webpage structure)
        card_html = f'''    <div class="wall-card" data-cat="{item["category"]}" data-dev="{device}" data-res="{resolution}" data-image="{image_path}" data-index="{index}" style="--wall-ar: {aspect_ratio};">
      <a class="wall-card-link" href="#">
        <div class="wall-thumb"></div>
        <div class="res-badge">{resolution}</div>
        <div class="wall-overlay"><span class="wall-view-hint">View</span></div>
      </a>
      <div class="card-meta">
        <div class="card-text">
          <span class="card-title">{html.escape(item["title"])}</span>
          <span class="card-subtitle">Curated · 4K</span>
        </div>
        <div class="card-right">
          <span class="tag">{device_tag}</span>
          <span class="dl-count" data-dlkey="{index}">0 dls</span>
        </div>
      </div>
    </div>'''
        html_parts.append(card_html)
    
    return "\n" + "\n".join(html_parts)


def main() -> int:
    DESKTOP.mkdir(parents=True, exist_ok=True)
    MOBILE.mkdir(parents=True, exist_ok=True)
    MAC.mkdir(parents=True, exist_ok=True)

    wallpapers = (
        scan_folder(DESKTOP, "desktop")
        + scan_folder(MOBILE, "mobile")
        + scan_folder(MAC, "mac")
    )
    data = {"wallpapers": wallpapers}

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"WallDrop sync: {len(wallpapers)} wallpaper(s) -> wallpapers.json")
    print(f"  desktop: {len(scan_folder(DESKTOP, 'desktop'))}")
    print(f"  mobile:  {len(scan_folder(MOBILE, 'mobile'))}")
    print(f"  mac:     {len(scan_folder(MAC, 'mac'))}")
    if not wallpapers:
        print("  (drop JPG/PNG/WebP into images/wallpapers/desktop, mobile, or mac)")

    # Generate static gallery HTML for SSG
    gallery_html = generate_gallery_html(wallpapers)
    
    # Inject into index.html
    if INDEX_HTML.exists():
        with open(INDEX_HTML, "r", encoding="utf-8") as f:
            html_content = f.read()
        
        # Replace the gallery section with pre-rendered HTML
        placeholder = "<!-- GALLERY -->\n<div class=\"gallery-wrap\" data-reveal>\n  <h2 class=\"visually-hidden\">Wallpaper Gallery</h2>\n  <div class=\"gallery\" id=\"gallery\">\n    <div class=\"empty-state visible\" id=\"emptyState\">\n      <div class=\"empty-title\">No wallpapers yet</div>\n      <p>Add wallpapers to <strong>images/wallpapers/desktop</strong>, <strong>mac</strong>, or <strong>mobile</strong>, then deploy. Vercel rebuilds the gallery automatically.</p>\n      <span class=\"empty-hint\">Tip: convert large PNGs to WebP for faster loads — see PERFORMANCE.md</span>\n    </div>\n\n  </div>\n</div>"
        
        if gallery_html:
            new_gallery = f"""<!-- GALLERY -->
<div class="gallery-wrap" data-reveal>
  <h2 class="visually-hidden">Wallpaper Gallery</h2>
  <div class="gallery" id="gallery">{gallery_html}
  </div>
</div>"""
            html_content = html_content.replace(placeholder, new_gallery)
            print(f"  SSG: Pre-rendered {len(wallpapers)} wallpaper cards into index.html")
        
        with open(INDEX_HTML, "w", encoding="utf-8") as f:
            f.write(html_content)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
