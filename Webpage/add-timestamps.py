#!/usr/bin/env python3
"""
Add timestamps to all wallpapers in wallpapers.json.
This marks all existing wallpapers as added today for the NEW badge feature.
"""

import json
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
JSON_FILE = ROOT / "wallpapers.json"

def main():
    print("Adding timestamps to wallpapers.json...")
    
    if not JSON_FILE.exists():
        print(f"Error: {JSON_FILE} not found")
        return
    
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    wallpapers = data.get('wallpapers', [])
    now = datetime.now(timezone.utc).isoformat()
    
    for wallpaper in wallpapers:
        if 'addedAt' not in wallpaper:
            wallpaper['addedAt'] = now
    
    data['wallpapers'] = wallpapers
    
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    
    print(f"Added timestamps to {len(wallpapers)} wallpapers")
    print("Done!")

if __name__ == "__main__":
    main()
