# Testing Floatplane webOS App Without a TV

## ✅ Build Verification (COMPLETED)

Your app successfully compiled with **ZERO errors**!

```
✓ Package: com.community.floatplane.webos_0.9.0_all.ipk
✓ Size: 1.7 MB
✓ Format: Valid Debian package
✓ All assets included (images, scripts, styles)
```

---

## Testing Methods (No TV Required)

### **Method 1: Browser Testing (Fastest - Available NOW)**

A local dev server is running at: **http://localhost:8888**

**How to test:**
1. Open http://localhost:8888 in Chrome, Firefox, or Safari
2. Use keyboard to simulate remote control:
   - **Arrow keys** = D-pad (UP/DOWN/LEFT/RIGHT)
   - **Enter or Space** = OK button
   - **Escape** = BACK button
3. Test all features:
   - Login screen navigation
   - Sample data mode
   - Creator browsing
   - Video playback (may have codec issues)
   - Chat simulation
   - Viewing mode cycling

**Limitations:**
- ❌ Some webOS-specific APIs won't work (platformBack, etc.)
- ❌ Video codecs may differ from TV
- ❌ Remote control physical buttons not tested
- ✅ All UI, navigation, and logic can be tested

**To stop the server:**
```bash
kill 28069
# Or find and kill:
lsof -ti:8888 | xargs kill
```

---

### **Method 2: webOS TV Simulator (Recommended)**

**Official LG browser-based simulator:**
- Download: https://webostv.developer.lge.com/develop/tools/simulator-installation
- Platform: Windows, macOS, Linux
- Type: Browser-based web simulator

**Pros:**
- ✅ Lightweight (no VirtualBox required)
- ✅ Fast setup
- ✅ webOS API support
- ✅ Remote control simulation
- ✅ Multiple webOS versions

**Cons:**
- ⚠️ Not 100% accurate (doesn't emulate hardware)
- ⚠️ May miss some edge cases

**Setup:**
1. Download from LG developer site
2. Install the simulator
3. Load your IPK: `dist/com.community.floatplane.webos_0.9.0_all.ipk`
4. Test with simulated remote

---

### **Method 3: webOS TV Emulator (Full Emulation)**

**Virtual machine-based full TV emulation:**
- Download: https://webostv.developer.lge.com/develop/tools/emulator-installation
- Platform: Windows, macOS, Linux
- Requires: Oracle VirtualBox 6.1

**Pros:**
- ✅ Most accurate (full TV emulation)
- ✅ All webOS APIs work
- ✅ Hardware acceleration
- ✅ Real TV behavior

**Cons:**
- ❌ Heavy (requires VirtualBox + VM)
- ❌ Slower performance
- ❌ Complex setup
- ⚠️ Note: Discontinued for webOS 22+ (use Simulator instead)

**Setup:**
1. Install Oracle VirtualBox 6.1
2. Download webOS TV Emulator from LG
3. Run `vm_register.bat` (Windows) or equivalent
4. Launch emulator
5. Install app via ares-cli:
   ```bash
   ares-setup-device --add emulator
   ares-install --device emulator dist/*.ipk
   ares-launch --device emulator com.community.floatplane.webos
   ```

---

### **Method 4: CLI Validation (Build Testing Only)**

**Validate package structure without running:**

```bash
# 1. Package the app
cd /Volumes/macminiExtern/webos_app
ares-package . --outdir ./dist --no-minify

# 2. Inspect package contents
cd dist
ar -x com.community.floatplane.webos_0.9.0_all.ipk
tar -tzf data.tar.gz

# 3. Verify appinfo.json
tar -xzf data.tar.gz usr/palm/applications/com.community.floatplane.webos/appinfo.json -O | cat

# 4. Check package info
ares-package-info dist/*.ipk
```

**What this validates:**
- ✅ No syntax errors in code
- ✅ All files are included
- ✅ Package structure is correct
- ✅ appinfo.json is valid
- ❌ Does NOT test runtime behavior

---

## Current Testing Status

### ✅ Completed Tests:
- [x] Build compiles without errors
- [x] Package structure is valid
- [x] All required files present
- [x] appinfo.json correctly formatted
- [x] All image assets included (icon, largeIcon, bg, splash)
- [x] File sizes within limits
- [x] Image dimensions exact

### ⏳ Pending Tests (Need TV or Emulator):
- [ ] App launches successfully
- [ ] Remote control navigation works
- [ ] Login authentication
- [ ] Video playback (Shaka Player)
- [ ] Live stream support
- [ ] Chat functionality
- [ ] Viewing mode switching
- [ ] Memory usage on real hardware
- [ ] Performance on webOS 4.0 vs webOS 24

---

## Recommended Testing Workflow

**Phase 1: Quick Validation (NOW)**
1. ✅ Browser test at http://localhost:8888
2. ✅ Navigate with keyboard
3. ✅ Test sample data mode
4. ✅ Verify UI layout and styling

**Phase 2: Simulator Testing (NEXT)**
1. Download LG webOS Simulator
2. Load IPK file
3. Test with simulated remote
4. Verify webOS APIs work

**Phase 3: Real TV Testing (FINAL)**
1. Install on 2018 TV (webOS 4.0)
2. Install on 2024 TV (webOS 24)
3. Full feature testing
4. Performance validation
5. Remote control UX testing

---

## Quick Commands Reference

```bash
# Package for testing
ares-package . --outdir ./dist --no-minify

# Package for production (with minification)
ares-package . --outdir ./dist

# Inspect package
ares-package-info dist/*.ipk

# Start browser test server
cd /Volumes/macminiExtern/webos_app
python3 -m http.server 8888

# Install on device (when ready)
ares-install --device tv2018 dist/*.ipk
ares-launch --device tv2018 com.community.floatplane.webos

# Debug on device
ares-inspect --device tv2018 --app com.community.floatplane.webos --open
```

---

## Known Issues Fixed

✅ **Non-English filenames in docs/** - Fixed (renamed to English)
✅ **Duplicate HTML IDs** - Fixed (only one playerJumpToLive button)
✅ **Missing JavaScript files** - Fixed (chat-service.js, viewing-mode-manager.js added)
✅ **Missing image assets** - Fixed (all 4 placeholder PNGs added)
✅ **Unofficial branding** - Fixed (appinfo.json updated to community project)

---

## Next Steps

1. **NOW:** Test in browser at http://localhost:8888
2. **TODAY:** Download and test with LG Simulator
3. **WHEN READY:** Deploy to real TVs for final validation

**The app is BUILD-READY and can be tested without a TV!** ✅
