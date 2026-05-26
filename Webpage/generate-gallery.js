#!/usr/bin/env node
/**
 * Scan images/wallpapers/{desktop,mobile} and write wallpapers.json for Netlify/static hosting.
 * Run: node generate-gallery.js  (also via npm run build)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DESKTOP = path.join(ROOT, 'images', 'wallpapers', 'desktop');
const MOBILE = path.join(ROOT, 'images', 'wallpapers', 'mobile');
const OUT = path.join(ROOT, 'wallpapers.json');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const CATEGORIES = new Set(['dark', 'minimal', 'abstract', 'monochrome', 'gradient']);
const FALLBACK_RES = { desktop: '3840×2160', mobile: '1284×2778' };

const VIBE_KEYWORDS = {
  black: ['black', 'noir', 'dark mode', 'dark-mode', 'monterey', 'sagittarius'],
  white: ['white', 'light', 'snow', 'ivory'],
  gray: ['gray', 'grey', 'slate', 'silver', 'chrome'],
  red: ['red', 'crimson', 'scarlet', 'spider'],
  orange: ['orange', 'amber', 'fox', 'sunset', 'copper'],
  yellow: ['yellow', 'gold', 'lemon'],
  green: ['green', 'emerald', 'forest', 'mint'],
  blue: ['blue', 'azure', 'navy', 'cyan', 'teal'],
  purple: ['purple', 'violet', 'lavender', 'magenta', 'plum'],
  pink: ['pink', 'rose', 'blush'],
  pastel: ['pastel', 'soft', 'muted', 'powder']
};

function titleFromStem(stem) {
  const s = stem.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Untitled';
}

function parseFilename(name) {
  const stem = path.parse(name).name;
  if (stem.includes('--')) {
    const [prefix, rest] = stem.split('--', 2);
    const cat = prefix.trim().toLowerCase();
    if (CATEGORIES.has(cat) && rest.trim()) {
      return { category: cat, titleStem: rest.trim(), filename: name };
    }
    const vibe = prefix.trim().toLowerCase();
    if (VIBE_KEYWORDS[vibe] && rest.trim()) {
      return {
        category: 'dark',
        titleStem: rest.trim(),
        filename: name,
        extraVibes: [vibe]
      };
    }
  }
  return { category: 'dark', titleStem: stem, filename: name };
}

function inferVibes(title, category, filename, extraVibes = []) {
  const vibes = new Set(extraVibes);
  const hay = `${title} ${filename} ${category}`.toLowerCase();

  for (const [vibe, words] of Object.entries(VIBE_KEYWORDS)) {
    if (words.some((w) => hay.includes(w))) vibes.add(vibe);
  }

  if (category === 'dark' || category === 'monochrome') vibes.add('black');
  if (category === 'minimal') vibes.add('gray');
  if (category === 'gradient') {
    vibes.add('purple');
    vibes.add('blue');
  }

  if (!vibes.size) vibes.add('black');
  return [...vibes];
}

function inferTags(title, category, device) {
  const tags = new Set([category, device]);
  const hay = title.toLowerCase();
  if (hay.includes('pattern')) tags.add('patterns');
  if (hay.includes('stock')) tags.add('stock');
  if (hay.includes('windows') || hay.includes('macos')) tags.add('os');
  return [...tags];
}

function readImageSize(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const head = Buffer.alloc(32);
    if (fs.readSync(fd, head, 0, 32, 0) < 24) return null;

    if (head.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
    }

    if (head.slice(0, 6).toString() === 'GIF87a' || head.slice(0, 6).toString() === 'GIF89a') {
      return { w: head.readUInt16LE(6), h: head.readUInt16LE(8) };
    }

    if (head[0] === 0xff && head[1] === 0xd8) {
      return jpegSize(fd);
    }

    if (head.slice(0, 4).toString() === 'RIFF' && head.slice(8, 12).toString() === 'WEBP') {
      return webpSize(fd, head);
    }
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  return null;
}

function jpegSize(fd) {
  const buf = Buffer.alloc(1);
  fs.readSync(fd, buf, 0, 2, 0);
  let pos = 2;
  const chunk = Buffer.alloc(4);
  while (pos < 12 * 1024 * 1024) {
    fs.readSync(fd, buf, 0, 1, pos);
    if (buf[0] !== 0xff) {
      pos++;
      continue;
    }
    fs.readSync(fd, buf, 0, 1, pos + 1);
    let marker = buf[0];
    let p = pos + 2;
    while (marker === 0xff) {
      fs.readSync(fd, buf, 0, 1, p);
      marker = buf[0];
      p++;
    }
    const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb]);
    if (sof.has(marker)) {
      fs.readSync(fd, chunk, 0, 7, p);
      return { h: chunk.readUInt16BE(3), w: chunk.readUInt16BE(5) };
    }
    if (marker === 0xda) return null;
    fs.readSync(fd, chunk, 0, 2, p);
    const segLen = chunk.readUInt16BE(0);
    pos = p + segLen;
  }
  return null;
}

function webpSize(fd, head) {
  if (head.slice(12, 16).toString() === 'VP8 ' && head.length >= 30) {
    const w = head[7] | ((head[8] & 0x3f) << 8);
    const h = head[9] | ((head[10] & 0x3f) << 8);
    return { w: w || 1, h: h || 1 };
  }
  if (head.slice(12, 16).toString() === 'VP8L' && head.length >= 17) {
    const bits = head[13] | (head[14] << 8) | (head[15] << 16) | (head[16] << 24);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (head.slice(12, 16).toString() === 'VP8X') {
    const b = Buffer.alloc(6);
    fs.readSync(fd, b, 0, 6, 20);
    const w = 1 + (b[0] | (b[1] << 8) | ((b[2] & 0x0f) << 16));
    const h = 1 + (b[3] | (b[4] << 8) | ((b[5] & 0x0f) << 16));
    return { w, h };
  }
  return null;
}

function formatRes(w, h) {
  return `${w}×${h}`;
}

function scanFolder(folder, device) {
  if (!fs.existsSync(folder)) return [];
  const items = [];
  const names = fs.readdirSync(folder).filter((n) => IMAGE_EXT.has(path.extname(n).toLowerCase()));
  names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  for (const filename of names) {
    const parsed = parseFilename(filename);
    const filePath = path.join(folder, filename);
    const title = titleFromStem(parsed.titleStem);
    const size = readImageSize(filePath);
    const res = size ? formatRes(size.w, size.h) : FALLBACK_RES[device];
    const vibes = inferVibes(title, parsed.category, filename, parsed.extraVibes || []);

    const entry = {
      title,
      category: parsed.category,
      device,
      resolution: res,
      image: filename,
      vibes,
      tags: inferTags(title, parsed.category, device)
    };
    if (size) {
      entry.width = size.w;
      entry.height = size.h;
    }
    items.push(entry);
  }
  return items;
}

function main() {
  fs.mkdirSync(DESKTOP, { recursive: true });
  fs.mkdirSync(MOBILE, { recursive: true });

  const wallpapers = [...scanFolder(DESKTOP, 'desktop'), ...scanFolder(MOBILE, 'mobile')];
  const data = { wallpapers, generatedAt: new Date().toISOString() };

  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');

  const d = scanFolder(DESKTOP, 'desktop').length;
  const m = scanFolder(MOBILE, 'mobile').length;
  console.log(`WallDrop: ${wallpapers.length} wallpaper(s) -> wallpapers.json`);
  console.log(`  desktop: ${d}`);
  console.log(`  mobile:  ${m}`);
  if (!wallpapers.length) {
    console.log('  (add JPG/PNG/WebP to images/wallpapers/desktop or mobile)');
  }
}

main();
