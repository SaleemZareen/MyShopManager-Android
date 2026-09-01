#!/bin/bash
set -e

echo "=== Starting Android SDK & JDK 17 Setup ==="

# 1. Install Java 17, wget, unzip
echo "Installing OpenJDK 17 and utility tools..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" openjdk-17-jdk wget unzip

# 2. Setup Android SDK folder structure
echo "Setting up Android SDK paths..."
export ANDROID_HOME=/opt/android-sdk
mkdir -p ${ANDROID_HOME}/cmdline-tools

# 3. Download and extract Command Line Tools
echo "Downloading Android Command Line Tools..."
wget -q "https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip" -O /tmp/cmdline-tools.zip
echo "Extracting Command Line Tools..."
unzip -q /tmp/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools

# Crucial directory layout fix for sdkmanager
mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest

# 4. Accept Licenses
echo "Accepting Android licenses..."
yes | /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses

# 5. Install platforms, platform-tools, and build-tools (matching SDK 35 in build.gradle)
echo "Installing Android platforms and build tools (API 35)..."
/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"

# 6. Download and install Gradle 8.7
echo "Downloading Gradle 8.7..."
wget -q "https://services.gradle.org/distributions/gradle-8.7-bin.zip" -O /tmp/gradle.zip
echo "Extracting Gradle 8.7..."
unzip -q /tmp/gradle.zip -d /opt/

echo "=== Android SDK & JDK 17 Setup Completed Successfully ==="
