# Publish local changes to GitHub (live website)

Repo: [anekh1000-arch/Wall-Drop](https://github.com/anekh1000-arch/Wall-Drop)

Your site files live in the **`Webpage`** folder on GitHub. Edit locally in `D:\Webpage`, then publish with **`push-github.bat`** (easiest) or the steps below.

Live URL (after Pages is enabled):  
`https://anekh1000-arch.github.io/Wall-Drop/Webpage/`

## One-time setup

1. Install **Git**: https://git-scm.com/download/win  
2. Clone the repo once:

```powershell
git clone https://github.com/anekh1000-arch/Wall-Drop.git D:\Wall-Drop
```

Keep working in `D:\Webpage` as usual. The push script copies your files into `D:\Wall-Drop\Webpage` before each push.

## Every time you change wallpapers or the site

**Easy:** double-click `D:\Webpage\push-github.bat`

**Or manually:**

```powershell
cd D:\Webpage
python sync.py
robocopy D:\Webpage D:\Wall-Drop\Webpage /E /XD .git __pycache__
cd D:\Wall-Drop
git add -A
git commit -m "Update wallpapers and site"
git push
```

## GitHub Pages

In the repo: **Settings → Pages →** branch **main**, folder **/ (root)**.

Open: `https://anekh1000-arch.github.io/Wall-Drop/Webpage/`

---

## Download counts

Download totals are stored in each visitor’s **browser** (`localStorage`). They no longer reset when you add wallpapers. They are **not** stored in GitHub unless you add a backend later.
