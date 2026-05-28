#!/usr/bin/env python3
"""
Convert all JPEG images in images/ folder and subfolders to WebP format.
WebP files are saved alongside originals without deleting JPEGs.
"""

from pathlib import Path
from PIL import Image
import sys

# Configuration
QUALITY = 85  # WebP quality (0-100, higher = better quality but larger file)
ROOT = Path(__file__).resolve().parent
IMAGES_DIR = ROOT / "images"

JPEG_EXTENSIONS = {".jpg", ".jpeg", ".JPG", ".JPEG"}

def convert_to_webp(image_path: Path) -> bool:
    """Convert a single JPEG image to WebP format."""
    try:
        webp_path = image_path.with_suffix(".webp")
        
        # Skip if WebP already exists
        if webp_path.exists():
            print(f"  Skipping (WebP exists): {image_path.name}")
            return False
        
        # Open and convert
        with Image.open(image_path) as img:
            # Convert RGBA to RGB if necessary (WebP supports RGBA but for wallpapers RGB is fine)
            if img.mode in ("RGBA", "LA", "P"):
                img = img.convert("RGB")
            
            # Save as WebP
            img.save(webp_path, "WEBP", quality=QUALITY, method=6)
            print(f"  Converted: {image_path.name} -> {webp_path.name}")
            return True
    
    except Exception as e:
        print(f"  Error converting {image_path.name}: {e}")
        return False

def find_jpegs(directory: Path) -> list[Path]:
    """Find all JPEG files in directory and subdirectories."""
    jpegs = []
    for ext in JPEG_EXTENSIONS:
        jpegs.extend(directory.rglob(f"*{ext}"))
    return sorted(jpegs)

def main():
    print("Converting JPEG images to WebP format...")
    print(f"Source directory: {IMAGES_DIR}")
    print(f"Quality: {QUALITY}")
    print()
    
    if not IMAGES_DIR.exists():
        print(f"Error: Images directory not found: {IMAGES_DIR}")
        sys.exit(1)
    
    # Find all JPEG files
    jpeg_files = find_jpegs(IMAGES_DIR)
    
    if not jpeg_files:
        print("No JPEG files found.")
        return
    
    print(f"Found {len(jpeg_files)} JPEG file(s)")
    print()
    
    # Convert each file
    converted = 0
    skipped = 0
    errors = 0
    
    for jpeg_path in jpeg_files:
        relative_path = jpeg_path.relative_to(IMAGES_DIR)
        print(f"Processing: {relative_path}")
        
        result = convert_to_webp(jpeg_path)
        if result:
            converted += 1
        elif jpeg_path.with_suffix(".webp").exists():
            skipped += 1
        else:
            errors += 1
    
    print()
    print("=" * 50)
    print(f"Conversion complete!")
    print(f"  Converted: {converted}")
    print(f"  Skipped (WebP exists): {skipped}")
    print(f"  Errors: {errors}")
    print(f"  Total processed: {len(jpeg_files)}")

if __name__ == "__main__":
    main()
