# WallDrop on Vercel

**Live site:** https://wall-drops.vercel.app/

Repo: [anekh1000-arch/Wall-Drop](https://github.com/anekh1000-arch/Wall-Drop) — site files are in **`Webpage/`**.

## How deployment works

`vercel.repo.json` (copied to the **repo root** as `vercel.json` by `push-github.bat`) tells Vercel:

- Run `npm run build` inside `Webpage/`
- Serve static files from `Webpage/` as the site root

You do **not** need to set Root Directory in the Vercel dashboard when this file is at the repo root.

`Webpage/vercel.json` is the same config if you ever set Root Directory to `Webpage` instead.

## Vercel dashboard (one-time)

1. Import **anekh1000-arch/Wall-Drop** from GitHub.
2. **Framework Preset:** Other  
3. **Environment variable** (Production):  
   - `SITE_URL` = `https://wall-drops.vercel.app`
4. Deploy. Each `push-github.bat` run triggers a new deploy.

## Publish from your PC

1. Edit in `D:\Webpage`
2. Double-click **`push-github.bat`**
3. Wait for **Push OK**

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 404 NOT_FOUND | Ensure repo root has `vercel.json` (run `push-github.bat`). Clear **Root Directory** in Vercel settings (leave empty) *or* set it to `Webpage` — not both wrongly. |
| Empty gallery | Build must run: `npm run build` in `Webpage/`. Check deployment build logs. |
| Git errors | Script auto-repairs; or re-clone `D:\Wall-Drop` |

## Shared download counts (desktop + mobile)

Download totals sync across all visitors when storage is enabled:

1. Vercel project → **Storage** → create **Upstash Redis** (free tier) and link it to the project, **or** enable **Blob** storage.
2. Redeploy. The site uses `/api/downloads` to read/write counts.

Without storage, counts stay in each browser only (localStorage).

## Custom domain

Vercel → **Settings → Domains**, add your domain, set `SITE_URL` to that HTTPS URL, redeploy.
