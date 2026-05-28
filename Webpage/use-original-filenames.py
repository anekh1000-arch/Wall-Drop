#!/usr/bin/env python3
"""
Update wallpapers.json to use original filenames as titles.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JSON_FILE = ROOT / "wallpapers.json"

def main():
    print("Updating wallpapers.json to use original filenames as titles...")
    
    if not JSON_FILE.exists():
        print(f"Error: {JSON_FILE} not found")
        return
    
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    wallpapers = data.get('wallpapers', [])
    
    for wallpaper in wallpapers:
        image_path = wallpaper.get('image', '')
        # Extract filename from path
        if '/' in image_path:
            filename = image_path.split('/')[-1]
        else:
            filename = image_path
        
        # Remove extension and use as title
        stem = Path(filename).stem
        # Replace hyphens and underscores with spaces
        title = stem.replace('-', ' ').replace('_', ' ').strip()
        
        # Update title
        wallpaper['title'] = title or stem
    
    data['wallpapers'] = wallpapers
    
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    
    print(f"Updated {len(wallpapers)} wallpapers with original filenames")
    print("Done!")

if __name__ == "__main__":
    main()
