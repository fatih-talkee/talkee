#!/bin/bash

# Open Android Studio with the android project folder
# Usage: ./scripts/open-android-studio.sh

# Get the project root directory (where this script is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"

# Check if android directory exists
if [ ! -d "$ANDROID_DIR" ]; then
  echo "❌ Error: android directory not found at $ANDROID_DIR"
  exit 1
fi

# Open Android Studio with the android folder
echo "🚀 Opening Android Studio..."
echo "📁 Project: $ANDROID_DIR"

if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open -a "Android Studio" "$ANDROID_DIR"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  if command -v studio &> /dev/null; then
    studio "$ANDROID_DIR"
  elif command -v android-studio &> /dev/null; then
    android-studio "$ANDROID_DIR"
  else
    echo "❌ Error: Android Studio command not found"
    echo "Please install Android Studio or add it to PATH"
    exit 1
  fi
else
  echo "❌ Error: Unsupported operating system"
  exit 1
fi

echo "✅ Android Studio should be opening now..."
echo "⏳ Waiting for Gradle sync to complete..."
