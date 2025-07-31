# GitHub Secrets Quick Reference

This is a quick reference for setting up GitHub repository secrets for cross-platform distribution.

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the name and value for each secret below

## Required Secrets by Platform

### ✅ Basic Release (No Code Signing)
No secrets required - builds will work but won't be signed.

### 🔐 Desktop Code Signing (Recommended)
```
TAURI_SIGNING_PRIVATE_KEY          # Content of your Tauri private key file
TAURI_SIGNING_PRIVATE_KEY_PASSWORD # Password for the private key
```

### 🍎 macOS/iOS Signing (Required for App Store)
```
APPLE_CERTIFICATE                  # Base64-encoded .p12 certificate
APPLE_CERTIFICATE_PASSWORD         # Certificate password
APPLE_SIGNING_IDENTITY             # e.g., "Developer ID Application: Your Name"
APPLE_DEVELOPMENT_TEAM             # Your Apple Team ID (10 characters)

# For App Store Connect (iOS only)
APPLE_API_KEY                      # Content of .p8 API key file
APPLE_API_KEY_ID                   # API Key ID (10 characters)
APPLE_API_ISSUER                   # Issuer ID (UUID format)
```

### 🤖 Android Signing (Required for Play Store)
```
ANDROID_KEY_ALIAS                  # Keystore alias name
ANDROID_KEY_PASSWORD               # Keystore password
ANDROID_KEY_BASE64                 # Base64-encoded .jks keystore file
```

### ☁️ CrabNebula Cloud (Optional)
```
CN_API_KEY                         # Your CrabNebula Cloud API key
```

## How to Generate Signing Keys

### Tauri Code Signing
```bash
# Generate a new signing key
tauri signer generate -w ~/.tauri/spiral_animator.key

# Get the key content (copy this to TAURI_SIGNING_PRIVATE_KEY)
cat ~/.tauri/spiral_animator.key

# Use the password you set during generation for TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

### Android Keystore
```bash
# Generate Android keystore
keytool -genkey -v -keystore spiral_animator.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias spiral_animator

# Convert to base64 (copy this to ANDROID_KEY_BASE64)
base64 -i spiral_animator.jks | tr -d '\n'

# Use the alias and password you set for the other Android secrets
```

### Apple Certificates
1. **Get Apple Developer Team ID**:
   - Login to [Apple Developer](https://developer.apple.com/)
   - Go to Membership → Team ID

2. **Export Certificate**:
   - Open Keychain Access on macOS
   - Find your "Developer ID Application" certificate
   - Right-click → Export → Save as .p12
   - Convert to base64: `base64 -i certificate.p12 | tr -d '\n'`

3. **App Store Connect API Key** (iOS only):
   - Go to [App Store Connect](https://appstoreconnect.apple.com/)
   - Users and Access → Keys → App Store Connect API
   - Generate new key, download .p8 file
   - Get the content: `cat AuthKey_XXXXXXXXXX.p8`

## Verification

### Test Your Setup
1. **Create a test tag**: `git tag test-v1.0.0 && git push origin test-v1.0.0`
2. **Check Actions tab**: Watch the workflow run
3. **Fix any errors**: Review logs and update secrets as needed
4. **Delete test tag**: `git tag -d test-v1.0.0 && git push origin :refs/tags/test-v1.0.0`

### Common Issues
- **"Context access might be invalid"**: Normal lint warning - secrets exist at runtime
- **Android build fails**: Make sure `ANDROID_HOME` is set in the workflow (handled automatically)
- **iOS build skipped**: Requires Apple secrets to be configured
- **Unsigned builds**: Will work but show security warnings to users

## Security Best Practices

- ✅ Never commit certificates or keys to git
- ✅ Use strong passwords for all keystores/certificates
- ✅ Rotate API keys and certificates regularly
- ✅ Use separate certificates for development and production
- ✅ Limit repository access to trusted collaborators

## Platform-Specific Notes

### Windows
- No additional signing required (builds will work unsigned)
- Consider getting a code signing certificate for production

### macOS
- Apps must be signed for distribution outside Mac App Store
- Notarization required for Gatekeeper compatibility

### iOS
- Requires Apple Developer account ($99/year)
- Apps must be signed for any distribution

### Android
- Can distribute unsigned APKs for testing
- Play Store requires signed APKs

### Linux
- No signing required
- AppImage and .deb packages supported
