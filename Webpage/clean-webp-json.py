#!/usr/bin/env python3
"""
Remove WebP entries from wallpapers.json to prevent duplicates in gallery.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JSON_FILE = ROOT / "wallpapers.json"

def main():
    print("Cleaning WebP entries from wallpapers.json...")
    
    if not JSON_FILE.exists():
        print(f"Error: {JSON_FILE} not found")
        return
    
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    wallpapers = data.get('wallpapers', [])
    original_count = len(wallpapers)
    
    # Filter out WebP entries
    filtered = [w for w in wallpapers if not w.get('image', '').lower().endswith('.webp')]
    removed_count = original_count - len(filtered)
    
    data['wallpapers'] = filtered
    
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    
    print(f"Removed {removed_count} WebP entries")
    print(f"Original count: {original_count}")
    print(f"New count: {len(filtered)}")
    print("Done!")

if __name__ == "__main__":
    main()
