# WallDrop — Quick setup

## Owner: add images (2 steps)

1. Put files in `images/wallpapers/desktop/` or `mobile/`
2. Double-click **`update-gallery.bat`**

Refresh the browser. Done.

## View the site

```powershell
cd D:\Webpage
python -m http.server 8080
```

→ http://localhost:8080  
Owner help: http://localhost:8080/admin.html

Use `py` instead of `python` if needed.

## Filename tips

| File name | Result |
|-----------|--------|
| `sagittarius-black.jpg` | Desktop/mobile from folder, category **dark**, title from name |
| `minimal--slate.jpg` | Category **minimal** |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Gallery empty | Run `update-gallery.bat`, then refresh |
| Python missing | Install from python.org, enable PATH, or use `py sync.py` |
| Wrong filter | Rename with prefix e.g. `minimal--name.jpg` and sync again |

No upload server required.
