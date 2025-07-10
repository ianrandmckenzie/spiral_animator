#!/bin/bash

# Build script for Spiral Animator
# This script builds the application for all supported platforms

echo "🏗️  Building Spiral Animator for all platforms..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run build and report status
build_target() {
    local target=$1
    local platform=$2

    echo -e "${BLUE}Building for $platform ($target)...${NC}"

    if npx tauri build --target $target; then
        echo -e "${GREEN}✅ Successfully built for $platform${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to build for $platform${NC}"
        return 1
    fi
}

# Track success/failure
success_count=0
total_count=0

# Build for macOS ARM64 (Apple Silicon)
total_count=$((total_count + 1))
build_target "aarch64-apple-darwin" "macOS ARM64 (Apple Silicon)"
if [ $? -eq 0 ]; then
    success_count=$((success_count + 1))
fi

echo ""

# Build for macOS Intel (x86_64)
total_count=$((total_count + 1))
build_target "x86_64-apple-darwin" "macOS Intel (x86_64)"
if [ $? -eq 0 ]; then
    success_count=$((success_count + 1))
fi

echo ""

# Note about Windows and Linux builds
echo -e "${BLUE}ℹ️  Note: Windows and Linux builds require additional cross-compilation setup${NC}"
echo "   For production builds on those platforms, consider:"
echo "   - Using GitHub Actions with multiple runners"
echo "   - Building on native Windows/Linux systems"
echo "   - Using Docker containers with proper toolchains"

echo ""
echo -e "${BLUE}📦 Build Summary:${NC}"
echo "   Successfully built: $success_count/$total_count platforms"

if [ -f "src-tauri/target/release/bundle/dmg/spiral_animator_0.1.0_aarch64.dmg" ]; then
    echo -e "${GREEN}   ✅ macOS ARM64 DMG available${NC}"
fi

if [ -f "src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/spiral_animator_0.1.0_x64.dmg" ]; then
    echo -e "${GREEN}   ✅ macOS Intel DMG available${NC}"
fi

echo ""
echo -e "${BLUE}🎯 Distribution files location:${NC}"
echo "   macOS ARM64: src-tauri/target/release/bundle/dmg/spiral_animator_0.1.0_aarch64.dmg"
echo "   macOS Intel: src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/spiral_animator_0.1.0_x64.dmg"
