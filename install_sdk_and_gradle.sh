#!/bin/bash
set -e

echo "=== Setup Android SDK paths ==="
export ANDROID_HOME=/opt/android-sdk
mkdir -p ${ANDROID_HOME}/cmdline-tools

if [ ! -d "/opt/android-sdk/cmdline-tools/latest" ]; then
    echo "Downloading Android Command Line Tools..."
    wget -q "https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip" -O /tmp/cmdline-tools.zip
    echo "Extracting Command Line Tools..."
    unzip -q /tmp/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools
    mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest
fi

echo "Accepting Android licenses..."
yes | /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses

echo "Installing Android platforms and build tools (API 35)..."
/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"

if [ ! -d "/opt/gradle-8.7" ]; then
    echo "Downloading Gradle 8.7..."
    wget -q "https://services.gradle.org/distributions/gradle-8.7-bin.zip" -O /tmp/gradle.zip
    echo "Extracting Gradle 8.7..."
    unzip -q /tmp/gradle.zip -d /opt/
fi

echo "=== Setup Completed Successfully ==="
