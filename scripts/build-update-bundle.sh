#!/bin/bash

# Build Update Bundle Script for Capacitor Live Update
# يقوم ببناء وتجهيز حزمة التحديث لنظام Live Update

set -e

VERSION=${1:-$(date +"%Y.%m.%d-%H%M")}
BUILD_DIR="dist"
BUNDLE_DIR="public/updates/bundles"
MANIFEST_FILE="public/updates/manifest.json"

echo "🚀 Building update bundle version: $VERSION"

# 1. Build the web app
echo "📦 Building web assets..."
npm run build

# 2. Create bundles directory if it doesn't exist
mkdir -p "$BUNDLE_DIR"

# 3. Create zip bundle
BUNDLE_FILE="${BUNDLE_DIR}/${VERSION}.zip"
echo "📦 Creating bundle: $BUNDLE_FILE"
cd "$BUILD_DIR"
zip -r "../${BUNDLE_FILE}" .
cd ..

# 4. Calculate checksum
CHECKSUM=$(shasum -a 256 "$BUNDLE_FILE" | awk '{print $1}')
echo "🔐 Checksum: $CHECKSUM"

# 5. Update manifest.json
echo "📝 Updating manifest.json..."
cat > "$MANIFEST_FILE" << EOF
{
  "version": "$VERSION",
  "url": "https://57dc7576-1990-4872-a4c0-f7cfc474f0d0.lovableproject.com/updates/bundles/${VERSION}.zip",
  "checksum": "sha256-${CHECKSUM}",
  "mandatory": false,
  "description": "تحديث تلقائي",
  "releaseNotes": "Built on $(date)"
}
EOF

echo "✅ Bundle created successfully!"
echo "📍 Bundle: $BUNDLE_FILE"
echo "📍 Manifest: $MANIFEST_FILE"
echo ""
echo "Next steps:"
echo "1. Upload the bundle and manifest to your server"
echo "2. Or run: npm run publish (if using Lovable hosting)"
echo "3. Test: Open the app and check for updates in Settings"
