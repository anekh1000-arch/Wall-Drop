# WallDrop — faster image loading

Large PNG/JPEG wallpapers slow the gallery on mobile and Netlify bandwidth.

## Recommended workflow

1. **Export WebP** at ~85% quality (often 40–70% smaller than PNG/JPEG).
2. Keep originals in `images/wallpapers/desktop/` — `npm run build` picks up `.webp` automatically.
3. Optional: add **AVIF** copies for modern browsers (manual `<picture>` later).

## Quick tools

- [Squoosh](https://squoosh.app/) — drag images, export WebP
- `cwebp input.jpg -q 85 -o output.webp` (Google WebP tools)
- Batch on Windows: IrfanView, XnConvert, or ImageMagick:

```powershell
magick mogrify -format webp -quality 85 *.jpg
```

## Build

Netlify runs `npm run build` → `generate-gallery.js` refreshes `wallpapers.json` from whatever files are in the wallpaper folders.
