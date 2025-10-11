# webOS Simulator/Emulator Setup Guide

## Option 1: Quick Browser Testing (Already Running!)

Your app is already accessible via browser at **http://localhost:8888**

**Advantages:**
- ✅ Already working
- ✅ Instant testing with Sample Data mode
- ✅ Tests all UI and features
- ✅ No additional downloads needed

**How to use:**
1. Open http://localhost:8888 in your browser
2. Click **"Use Sample Data"** button
3. Navigate with arrow keys, Enter, and Escape

---

## Option 2: webOS Emulator (VirtualBox-based)

The full webOS emulator requires downloading from LG's developer portal.

### Step 1: Download Emulator

1. **Visit:** https://webostv.developer.lge.com/develop/tools/emulator-installation
2. **Create LG Developer Account** (if you don't have one)
3. **Download webOS TV Emulator** for macOS
   - Choose **webOS TV 6.0** or later for best compatibility
   - File size: ~3-4 GB

### Step 2: Install VirtualBox

The emulator requires VirtualBox:

```bash
# Install VirtualBox via Homebrew
brew install --cask virtualbox
```

Or download from: https://www.virtualbox.org/wiki/Downloads

### Step 3: Install Emulator

1. Open the downloaded `.dmg` file
2. Run the webOS TV Emulator installer
3. Follow installation prompts
4. Launch **webOS TV Emulator Manager**

### Step 4: Create Virtual TV

1. Open **webOS TV Emulator Manager**
2. Click **"Create New"**
3. Select webOS version (6.0+ recommended)
4. Choose resolution (1920x1080 recommended)
5. Click **"Start"** to boot the virtual TV

### Step 5: Connect CLI to Emulator

```bash
# Add emulator as a device
ares-setup-device --add emulator --info "host=127.0.0.1,port=6622,username=prisoner"

# Set default device
ares-setup-device --default emulator

# List devices to verify
ares-setup-device --list
```

### Step 6: Install App to Emulator

```bash
# Package the app (if not already done)
cd /Volumes/macminiExtern/webos_app
ares-package . --outdir ./dist --no-minify

# Install to emulator
ares-install ./dist/com.community.floatplane.webos_0.9.0_all.ipk --device emulator

# Launch app
ares-launch com.community.floatplane.webos --device emulator

# View logs (useful for debugging)
ares-inspect com.community.floatplane.webos --device emulator --open
```

---

## Option 3: Deploy to Real LG TV (Recommended for Final Testing)

### Prerequisites
1. LG TV (2018 or newer)
2. TV and computer on same network

### Enable Developer Mode on TV

1. **On TV Remote:** Press Home → App List
2. **Install "Developer Mode"** app from LG Content Store
3. **Open Developer Mode app**
4. **Toggle "Developer Mode" ON**
5. **Note the IP address** shown on TV screen
6. **Set "Key Server" to ON** (if available)

### Connect CLI to TV

```bash
# Add your TV (replace with your TV's IP)
ares-setup-device --add tv --info "host=192.168.1.XXX,port=9922,username=prisoner"

# Set as default
ares-setup-device --default tv

# Verify connection
ares-setup-device --list
```

### Install to TV

```bash
# Package app
ares-package . --outdir ./dist --no-minify

# Install to TV
ares-install ./dist/com.community.floatplane.webos_0.9.0_all.ipk --device tv

# Launch app
ares-launch com.community.floatplane.webos --device tv

# Debug with DevTools
ares-inspect com.community.floatplane.webos --device tv --open
```

---

## Troubleshooting

### Emulator won't start
- Ensure VirtualBox is installed and running
- Check system preferences → Security & Privacy for VirtualBox permissions
- Try restarting VirtualBox and the emulator

### Can't connect to emulator
- Verify emulator is running
- Check port 6622 is not blocked by firewall
- Try recreating device connection: `ares-setup-device --add`

### App won't install
- Check appinfo.json for errors
- Verify package was created: `ls -lh ./dist/`
- Check emulator logs in Emulator Manager

### CORS issues on TV
- CORS should NOT be an issue on real TV or emulator
- Only affects browser testing
- Use Sample Data mode for browser testing

---

## Current Setup Status

✅ **webOS CLI Tools:** Installed (v3.2.1)
✅ **Browser Testing:** Available at http://localhost:8888
✅ **App Package:** Created at `./dist/com.community.floatplane.webos_0.9.0_all.ipk`
✅ **Sample Data Mode:** Working for offline testing

⏸️ **Emulator:** Not installed (requires manual download from LG)
⏸️ **Real TV:** Requires TV hardware with Developer Mode enabled

---

## Recommended Next Steps

### For Immediate Testing:
**Use Sample Data mode in browser** - Already working at http://localhost:8888

### For Realistic Testing:
**Deploy to real LG TV** - Most accurate testing environment

### For Development Without TV:
**Install webOS Emulator** - Download from https://webostv.developer.lge.com
