# Floatplane Enact MVP

A webOS TV application for watching Floatplane content, built with the Enact framework and featuring encrypted HLS video playback support.

## ✨ Features

- 🔐 Login with Floatplane credentials
- 📺 Browse and watch Floatplane videos
- 🎬 Support for both unencrypted and encrypted HLS video streams
- 🔑 Custom HLS key loader for encrypted content via Luna Service
- 🎮 Remote control navigation with Spotlight
- 🌙 Moonstone UI theme optimized for TV

## 🖥️ Platform Compatibility

### ✅ Supported Platforms

This application requires:

- **webOS TV 6.0 or later** (2021+ LG TVs)
- LG TV models: C1, G1, A1 series (2021) and newer
- Examples: OLED55C1, OLED65G1, OLED77C2, etc.

### ❌ Unsupported Platforms

This application **will not work** on:

- webOS 4.0 - 5.0 (2018-2020 LG TVs)
- Examples: C8, C9, CX series

**Reason:** The app uses Enact 4.5.6 and React 18, which require webOS 6.0+. Older webOS versions (4.0-5.0) only support Enact 1.x with React 15.

For more details and migration options, see:
- [webOS Compatibility Guide](docs/WEBOS_COMPATIBILITY.md)
- [Migration Guide to Enact 1.13](docs/MIGRATION_GUIDE_ENACT_1.md)

## 🚀 Getting Started

### Prerequisites

#### 1. LG Developer Account

**Create an LG Developer Account:**
1. Visit [LG Seller Lounge](https://www.lgsellerlounge.com/)
2. Click "Join" and complete registration
3. Verify your email address
4. **Note:** You may need to wait for account approval (can take 1-2 business days)

**Why needed:**
- Access to webOS TV SDK documentation
- Submit apps to LG Content Store (if publishing)
- Access developer forums and support

**Alternative:** You can develop and test without an account, but you won't be able to publish to the store.

#### 2. Enable Developer Mode on Your LG TV

**Install Developer Mode App:**
1. On your LG TV, open the **LG Content Store**
2. Search for "**Developer Mode**"
3. Install the "Developer Mode" app
4. Launch the Developer Mode app

**Configure Developer Mode:**
1. In the app, toggle "**Dev Mode Status**" to **ON**
2. Toggle "**Key Server**" to **ON**
3. Note the **Passphrase** displayed (you'll need this later)
4. Note your TV's **IP address**
5. The default SSH port is **9922**

**Important:**
- Developer Mode times out after a few hours of inactivity
- You'll need to turn it back on if it times out
- The passphrase may change when you restart Developer Mode

#### 3. System Requirements

**Operating System:**
- macOS (tested)
- Linux
- Windows (with some path adjustments)

**Required Software:**

**Node.js & npm:**
```bash
# Install Node.js 20+ using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x or v22.x.x
npm --version   # Should show v10.x.x or newer
```

**LG webOS TV SDK:**

The SDK includes the `ares-*` command-line tools for packaging and deploying apps.

**Installation on macOS:**
```bash
# Download the CLI tools
# Visit: https://webostv.developer.lge.com/develop/tools/cli-installation

# Or install via Homebrew (if available)
brew install webos-tv-sdk

# Add to PATH (if not using Homebrew)
echo 'export PATH="$PATH:/opt/webOS_TV_SDK/CLI/bin"' >> ~/.zshrc
source ~/.zshrc
```

**Installation on Linux:**
```bash
# Download from: https://webostv.developer.lge.com/develop/tools/cli-installation
# Extract and add to PATH
export PATH="$PATH:/opt/webOS_TV_SDK/CLI/bin"
```

**Installation on Windows:**
1. Download installer from [LG webOS Developer Site](https://webostv.developer.lge.com/develop/tools/cli-installation)
2. Run installer
3. Tools will be added to PATH automatically

**Verify SDK Installation:**
```bash
ares-setup-device --version
ares-install --version
ares-launch --version
```

**For Node version management (optional but recommended):**
```bash
# You'll need Node 16 for some ares commands
nvm install 16
```

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/mblue-code/videoplayer-clone-webos.git
cd videoplayer-clone-webos/enact-mvp
```

2. **Install dependencies:**
```bash
npm install
```

This will install:
- Enact framework (4.5.6)
- React (18.2.0)
- HLS.js (1.6.13)
- Other dependencies

### Development

**Local Development Server:**
```bash
npm run serve
```

- Opens browser at `http://localhost:8080`
- Hot reload enabled
- Test in modern browser before deploying to TV

**Note:** The Luna Service integration (login, encrypted videos) won't work in browser - you need to deploy to actual TV hardware for full functionality.

## 📦 Building and Deployment

### Step 1: Set Up Device Connection

**Add your TV as a target device:**

```bash
# Use Node 16 for ares commands
nvm use 16

# Add device (replace with your TV's IP and passphrase)
ares-setup-device --add tv1 --info "{'host':'192.168.1.X','port':'9922','username':'prisoner'}"
```

**Get SSH key from TV:**

You need to authenticate with your TV using the passphrase from Developer Mode app.

**Method 1: Using expect (macOS/Linux):**
```bash
/usr/bin/expect <<'EXPECT_SCRIPT'
set timeout 30
spawn ares-novacom --device tv1 --getkey
expect "input passphrase:"
send "YOUR_PASSPHRASE_HERE\r"
expect eof
EXPECT_SCRIPT
```

**Method 2: Interactive (works on all platforms):**
```bash
ares-novacom --device tv1 --getkey
# When prompted, enter the passphrase from your TV's Developer Mode app
```

**Verify connection:**
```bash
ares-device-info --device tv1
```

You should see your TV's information (model, webOS version, etc).

### Step 2: Build the Application

```bash
# Build for production
npm run pack
```

This creates optimized bundles in the `dist/` folder:
- `dist/main.js` - Application bundle (~5.4 MB)
- `dist/main.css` - Styles (~352 KB)
- `dist/index.html` - Entry point
- `dist/appinfo.json` - App metadata

### Step 3: Package the App

Create an IPK (webOS app package) including the app and Luna Service:

```bash
nvm use 16

# Package app with services
ares-package dist services
```

This creates: `com.community.floatplane.enactmvp_0.1.0_all.ipk`

**What gets packaged:**
- `dist/` - Built application files
- `services/` - Luna Service (login-service) for server-side API calls
- `appinfo.json` - App manifest

### Step 4: Install to TV

```bash
# Install the IPK
ares-install --device tv1 com.community.floatplane.enactmvp_0.1.0_all.ipk
```

**Expected output:**
```
[Info] Set target device : tv1
Installing package com.community.floatplane.enactmvp_0.1.0_all.ipk
- Processing
Success
```

### Step 5: Launch the App

```bash
# Launch on TV
ares-launch --device tv1 com.community.floatplane.enactmvp
```

The app will appear on your TV screen.

### Step 6: Debugging (Optional)

**Open Chrome DevTools Inspector:**

```bash
# Open inspector with browser
ares-inspect --device tv1 --app com.community.floatplane.enactmvp --open
```

This opens Chrome DevTools connected to your TV. You can:
- View console logs
- Inspect DOM
- Debug JavaScript
- Monitor network requests
- Profile performance

**View app logs:**

```bash
# Stream logs from TV
ares-log --device tv1 -f | grep -i floatplane
```

## 🔄 Development Workflow

### Quick Deploy (After Changes)

```bash
# 1. Rebuild
npm run pack

# 2. Repackage and reinstall
nvm use 16
ares-package dist services && \
ares-install --device tv1 com.community.floatplane.enactmvp_0.1.0_all.ipk

# 3. Relaunch
ares-launch --device tv1 com.community.floatplane.enactmvp
```

**Or as a one-liner:**
```bash
npm run pack && source ~/.nvm/nvm.sh && nvm use 16 && ares-package dist services && ares-install --device tv1 com.community.floatplane.enactmvp_0.1.0_all.ipk && ares-launch --device tv1 com.community.floatplane.enactmvp
```

### Managing Multiple TVs

```bash
# Add another TV (replace with your second TV's IP)
ares-setup-device --add tv2 --info "{'host':'192.168.1.Y','port':'9922','username':'prisoner'}"

# Get key for second TV
ares-novacom --device tv2 --getkey

# Deploy to specific TV
ares-install --device tv2 com.community.floatplane.enactmvp_0.1.0_all.ipk
ares-launch --device tv2 com.community.floatplane.enactmvp

# List all configured devices
ares-setup-device --list
```

### Uninstalling the App

```bash
# Remove from TV
ares-install --device tv1 --remove com.community.floatplane.enactmvp
```

## 🏗️ Project Structure

```
enact-mvp/
├── src/
│   ├── App/
│   │   └── App.js              # Main application component
│   ├── components/
│   │   └── LoginForm.js        # Login form component
│   ├── styles/
│   │   └── main.less           # Application styles
│   └── index.js                # Entry point
├── services/
│   └── login-service/
│       ├── login-service.js    # Luna Service for API calls
│       ├── package.json        # Service metadata
│       └── services.json       # Service configuration
├── dist/                       # Build output (generated)
├── docs/
│   ├── WEBOS_COMPATIBILITY.md  # Platform compatibility guide
│   └── MIGRATION_GUIDE_ENACT_1.md  # Legacy platform migration
├── resources/                  # App icons (update with assets you have rights to use)
├── appinfo.json                # App manifest
├── package.json                # Node dependencies
└── README.md                   # This file
```

## 🔧 Key Technologies

### Frontend
- **Enact 4.5.6**: React-based framework for webOS
- **React 18.2.0**: UI library
- **Moonstone**: TV-optimized UI component library
- **HLS.js 1.6.13**: HTTP Live Streaming playback
- **Spotlight**: Focus management for remote control

### Backend (Luna Service)
- **Node.js service**: Runs on TV for server-side operations
- **Luna Bus (LS2)**: webOS IPC for app ↔ service communication
- **HTTPS requests**: Server-side API calls to bypass CORS

### Build Tools
- **Enact CLI 5.0**: Build and development server
- **Webpack**: Module bundler (configured by Enact CLI)
- **Babel**: JavaScript transpilation
- **ESLint**: Code linting

## 🎥 Architecture

### Encrypted Video Playback Flow

1. **User selects video** → App requests video delivery info from Floatplane API
2. **Floatplane returns HLS manifest URL** with encrypted segments
3. **HLS.js loads manifest** and discovers encryption keys needed
4. **Custom HLS Loader intercepts key requests**:
   - Detects URLs matching `/api/video/watchKey`
   - Routes through Luna Service instead of direct browser XHR
5. **Luna Service fetches key** from Floatplane with authentication cookies
6. **Key returned as base64** → Decoded to ArrayBuffer
7. **HLS.js decrypts segments** and plays video

**Why Luna Service is needed:**
- Floatplane's key endpoint blocks direct browser requests (403 errors)
- Luna Service runs server-side on TV with full network access
- Service maintains authentication cookies for API calls

### Custom HLS Loader

Located in `src/App/App.js`:

```javascript
class FloatplaneKeyLoader extends BaseLoader {
  load(context, config, callbacks) {
    const url = context.url;
    const isKeyRequest = url.includes('/api/video/watchKey');

    if (isKeyRequest) {
      // Route through Luna Service
      this.fetchViaLunaService(url, callbacks);
    } else {
      // Use default loader for manifests/segments
      super.load(context, config, callbacks);
    }
  }
}
```

## 📝 Configuration

### App Metadata (appinfo.json)

```json
{
  "id": "com.community.floatplane.enactmvp",
  "version": "0.1.0",
  "vendor": "Community Floatplane",
  "type": "web",
  "main": "index.html",
  "title": "Floatplane Enact MVP",
  "icon": "resources/icon.png",
  "largeIcon": "resources/largeIcon.png"
}
```

### Luna Service Configuration

Located in `services/login-service/services.json`:

```json
{
  "id": "com.community.floatplane.enactmvp.login",
  "description": "Floatplane login and API service",
  "services": [{
    "name": "com.community.floatplane.enactmvp.login"
  }]
}
```

## 🐛 Troubleshooting

### Device Connection Issues

**Problem:** `ares-install` fails with "All configured authentication methods failed"

**Solution:**
1. Ensure Developer Mode is **ON** and **Key Server** is enabled on TV
2. Re-run `ares-novacom --device tv1 --getkey` with correct passphrase
3. Check TV's IP hasn't changed (DHCP)
4. Verify firewall isn't blocking port 9922

### App Shows Black Screen

**Problem:** App launches but shows only a black screen

**Solution:**
1. **Check webOS version:**
   ```bash
   ares-device-info --device tv1
   ```
   Ensure it's webOS 6.0 or later (2021+ TV)

2. **Open inspector and check console:**
   ```bash
   ares-inspect --device tv1 --app com.community.floatplane.enactmvp --open
   ```
   Look for JavaScript errors

3. **Check if you're on an older TV (2018-2020):**
   - webOS 4.0-5.0 requires Enact 1.13 (not supported by this version)
   - See [Migration Guide](docs/MIGRATION_GUIDE_ENACT_1.md)

### Video Won't Play

**Problem:** Videos show grey screen or fail to load

**Possible causes:**

1. **Luna Service not running:**
   ```bash
   # Check service status
   ares-inspect --device tv1 --service com.community.floatplane.enactmvp.login --open
   ```

2. **HLS.js errors:**
   - Check browser console for `keyLoadError`
   - Verify custom loader is intercepting key requests
   - Check network tab for failed requests

3. **Not logged in:**
   - Ensure you've logged in with Floatplane credentials
   - Check cookies are being saved

### Build Errors

**Problem:** `npm run pack` fails

**Solutions:**

1. **Clear cache and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node version:**
   ```bash
   node --version  # Should be 20+ or 22+
   ```

3. **Update dependencies:**
   ```bash
   npm update
   ```

### Luna Service Not Working

**Problem:** API calls fail, login doesn't work

**Solution:**

1. **Verify service is installed:**
   ```bash
   # Check services directory is in package
   ares-package dist services
   ```

2. **Reinstall service separately:**
   ```bash
   npm run install-service
   ```

3. **Check service logs:**
   ```bash
   ares-inspect --device tv1 --service com.community.floatplane.enactmvp.login --open
   ```

## 🚢 Publishing to LG Content Store

### 1. Prepare for Submission

- Test thoroughly on multiple TV models
- Ensure app meets [LG Content Policy](https://webostv.developer.lge.com/distribute/app-review-policy)
- Create original app icons (80x80 and 130x130) or confirm you have rights to use existing artwork
- Prepare screenshots (1920x1080)
- Write app description and release notes

### 2. Sign the App

```bash
# Generate signing certificate (one-time)
ares-generate-certificate

# Package and sign
ares-package dist services --sign
```

### 3. Submit to Store

1. Log in to [LG Seller Lounge](https://www.lgsellerlounge.com/)
2. Go to "Content Management" → "App Management"
3. Click "Add New App"
4. Upload signed IPK
5. Fill in app information
6. Submit for review

**Review process:** Typically 5-10 business days

## 📚 Additional Resources

### Official Documentation
- [LG webOS TV Developer Portal](https://webostv.developer.lge.com/)
- [Enact Framework Docs](https://enactjs.com/docs/)
- [Moonstone Component Library](https://enactjs.com/docs/modules/moonstone/)
- [webOS TV SDK CLI Reference](https://webostv.developer.lge.com/develop/tools/cli-commands)

### Community
- [webOS TV Developer Forum](https://forum.webostv.developer.lge.com/)
- [Enact Slack](https://enactjs.slack.com/)
- [Enact GitHub](https://github.com/enactjs/enact)

### Tutorials
- [Getting Started with Enact](https://enactjs.com/docs/tutorials/tutorial-kitten-browser/)
- [webOS TV App Development Guide](https://webostv.developer.lge.com/develop/guides/)
- [Luna Service Integration](https://webostv.developer.lge.com/develop/guides/services-introduction)

## 📄 License

[Add your license here]

## 👥 Contributors

- Initial development: [Your name]
- Encrypted video playback: Custom HLS loader implementation
- Documentation: Comprehensive compatibility and migration guides

## 🙏 Acknowledgments

- [Enact Framework](https://enactjs.com/) by LG Electronics
- [HLS.js](https://github.com/video-dev/hls.js/) for video playback
- Floatplane API for content delivery

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- See [Troubleshooting](#-troubleshooting) section
- Check [webOS Compatibility Guide](docs/WEBOS_COMPATIBILITY.md)

---

**Note:** This is an unofficial, community-developed application. It is not affiliated with or endorsed by Floatplane Media Inc. or LG Electronics.
