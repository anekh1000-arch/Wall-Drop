# WallDrop — Owner guide (simple)

## Add as many wallpapers as you want

1. Copy images into:
   - `images/wallpapers/desktop/` — PC wallpapers  
   - `images/wallpapers/mobile/` — phone wallpapers  

2. Double-click **`update-gallery.bat`** (or run `python sync.py`)

3. Refresh the site in the browser

That rebuilds **`wallpapers.json`** automatically. You do not edit JSON by hand unless you want to.

## Change display names (owner option)

If you want custom names for uploaded images, edit `title-overrides.json`.

Example:

```json
{
  "my-image.jpg": "Midnight Circuit",
  "mobile/wallpaper-22.png": "Pocket Noir"
}
```

- Left side = exact filename (or `mobile/filename` / `desktop/filename`)
- Right side = name shown on website cards and preview
- File paths for download stay unchanged

## Category from filename (optional)

```
dark--night-city.jpg
minimal--plain-grey.jpg
abstract--waves.png
```

Prefix must be one of: `dark`, `minimal`, `abstract`, `monochrome`, `gradient`  
Then `--` then the rest of the name.

## View locally

```powershell
cd D:\Webpage
python -m http.server 8080
```

Open http://localhost:8080

## Publish online

Upload the whole `Webpage` folder including `images/wallpapers/` and `wallpapers.json` (run `update-gallery.bat` before uploading).

## Third-party options (later)

| Tool | Best for |
|------|----------|
| **Decap CMS** | Browser editor + Netlify/GitHub hosting |
| **Cloudinary** | Many large images; CDN URLs in JSON |
| **Netlify Drop** | Drag entire site folder to deploy |

Day-to-day on your PC: **folders + update-gallery.bat** is enough.
