#!/bin/sh
# Build a debug APK you can sideload: android-app/Puiutu-debug.apk
set -e
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
sh sync_www.sh
npx cap sync android
(cd android && ./gradlew assembleDebug)
cp android/app/build/outputs/apk/debug/app-debug.apk Puiutu-debug.apk
echo "APK: $(pwd)/Puiutu-debug.apk"
