#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'sitemap.xml');
const DATA = path.join(ROOT, 'wallpapers.json');
const SITE_URL = process.env.SITE_URL || 'https://wall-drops.netlify.app';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function imagePath(item) {
  const dev = item.device === 'mobile' ? 'mobile' : 'desktop';
  const raw = String(item.image || '').replace(/\\/g, '/').trim();
  if (!raw) return null;
  if (raw.includes('/')) return raw.replace(/^\/+/, '');
  return `images/wallpapers/${dev}/${raw}`;
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

  xml += '  <url>\n';
  xml += `    <loc>${esc(`${SITE_URL}/`)}</loc>\n`;
  xml += `    <lastmod>${esc(now)}</lastmod>\n`;
  xml += '    <changefreq>daily</changefreq>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>\n';

  for (const item of items) {
    const p = imagePath(item);
    if (!p) continue;
    const imageLoc = `${SITE_URL}/${p}`;
    xml += '  <url>\n';
    xml += `    <loc>${esc(`${SITE_URL}/`)}</loc>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '    <image:image>\n';
    xml += `      <image:loc>${esc(imageLoc)}</image:loc>\n`;
    xml += `      <image:title>${esc(item.title || 'WallDrop Wallpaper')}</image:title>\n`;
    xml += `      <image:caption>${esc(item.alt || item.title || 'Minimal dark wallpaper')}</image:caption>\n`;
    xml += '      <image:license>https://wall-drops.netlify.app/license.html</image:license>\n';
    xml += '    </image:image>\n';
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';
  fs.writeFileSync(OUT, xml, 'utf8');
  console.log(`Sitemap generated: ${OUT} (${items.length} image entries)`);
}

main();
