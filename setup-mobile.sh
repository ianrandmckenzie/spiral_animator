#!/bin/bash

# Mobile Development Setup Script for Spiral Animator
# This script helps set up the mobile development environment

set -e

echo "🚀 Spiral Animator - Mobile Development Setup"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    IS_MACOS=true
else
    IS_MACOS=false
fi

echo ""
echo "Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js LTS from https://nodejs.org/"
    exit 1
fi

# Check Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    print_success "Rust found: $RUST_VERSION"
else
    print_error "Rust not found. Please install Rust from https://rustup.rs/"
    exit 1
fi

# Check Tauri CLI
if command -v tauri &> /dev/null; then
    print_success "Tauri CLI found"
else
    print_warning "Tauri CLI not found. Installing..."
    cargo install tauri-cli
    print_success "Tauri CLI installed"
fi

echo ""
echo "Setting up Android development..."

# Check Java
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    print_success "Java found: $JAVA_VERSION"
else
    print_warning "Java not found. Please install JDK 17 or later"
fi

# Check Android SDK
if [ -n "$ANDROID_HOME" ]; then
    print_success "ANDROID_HOME is set: $ANDROID_HOME"
else
    print_warning "ANDROID_HOME not set. You need to:"
    echo "  1. Install Android Studio"
    echo "  2. Set ANDROID_HOME environment variable"
    echo "  3. Add SDK tools to PATH"
fi

# Add Android targets
print_info "Adding Android Rust targets..."
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
print_success "Android targets added"

# Initialize Android project
if [ ! -d "src-tauri/gen/android" ]; then
    print_info "Initializing Android project..."
    if [ -n "$ANDROID_HOME" ]; then
        npm run android:init
        print_success "Android project initialized"
    else
        print_warning "Skipping Android initialization - ANDROID_HOME not set"
    fi
else
    print_success "Android project already initialized"
fi

# iOS setup (macOS only)
if [ "$IS_MACOS" = true ]; then
    echo ""
    echo "Setting up iOS development..."

    # Check Xcode
    if command -v xcodebuild &> /dev/null; then
        XCODE_VERSION=$(xcodebuild -version | head -n 1)
        print_success "Xcode found: $XCODE_VERSION"
    else
        print_warning "Xcode not found. Please install Xcode from the Mac App Store"
    fi

    # Check CocoaPods
    if command -v pod &> /dev/null; then
        print_success "CocoaPods found"
    else
        print_info "Installing CocoaPods..."
        sudo gem install cocoapods
        print_success "CocoaPods installed"
    fi

    # Add iOS target
    print_info "Adding iOS Rust target..."
    rustup target add aarch64-apple-ios
    print_success "iOS target added"

    # Initialize iOS project
    if [ ! -d "src-tauri/gen/ios" ]; then
        print_info "Initializing iOS project..."
        npm run ios:init
        print_success "iOS project initialized"
    else
        print_success "iOS project already initialized"
    fi
else
    print_warning "iOS development only available on macOS"
fi

echo ""
echo "📱 Mobile Development Setup Complete!"
echo "======================================"

echo ""
echo "Available commands:"
echo "  npm run android:dev         # Start Android development"
echo "  npm run android:build       # Build Android APK (debug)"
echo "  npm run android:build:release # Build Android APK (release)"

if [ "$IS_MACOS" = true ]; then
    echo "  npm run ios:dev             # Start iOS development"
    echo "  npm run ios:build           # Build iOS app (debug)"
    echo "  npm run ios:build:release   # Build iOS app (release)"
fi

echo ""
echo "Next steps:"
if [ -z "$ANDROID_HOME" ]; then
    echo "  1. Install Android Studio and set up ANDROID_HOME"
    echo "  2. Re-run this script to complete Android setup"
fi

if [ "$IS_MACOS" = true ]; then
    echo "  3. Set up iOS development certificates (for device testing)"
    echo "  4. Configure your Apple Developer Team ID in src-tauri/tauri.conf.json"
fi

echo ""
echo "For distribution setup, see DISTRIBUTION_SETUP.md"
echo "For GitHub secrets setup, see SECRETS_SETUP.md"
