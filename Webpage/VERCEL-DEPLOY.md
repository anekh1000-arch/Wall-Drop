# Deploy WallDrop on Vercel

Repo on GitHub: [anekh1000-arch/Wall-Drop](https://github.com/anekh1000-arch/Wall-Drop)

**Important:** the live site files are in the **`Webpage`** folder, not the repo root. Vercel must use that folder or you will get **404 NOT_FOUND**.

## Vercel project settings

In the Vercel dashboard → your project → **Settings → General**:

| Setting | Value |
|---------|--------|
| **Root Directory** | `Webpage` |
| **Framework Preset** | Other (or None) |
| **Build Command** | `npm run build` |
| **Output Directory** | `.` (dot = same folder as `index.html`) |
| **Install Command** | leave empty, or `npm install` if you add dependencies later |

`vercel.json` in `Webpage/` repeats these settings for consistency.

## Environment variable

**Settings → Environment Variables**

| Name | Value | Environments |
|------|--------|----------------|
| `SITE_URL` | `https://wall-drops.vercel.app` | Production |

Live site: **https://wall-drops.vercel.app/**

After adding or changing `SITE_URL`, redeploy so `sitemap.xml` and `robots.txt` use the correct domain.

## Publish code from your PC

1. Edit in `D:\Webpage`
2. Run **`push-github.bat`** (copies into `D:\Wall-Drop\Webpage` and pushes)
3. Vercel redeploys automatically on push

## If you still see 404

1. Confirm **Root Directory** is exactly `Webpage` (case-sensitive).
2. Open the latest deployment → **Build Logs** — build should finish without errors.
3. Open **Deployment → Source** and check that `index.html` appears at the top level of the deployed output (not only under another folder).

## Custom domain

**Settings → Domains** → add your domain, then set `SITE_URL` to that HTTPS URL and redeploy.
