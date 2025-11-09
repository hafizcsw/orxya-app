#!/bin/bash

# Android Icon Generator Script
# Automatically generates all required Android icon sizes from a 1024x1024 source

echo "🎨 Android Icon Generator for Oryxa"
echo "===================================="
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed!"
    echo ""
    echo "📦 Install ImageMagick:"
    echo "  macOS:   brew install imagemagick"
    echo "  Ubuntu:  sudo apt-get install imagemagick"
    echo "  Windows: Download from https://imagemagick.org/script/download.php"
    echo ""
    exit 1
fi

# Source image
SOURCE="src/assets/app-icon-1024.png"

# Check if source exists
if [ ! -f "$SOURCE" ]; then
    echo "❌ Source image not found: $SOURCE"
    exit 1
fi

echo "✅ Source image found: $SOURCE"
echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi

# Generate icons
echo "🔄 Generating icons..."

# mdpi: 48x48
echo "  - mdpi (48x48)..."
convert "$SOURCE" -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png

# hdpi: 72x72
echo "  - hdpi (72x72)..."
convert "$SOURCE" -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png

# xhdpi: 96x96
echo "  - xhdpi (96x96)..."
convert "$SOURCE" -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png

# xxhdpi: 144x144
echo "  - xxhdpi (144x144)..."
convert "$SOURCE" -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png

# xxxhdpi: 192x192
echo "  - xxxhdpi (192x192)..."
convert "$SOURCE" -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

echo ""
echo "✅ All icons generated successfully!"
echo ""
echo "📍 Icons saved to:"
echo "  - android/app/src/main/res/mipmap-mdpi/ic_launcher.png"
echo "  - android/app/src/main/res/mipmap-hdpi/ic_launcher.png"
echo "  - android/app/src/main/res/mipmap-xhdpi/ic_launcher.png"
echo "  - android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png"
echo "  - android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
echo ""
echo "🚀 Next steps:"
echo "  1. npx cap sync android"
echo "  2. cd android && ./gradlew assembleDebug"
echo ""
echo "🎉 Done!"
