# Cross-Platform Distribution Setup

This document provides complete setup instructions for distributing your Spiral Animator app across all major platforms using Tauri v2 and CrabNebula Cloud.

## Supported Platforms

- **Desktop**: Windows (x64), macOS (Intel & Apple Silicon), Linux (x64)
- **Mobile**: iOS, Android
- **Web**: Via GitHub Pages (already configured)

## Prerequisites

### 1. CrabNebula Cloud Account
1. Sign up at [CrabNebula Cloud](https://crabnebula.dev)
2. Create a new project for your app
3. Note your organization name and app name (format: `org/app`)

### 2. GitHub Repository Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

#### Required for CrabNebula Cloud
- `CN_API_KEY`: Your CrabNebula Cloud API key

#### Optional - Code Signing (Recommended for Production)
- `TAURI_SIGNING_PRIVATE_KEY`: Your Tauri code signing private key
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: Password for the private key

#### macOS/iOS Signing (Required for App Store distribution)
- `APPLE_CERTIFICATE`: Base64-encoded Apple Developer certificate (.p12)
- `APPLE_CERTIFICATE_PASSWORD`: Password for the certificate
- `APPLE_SIGNING_IDENTITY`: Your Apple signing identity
- `APPLE_API_KEY`: Apple App Store Connect API key (.p8 file content)
- `APPLE_API_KEY_ID`: API key ID
- `APPLE_API_ISSUER`: Issuer ID from App Store Connect
- `APPLE_DEVELOPMENT_TEAM`: Your Apple Developer Team ID

#### Android Signing (Required for Play Store distribution)
- `ANDROID_KEY_ALIAS`: Android keystore alias
- `ANDROID_KEY_PASSWORD`: Android keystore password
- `ANDROID_KEY_BASE64`: Base64-encoded Android keystore (.jks file)

## Configuration Updates

### 1. Update CrabNebula Application Name

In `.github/workflows/release-cross-platform.yml`, update:
```yaml
env:
  CN_APPLICATION: "ianrandmckenzie/spiral_animator"  # Replace with your org/app
```

### 2. Update iOS Development Team

In `src-tauri/tauri.conf.json`, update:
```json
{
  "bundle": {
    "iOS": {
      "developmentTeam": "YOUR_APPLE_TEAM_ID"  // Replace with your team ID
    }
  }
}
```

## Local Development Setup

### Mobile Development Prerequisites

#### Android
1. Install Android Studio
2. Set up Android SDK and NDK
3. Set `ANDROID_HOME` environment variable
4. Run: `npm run android:init`

#### iOS (macOS only)
1. Install Xcode
2. Install CocoaPods: `sudo gem install cocoapods`
3. Run: `npm run ios:init`

### Available Scripts

```bash
# Desktop development
npm run tauri:dev          # Start desktop dev mode
npm run tauri:build        # Build desktop app

# Android development
npm run android:init       # Initialize Android project
npm run android:dev        # Start Android dev mode
npm run android:build      # Build Android APK (debug)
npm run android:build:release  # Build Android APK (release)

# iOS development
npm run ios:init           # Initialize iOS project
npm run ios:dev            # Start iOS dev mode
npm run ios:build          # Build iOS app (debug)
npm run ios:build:release  # Build iOS app (release)

# Web development
npm run dev                # Start web dev server
npm run build              # Build web app
```

## Code Signing Setup

### Tauri Code Signing
1. Generate a private key:
   ```bash
   tauri signer generate -w ~/.tauri/myapp.key
   ```
2. Add the key content to `TAURI_SIGNING_PRIVATE_KEY` secret
3. Add the password to `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secret

### Apple Code Signing
1. Export your Developer ID certificate from Keychain as .p12
2. Convert to base64: `base64 -i certificate.p12`
3. Add to `APPLE_CERTIFICATE` secret
4. Get your Team ID from Apple Developer portal
5. Generate App Store Connect API key and add details to secrets

### Android Code Signing
1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore myapp.jks -keyalg RSA -keysize 2048 -validity 10000 -alias myapp
   ```
2. Convert to base64: `base64 -i myapp.jks`
3. Add keystore, alias, and password to GitHub secrets

## Workflow Triggers

The workflow triggers on:
- Push to `main` branch (continuous deployment)
- Tagged releases (`v*`)
- Manual dispatch (for testing)

## Distribution Channels

After successful build and upload to CrabNebula Cloud:

1. **Desktop**: Distributed via CrabNebula Cloud with automatic updates
2. **Android**: Can be published to Google Play Store
3. **iOS**: Can be published to Apple App Store
4. **Web**: Already deployed to GitHub Pages

## Troubleshooting

### Common Issues

1. **Mobile builds fail**: Ensure platform is initialized locally first
2. **Code signing errors**: Verify all certificates and secrets are correctly configured
3. **Android NDK issues**: Make sure NDK version matches the workflow (r26d)
4. **iOS build fails**: Ensure Xcode and CocoaPods are properly installed

### Testing Builds Locally

Before pushing to production, test builds locally:

```bash
# Test desktop builds
npm run tauri:build

# Test Android (requires setup)
npm run android:build:release

# Test iOS (requires setup, macOS only)
npm run ios:build:release
```

## Security Considerations

- All signing keys should be stored as GitHub secrets
- Never commit certificates or keystores to version control
- Use strong passwords for all certificates and keystores
- Regularly rotate API keys and certificates

## Next Steps

1. Set up CrabNebula Cloud account and project
2. Configure all GitHub secrets
3. Update configuration files with your details
4. Test the workflow with a manual dispatch
5. Set up mobile development environments for local testing

The workflow will automatically build for all platforms when you push to the main branch or create a release tag.
