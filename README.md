# Spiral Animator

**Interactive spiral visualization with prime number highlighting, animated coefficients, rotation effects, and customizable parameters.**

🌐 **Play Online**: [spiral.relentlesscurious.com](https://spiral.relentlesscurious.com)

Inspired by Robert Sacks and the Sacks Spiral. Learn more at [NumberSpiral.com](https://numberspiral.com/)

## Download & Install

### Desktop Applications
- **Windows**: Download `.msi` installer from [Releases](https://github.com/ianrandmckenzie/spiral_animator/releases)
- **macOS**: Download `.dmg` file (supports both Intel and Apple Silicon)
- **Linux**: Download `.deb` package or `.AppImage`

### Mobile Applications
- **Android**: Download `.apk` from [Releases](https://github.com/ianrandmckenzie/spiral_animator/releases)
- **iOS**: Available through TestFlight (contact for access)

### Web Application
- **Browser**: No installation required - visit [spiral.relentlesscurious.com](https://spiral.relentlesscurious.com)

## Features

- **Interactive Visualization**: Explore mathematical spiral patterns in real-time
- **Prime Number Highlighting**: Visual representation of prime numbers within spirals
- **Animated Coefficients**: Watch how changing parameters affects the spiral patterns
- **Rotation Effects**: Dynamic rotation and movement controls
- **Customizable Parameters**: Adjust spiral properties to explore different mathematical relationships
- **Cross-Platform**: Available on Windows, macOS, Linux, iOS, Android, and web browsers
- **Fullscreen Experience**: Immersive mathematical exploration

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version)
- [Rust](https://rustup.rs/) (for desktop builds)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/ianrandmckenzie/spiral_animator.git
cd spiral_animator

# Install dependencies
npm install

# Start development server (web)
npm run dev

# Start desktop development
npm run tauri:dev
```

### Available Scripts

```bash
# Web development
npm run dev                # Start web dev server
npm run build              # Build web app
npm run preview            # Preview built web app

# Desktop development
npm run tauri:dev          # Start desktop dev mode
npm run tauri:build        # Build desktop app

# Mobile development (requires additional setup)
npm run android:init       # Initialize Android project
npm run android:dev        # Start Android dev mode
npm run android:build      # Build Android APK

npm run ios:init           # Initialize iOS project
npm run ios:dev            # Start iOS dev mode
npm run ios:build          # Build iOS app
```

### Mobile Development Setup

See [DISTRIBUTION_SETUP.md](./DISTRIBUTION_SETUP.md) for complete mobile development setup instructions.

## Release Process

### Creating a Release

```bash
# Create and push a version tag
git tag v1.0.3
git push origin v1.0.3
```

This triggers automated builds for all platforms:
- Desktop applications (Windows, macOS, Linux)
- Mobile applications (Android, iOS)
- Web deployment to GitHub Pages

### Distribution Workflows

The project includes two distribution workflows:

1. **GitHub Releases** (`.github/workflows/release-github.yml`):
   - Builds for all platforms
   - Creates GitHub releases with downloadable assets
   - Free and self-hosted

2. **CrabNebula Cloud** (`.github/workflows/release-cross-platform.yml`):
   - Professional distribution platform
   - Automatic updates for desktop apps
   - App store deployment assistance
   - Requires [CrabNebula Cloud](https://crabnebula.dev) account

See [DISTRIBUTION_SETUP.md](./DISTRIBUTION_SETUP.md) for complete setup instructions.

## Security

- Code signing available for all platforms
- Content Security Policy (CSP) implementation
- Regular security audits with `npm run security-check`
- Secure build and distribution pipelines

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Copyright © Ian Rand McKenzie 2025, All Rights Reserved where applicable.

## Acknowledgments

- Inspired by Robert Sacks and the mathematical research at [NumberSpiral.com](https://numberspiral.com/)
- Built with [Tauri](https://tauri.app/) for cross-platform distribution
- Uses [Vite](https://vitejs.dev/) for fast web development
