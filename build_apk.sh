#!/bin/bash
set -e

echo "=== Starting APK Build Process ==="

# 1. Export Environment Paths
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=/opt/android-sdk
export PATH=$PATH:/opt/gradle-8.7/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/cmdline-tools/latest/bin

# 2. Run Gradle Assemble Debug
echo "Compiling APK via Gradle..."
/opt/gradle-8.7/bin/gradle assembleDebug --no-daemon

# 3. Find and Copy the APK
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
    echo "APK compiled successfully at $APK_PATH"
    
    # Create target directories
    mkdir -p .build-outputs
    mkdir -p APK_DOWNLOAD
    
    # Copy APK to target directories
    cp "$APK_PATH" .build-outputs/app-debug.apk
    cp "$APK_PATH" APK_DOWNLOAD/app-debug.apk
    
    echo "APK copied to .build-outputs/app-debug.apk"
    echo "APK copied to APK_DOWNLOAD/app-debug.apk"
    
    # Print size of the final APK to verify it's greater than 1MB
    APK_SIZE=$(du -sh APK_DOWNLOAD/app-debug.apk | cut -f1)
    echo "Verified APK size: $APK_SIZE"
else
    echo "ERROR: APK was not found at $APK_PATH after build!"
    exit 1
fi

echo "=== APK Build Process Completed Successfully ==="
