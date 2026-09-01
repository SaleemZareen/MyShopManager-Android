#!/bin/bash
set -e

echo "=== Generating High-Resolution PWA, In-App and Android Launcher Icons ==="

# 1. PWA icons (with solid white background)
convert -background white -resize 192x192 tmp/icon.svg public/pwa-192x192.png
convert -background white -resize 512x512 tmp/icon.svg public/pwa-512x512.png

# Ensure output directories exist
mkdir -p app/src/main/assets
mkdir -p src/assets/images
mkdir -p app/src/main/res/drawable
mkdir -p app/src/main/res/drawable-xxxhdpi
mkdir -p app/src/main/res/mipmap-mdpi
mkdir -p app/src/main/res/mipmap-hdpi
mkdir -p app/src/main/res/mipmap-xhdpi
mkdir -p app/src/main/res/mipmap-xxhdpi
mkdir -p app/src/main/res/mipmap-xxxhdpi

# Copy PWA icons to Android WebView assets
cp public/pwa-192x192.png app/src/main/assets/pwa-192x192.png
cp public/pwa-512x512.png app/src/main/assets/pwa-512x512.png

# 2. In-App Shop Image Asset (transparent background, high resolution 1024x1024)
convert -background none -resize 1024x1024 tmp/icon_foreground.svg src/assets/images/Shop.png

# 3. Android standard launcher icons (solid white background)
convert -background white -resize 48x48 tmp/icon.svg app/src/main/res/mipmap-mdpi/ic_launcher.png
convert -background white -resize 72x72 tmp/icon.svg app/src/main/res/mipmap-hdpi/ic_launcher.png
convert -background white -resize 96x96 tmp/icon.svg app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert -background white -resize 144x144 tmp/icon.svg app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert -background white -resize 192x192 tmp/icon.svg app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# 4. Android round launcher icons (solid white background)
convert -background white -resize 48x48 tmp/icon.svg app/src/main/res/mipmap-mdpi/ic_launcher_round.png
convert -background white -resize 72x72 tmp/icon.svg app/src/main/res/mipmap-hdpi/ic_launcher_round.png
convert -background white -resize 96x96 tmp/icon.svg app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
convert -background white -resize 144x144 tmp/icon.svg app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
convert -background white -resize 192x192 tmp/icon.svg app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

# 5. Android adaptive foreground icons (transparent background, 512x512 with 15% padding)
# To create 15% padding, we can resize the original foreground SVG to 85% of target canvas size (435x435), then center it on a 512x512 transparent canvas
convert -background none -resize 435x435 tmp/icon_foreground.svg -gravity center -extent 512x512 app/src/main/res/drawable/ic_launcher_foreground.png
convert -background none -resize 435x435 tmp/icon_foreground.svg -gravity center -extent 512x512 app/src/main/res/drawable-xxxhdpi/ic_launcher_foreground.png

echo "=== All Icons Generated Successfully ==="
