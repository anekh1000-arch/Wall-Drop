#!/usr/bin/env python3
"""
Regenerate wallpapers.json using Node.js generate-gallery.js
This script runs the Node.js gallery generator.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GENERATOR = ROOT / "generate-gallery.js"

def main():
    print("Regenerating wallpapers.json with original filenames...")
    
    if not GENERATOR.exists():
        print(f"Error: {GENERATOR} not found")
        return
    
    try:
        result = subprocess.run(
            ["node", str(GENERATOR)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        print("Done!")
    except subprocess.CalledProcessError as e:
        print(f"Error running generate-gallery.js: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print("Error: Node.js not found. Please install Node.js to run generate-gallery.js")
        sys.exit(1)

if __name__ == "__main__":
    main()
