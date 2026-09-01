#!/bin/bash
set -e

echo "=== Generating Application Launcher and PWA Icons ==="

# 1. Create temporary directory and files
mkdir -p tmp
mkdir -p public
mkdir -p app/src/main/assets
mkdir -p app/src/main/res/drawable-xxxhdpi
mkdir -p app/src/main/res/mipmap-mdpi
mkdir -p app/src/main/res/mipmap-hdpi
mkdir -p app/src/main/res/mipmap-xhdpi
mkdir -p app/src/main/res/mipmap-xxhdpi
mkdir -p app/src/main/res/mipmap-xxxhdpi

# Create transparent foreground SVG (removing the background white rect)
cat tmp/icon.svg | grep -v '<rect x="0" y="0" width="1024" height="1024" fill="#ffffff" rx="160" />' > tmp/icon_foreground.svg

# 2. Render Web PWA Icons (with background)
echo "Rendering Web PWA Icons..."
convert -resize 192x192 tmp/icon.svg public/pwa-192x192.png
convert -resize 512x512 tmp/icon.svg public/pwa-512x512.png

# Copy to Android WebView assets
cp public/pwa-192x192.png app/src/main/assets/pwa-192x192.png
cp public/pwa-512x512.png app/src/main/assets/pwa-512x512.png

# 3. Render Android Mipmap Icons (with background)
echo "Rendering Android Standard Launcher Icons..."
convert -resize 48x48 tmp/icon.svg app/src/main/res/mipmap-mdpi/ic_launcher.png
convert -resize 72x72 tmp/icon.svg app/src/main/res/mipmap-hdpi/ic_launcher.png
convert -resize 96x96 tmp/icon.svg app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert -resize 144x144 tmp/icon.svg app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert -resize 192x192 tmp/icon.svg app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# Copy to round icons as well
cp app/src/main/res/mipmap-mdpi/ic_launcher.png app/src/main/res/mipmap-mdpi/ic_launcher_round.png
cp app/src/main/res/mipmap-hdpi/ic_launcher.png app/src/main/res/mipmap-hdpi/ic_launcher_round.png
cp app/src/main/res/mipmap-xhdpi/ic_launcher.png app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
cp app/src/main/res/mipmap-xxhdpi/ic_launcher.png app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
cp app/src/main/res/mipmap-xxxhdpi/ic_launcher.png app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

# 4. Render Android Adaptive Foreground (transparent background)
echo "Rendering Android Adaptive Foreground Icon..."
convert -background none -resize 512x512 tmp/icon_foreground.svg app/src/main/res/drawable-xxxhdpi/ic_launcher_foreground.png

# Delete the old XML foreground to ensure the PNG foreground is used instead
if [ -f "app/src/main/res/drawable/ic_launcher_foreground.xml" ]; then
    echo "Removing legacy XML foreground drawable..."
    rm app/src/main/res/drawable/ic_launcher_foreground.xml
fi

echo "=== Icons Generated Successfully ==="
