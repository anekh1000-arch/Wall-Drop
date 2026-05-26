#!/usr/bin/env node
'use strict';

/**
 * Build sitemap.xml (and robots.txt) from wallpapers.json on every deploy/build.
 * Run: node generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_SITEMAP = path.join(ROOT, 'sitemap.xml');
const OUT_ROBOTS = path.join(ROOT, 'robots.txt');
const DATA = path.join(ROOT, 'wallpapers.json');
const SITE_URL = (process.env.SITE_URL || 'https://wall-drops.netlify.app').replace(/\/+$/, '');
const LICENSE_URL = `${SITE_URL}/license.html`;

const FALLBACK_RES = { desktop: '3840×2160', mobile: '1284×2778' };

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absUrl(relativePath) {
  const clean = String(relativePath || '').replace(/^\/+/, '');
  return `${SITE_URL}/${clean}`;
}

function resolveImagePath(item) {
  const dev = item.device === 'mobile' ? 'mobile' : 'desktop';
  const raw = String(item.image || '').replace(/\\/g, '/').trim();
  if (!raw) return null;
  if (raw.includes('/')) return raw.replace(/^\/+/, '');
  return `images/wallpapers/${dev}/${raw}`;
}

function buildViewQuery(item, index, imagePath) {
  const resolution =
    item.width && item.height
      ? `${item.width}×${item.height}`
      : item.resolution || FALLBACK_RES[item.device];

  const q = new URLSearchParams();
  q.set('src', imagePath);
  q.set('title', item.title || 'Wallpaper');
  q.set('cat', item.category || 'dark');
  q.set('dev', item.device || 'desktop');
  q.set('res', resolution);
  q.set('i', String(index));
  if (item.width) q.set('w', String(item.width));
  if (item.height) q.set('h', String(item.height));
  return `view.html?${q.toString()}`;
}

function urlEntry({ loc, lastmod, changefreq, priority, images }) {
  let xml = '  <url>\n';
  xml += `    <loc>${esc(loc)}</loc>\n`;
  if (lastmod) xml += `    <lastmod>${esc(lastmod)}</lastmod>\n`;
  if (changefreq) xml += `    <changefreq>${changefreq}</changefreq>\n`;
  if (priority) xml += `    <priority>${priority}</priority>\n`;
  if (images && images.length) {
    for (const img of images) {
      xml += '    <image:image>\n';
      xml += `      <image:loc>${esc(img.loc)}</image:loc>\n`;
      if (img.title) xml += `      <image:title>${esc(img.title)}</image:title>\n`;
      if (img.caption) xml += `      <image:caption>${esc(img.caption)}</image:caption>\n`;
      xml += `      <image:license>${esc(LICENSE_URL)}</image:license>\n`;
      xml += '    </image:image>\n';
    }
  }
  xml += '  </url>\n';
  return xml;
}

function main() {
  let data = { wallpapers: [] };
  if (fs.existsSync(DATA)) {
    data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  }
  const items = Array.isArray(data.wallpapers) ? data.wallpapers : [];
  const now = new Date().toISOString();

  let xml = '';
  xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
  xml += 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  // Static pages
  xml += urlEntry({
    loc: absUrl('/'),
    lastmod: now,
    changefreq: 'daily',
    priority: '1.0'
  });

  xml += urlEntry({
    loc: absUrl('about'),
    lastmod: now,
    changefreq: 'monthly',
    priority: '0.6'
  });

  xml += urlEntry({
    loc: absUrl('license.html'),
    lastmod: now,
    changefreq: 'yearly',
    priority: '0.3'
  });

  // Wallpaper detail pages + image discovery
  items.forEach((item, index) => {
    const imageRel = resolveImagePath(item);
    if (!imageRel) return;

    const viewRel = buildViewQuery(item, index, imageRel);
    const pageLoc = absUrl(viewRel);
    const imageLoc = absUrl(imageRel);

    xml += urlEntry({
      loc: pageLoc,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.8',
      images: [
        {
          loc: imageLoc,
          title: item.title || 'WallDrop Wallpaper',
          caption: item.alt || item.title || 'Minimal dark wallpaper'
        }
      ]
    });
  });

  xml += '</urlset>\n';
  fs.writeFileSync(OUT_SITEMAP, xml, 'utf8');

  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    ''
  ].join('\n');
  fs.writeFileSync(OUT_ROBOTS, robots, 'utf8');

  const pageCount = 3 + items.length;
  console.log(`Sitemap generated: ${OUT_SITEMAP}`);
  console.log(`  URLs: ${pageCount} (${items.length} wallpaper detail pages)`);
  console.log(`Robots generated: ${OUT_ROBOTS}`);
}

main();
