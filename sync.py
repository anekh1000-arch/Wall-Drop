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

import html
import json
import re
import sys
from pathlib import Path

from image_size import format_resolution, read_image_size

ROOT = Path(__file__).resolve().parent
DESKTOP = ROOT / "images" / "wallpapers" / "desktop"
MOBILE = ROOT / "images" / "wallpapers" / "mobile"
OUT = ROOT / "wallpapers.json"
INDEX_HTML = ROOT / "index.html"

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
        
        # Generate srcset for responsive images
        srcset = ""
        sizes = ""
        if width and height:
            sizes_list = [
                (640, int(640 * height / width)),
                (1280, int(1280 * height / width)),
                (1920, int(1920 * height / width))
            ]
            srcset_list = [f"{image_path} {w}w" for w, h in sizes_list if w <= width]
            srcset = f' srcset="{", ".join(srcset_list)}"' if srcset_list else ""
            sizes = ' sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"'
        
        # Device tag
        device_tag = "Desktop" if device == "desktop" else "Mobile"
        
        # Build card HTML
        card_html = f'''    <div class="wall-card" data-cat="{item["category"]}" data-dev="{device}" data-res="{resolution}" data-image="{image_path}" data-index="{index}" style="--wall-ar: {aspect_ratio};">
      <div class="wall-thumb"></div>
      <div class="res-badge">{resolution}</div>
      <div class="wall-overlay"><span class="wall-view-hint">View</span></div>
      <div class="card-meta">
        <span class="card-title">{html.escape(item["title"])}</span>
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

    wallpapers = scan_folder(DESKTOP, "desktop") + scan_folder(MOBILE, "mobile")
    data = {"wallpapers": wallpapers}

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"WallDrop sync: {len(wallpapers)} wallpaper(s) -> wallpapers.json")
    print(f"  desktop: {len(scan_folder(DESKTOP, 'desktop'))}")
    print(f"  mobile:  {len(scan_folder(MOBILE, 'mobile'))}")
    if not wallpapers:
        print("  (drop JPG/PNG/WebP into images/wallpapers/desktop or mobile)")

    # Generate static gallery HTML for SSG
    gallery_html = generate_gallery_html(wallpapers)
    
    # Inject into index.html
    if INDEX_HTML.exists():
        with open(INDEX_HTML, "r", encoding="utf-8") as f:
            html_content = f.read()
        
        # Replace the gallery section with pre-rendered HTML
        placeholder = "<!-- GALLERY -->\n<div class=\"gallery-wrap\">\n  <h2 class=\"visually-hidden\">Wallpaper Gallery</h2>\n  <div class=\"gallery\" id=\"gallery\">\n    <div class=\"empty-state visible\" id=\"emptyState\">\n      <div class=\"empty-title\">No wallpapers yet</div>\n      <p>Copy images into <strong>images/wallpapers/desktop</strong> or <strong>mobile</strong>, then run <strong>update-gallery.bat</strong>.</p>\n    </div>\n\n  </div>\n</div>"
        
        if gallery_html:
            new_gallery = f"""<!-- GALLERY -->
<div class="gallery-wrap">
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
