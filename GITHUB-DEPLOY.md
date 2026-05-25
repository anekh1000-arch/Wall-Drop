# Publish local changes to GitHub (live website)

Your live site only updates when you **push** files from `D:\Webpage` to GitHub. Editing locally does not change GitHub by itself.

## One-time setup

1. Install **Git**: https://git-scm.com/download/win  
2. Open **PowerShell** in your project folder:

```powershell
cd D:\Webpage
git init
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

Replace with your real GitHub repo URL (from the green **Code** button on GitHub).

## Every time you change wallpapers or the site

```powershell
cd D:\Webpage

# 1) Refresh the wallpaper list from your image folders
python sync.py
# or: py sync.py

# 2) Commit everything
git add .
git commit -m "Update wallpapers and site"

# 3) Publish to GitHub (live site updates in 1–2 minutes)
git push origin main
```

If your default branch is `master`, use:

```powershell
git push origin master
```

## What to upload

Include the whole site:

- `index.html`, `view.html`, `gallery.js`, `wallpapers.json`
- `images/wallpapers/desktop/` and `mobile/` (all image files)
- `sync.py`, `update-gallery.bat`, CSS/JS files

## GitHub Pages

In the repo: **Settings → Pages →** source = branch **main** (or **master**), folder **/ (root)**.

Your site URL is usually: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## Download counts

Download totals are stored in each visitor’s **browser** (`localStorage`). They no longer reset when you add wallpapers. They are **not** stored in GitHub unless you add a backend later.
