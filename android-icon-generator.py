#!/usr/bin/env python3
"""
Android Icon Generator for Oryxa
Automatically generates all required Android icon sizes from a 1024x1024 source
Requires: pip install Pillow
"""

from PIL import Image
import os
import sys

# Configuration
SOURCE = "src/assets/app-icon-1024.png"
OUTPUT_DIR = "android/app/src/main/res"

# Icon sizes for different densities
SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

def check_pillow():
    """Check if Pillow is installed"""
    try:
        from PIL import Image
        return True
    except ImportError:
        return False

def generate_icons():
    """Generate all Android icon sizes"""
    print("🎨 Android Icon Generator for Oryxa")
    print("=" * 50)
    print()

    # Check if Pillow is installed
    if not check_pillow():
        print("❌ Pillow is not installed!")
        print()
        print("📦 Install Pillow:")
        print("  pip install Pillow")
        print("  # or")
        print("  pip3 install Pillow")
        print()
        sys.exit(1)

    # Check if source exists
    if not os.path.exists(SOURCE):
        print(f"❌ Source image not found: {SOURCE}")
        sys.exit(1)

    print(f"✅ Source image found: {SOURCE}")
    print()

    # Create directories
    print("📁 Creating directories...")
    for density in SIZES.keys():
        dir_path = os.path.join(OUTPUT_DIR, density)
        os.makedirs(dir_path, exist_ok=True)

    # Load source image
    try:
        source_img = Image.open(SOURCE)
    except Exception as e:
        print(f"❌ Error loading source image: {e}")
        sys.exit(1)

    # Generate icons
    print("🔄 Generating icons...")
    print()

    for density, size in SIZES.items():
        output_path = os.path.join(OUTPUT_DIR, density, "ic_launcher.png")
        
        # Resize with high-quality antialiasing
        resized = source_img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Save
        resized.save(output_path, "PNG", optimize=True)
        
        print(f"  ✅ {density} ({size}x{size})")

    print()
    print("✅ All icons generated successfully!")
    print()
    print("📍 Icons saved to:")
    for density in SIZES.keys():
        print(f"  - {OUTPUT_DIR}/{density}/ic_launcher.png")
    print()
    print("🚀 Next steps:")
    print("  1. npx cap sync android")
    print("  2. cd android && ./gradlew assembleDebug")
    print()
    print("🎉 Done!")

if __name__ == "__main__":
    generate_icons()
