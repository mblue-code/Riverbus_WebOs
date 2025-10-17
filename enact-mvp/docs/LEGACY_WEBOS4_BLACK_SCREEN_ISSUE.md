# Legacy webOS 4.0 Black Screen Issue

## Status: UNRESOLVED

**Last Updated:** October 17, 2025
**Target Device:** LG OLED55C8LLA (2018 webOS 4.0 TV)
**Build Configuration:** Enact 1.13.4 + React 15.6.2 + Node 10

---

## Issue Summary

The legacy Enact 1.x app builds successfully and deploys to the webOS 4.0 TV, but displays only a **black screen** with no visible UI or debug overlay. JavaScript appears to not be executing at all.

---

## Current State

### ✅ What's Working

1. **Build Process:**
   - Clean build with `@enact/cli@1.2.1` using Node 10
   - Webpack compilation succeeds with only warnings (no errors)
   - Bundle size: ~3.8MB main.js

2. **Dependency Management:**
   - Successfully consolidated to React 15.6.2 (no React 16 leaking)
   - `npm dedupe` removed duplicate packages
   - All Enact 1.13.4 packages properly installed

3. **Deployment:**
   - Package creation succeeds
   - Installation to tv3 succeeds
   - App launches without errors
   - Luna Service included in package (`services/login-service/`)

4. **ReactCurrentDispatcher Error Fixed:**
   - Previous error: `Uncaught TypeError: cannot read property ReactCurrentDispatcher of undefined`
   - Fixed by: `npm dedupe` + webpack config with React 15 aliases
   - **This error no longer appears**

### ❌ What's Not Working

1. **Complete Black Screen:**
   - No UI elements visible
   - No debug overlay visible (should show blue box with app status)
   - No error messages displayed
   - JavaScript appears to not execute at all

2. **Debug Instrumentation Not Appearing:**
   - Added comprehensive debug overlay in `src/index.js` (lines 6-60)
   - Blue overlay should appear immediately on page load
   - **Nothing shows** - indicates JS isn't running

---

## Technical Details

### Build Environment

```bash
# Build (legacy Enact 1.x)
Node: v10.24.1
npm: 6.14.12
@enact/cli: ~1.2.1

# Deployment (webOS CLI)
Node: v16.20.2
npm: 8.19.4
```

### Package Structure

```
com.community.floatplane.enactmvp_0.1.0_all.ipk
├── appinfo.json
├── index.html
├── main.js (3,950,042 bytes)
├── main.css
├── resources/
│   ├── icon.png
│   ├── largeIcon.png
│   └── ilibmanifest.json
└── services/
    └── login-service/
        ├── login-service.js
        ├── services.json
        ├── package.json
        └── com.community.floatplane.enactmvp.login.json
```

### Debug Instrumentation Added

**File:** `src/index.js` (lines 6-60)

```javascript
if (typeof document !== 'undefined') {
  const debugNode = document.createElement('div');
  debugNode.id = 'legacy-debug-overlay';
  debugNode.style.position = 'fixed';
  debugNode.style.top = '16px';
  debugNode.style.left = '16px';
  debugNode.style.zIndex = '9999';
  debugNode.style.padding = '8px 12px';
  debugNode.style.background = 'rgba(0, 128, 255, 0.85)';
  debugNode.style.color = '#fff';
  debugNode.style.fontFamily = 'Arial, sans-serif';
  debugNode.style.fontSize = '16px';
  debugNode.style.borderRadius = '4px';
  debugNode.textContent = 'Legacy app booting…';
  document.body.appendChild(debugNode);

  const updateOverlay = (message, isError) => {
    if (!debugNode) return;
    debugNode.style.background = isError ? 'rgba(200, 0, 0, 0.85)' : 'rgba(0, 128, 255, 0.85)';
    debugNode.textContent = message;
  };

  window.addEventListener('error', (event) =>
    updateOverlay(`Error: ${event && event.message ? event.message : 'Unknown error'}`, true)
  );
  window.addEventListener('unhandledrejection', (event) =>
    updateOverlay(`Promise error: ${event && event.reason && event.reason.message ? event.reason.message : 'Unknown rejection'}`, true)
  );
  window.__updateLegacyOverlay = updateOverlay;
}
```

**Expected behavior:** Blue overlay should appear immediately when page loads
**Actual behavior:** Nothing appears (black screen only)

### Deployment Commands Used

```bash
# 1. Build with Enact 1.x
cd legacy-webos4-enact1
source ~/.nvm/nvm.sh && nvm use 10
npm run pack

# 2. Package with services
rm -rf .package-tmp && mkdir -p .package-tmp
cp appinfo.json .package-tmp/
cp -r dist/* .package-tmp/
cp -r services .package-tmp/
source ~/.nvm/nvm.sh && nvm use 16
ares-package .package-tmp

# 3. Deploy to tv3
ares-install -d tv3 com.community.floatplane.enactmvp_0.1.0_all.ipk
ares-launch -d tv3 com.community.floatplane.enactmvp
```

---

## Possible Causes

### 1. JavaScript Syntax Incompatibility

**Hypothesis:** The bundled JavaScript contains syntax that webOS 4.0's Chromium (v53-63) cannot parse.

**Evidence:**
- No debug overlay appears (should execute before React)
- Complete silence from the app (no errors, no UI)
- Modern syntax may have leaked from Enact 1.x or dependencies

**Investigation needed:**
- Check `main.js` for ES6+ features not supported in Chromium 53-63
- Verify Babel transpilation is targeting correct browser version
- Look for: async/await, spread operators, optional chaining, etc.

### 2. Luna Service Call Blocking

**Hypothesis:** App attempts to call Luna Service and blocks/crashes if service isn't ready.

**Evidence:**
- Service is now included in package
- Login UI relies on `luna://com.community.floatplane.login.service`
- webOS 4.0 may handle service initialization differently

**Investigation needed:**
- Check if app waits for service availability
- Verify service registration on tv3
- Test if removing service calls allows UI to appear

### 3. CSP or Security Policy

**Hypothesis:** webOS 4.0 Content Security Policy blocks script execution.

**Evidence:**
- Different security model than modern webOS
- No errors logged (silently blocked?)
- Scripts may be rejected without notification

**Investigation needed:**
- Check `appinfo.json` for required permissions
- Verify `index.html` doesn't have restrictive CSP headers
- Test with minimal HTML/JS to isolate issue

### 4. Missing Polyfills

**Hypothesis:** App requires browser features not available in Chromium 53-63.

**Evidence:**
- Enact 1.x assumes certain baseline features
- `core-js` included but may not cover everything
- React 15.6.2 expects some modern APIs

**Investigation needed:**
- Add comprehensive polyfills for Chromium 53
- Check for missing Promise, fetch, or DOM APIs
- Test with manual polyfill injection

### 5. Resource Loading Failure

**Hypothesis:** `main.js` or `main.css` fails to load completely.

**Evidence:**
- Files are large (3.8MB JS)
- webOS 4.0 may have memory constraints
- Black screen could mean failed resource loading

**Investigation needed:**
- Verify files exist on device after deployment
- Check file permissions on tv3
- Test with split bundles or smaller build

---

## Diagnostic Steps Attempted

1. ✅ **Fixed ReactCurrentDispatcher error** via `npm dedupe`
2. ✅ **Added debug overlay** to visualize app state
3. ✅ **Included Luna Service** in package deployment
4. ✅ **Verified React 15.6.2** is only version in node_modules
5. ✅ **Created webpack alias config** to force React 15
6. ❌ **Unable to get logs** - `ares-log` not supported on webOS 4.0
7. ❌ **Unable to access shell** - `ares-shell` not supported on webOS 4.0
8. ❌ **DevTools inspector** - compatibility issues with webOS 4.0

---

## Next Steps to Try

### Immediate Actions

1. **Inspect DevTools (if accessible):**
   ```bash
   ares-inspect -d tv3 --app com.community.floatplane.enactmvp --open
   ```
   - Check console for JavaScript errors
   - Verify main.js loads successfully
   - Look for network failures

2. **Create Minimal Test App:**
   - Build simplest possible Enact 1.x app
   - Just render "Hello World"
   - No Luna Service, no complex logic
   - If this works, incrementally add features

3. **Analyze Bundle Contents:**
   ```bash
   # Extract and search for incompatible syntax
   grep -r "async function" dist/main.js
   grep -r "?\\." dist/main.js  # optional chaining
   grep -r "??` dist/main.js   # nullish coalescing
   ```

4. **Add Babel Targets:**
   - Configure Babel to explicitly target Chromium 53
   - Ensure all modern syntax is transpiled
   - Add comprehensive polyfills

5. **Test on Another webOS 4.0 TV:**
   - Verify issue is consistent across devices
   - Rule out device-specific problems

### Long-term Solutions

1. **Consider Abandoning Enact 1.x:**
   - Too old, too many compatibility issues
   - Modern webOS app (Enact 5.x) works perfectly
   - Focus on webOS 6.0+ support only

2. **Build Vanilla React 15 App:**
   - Skip Enact framework entirely
   - Use plain React 15 + ReactDOM
   - Manual Luna Service integration
   - More control over build output

3. **Use webOS SDK 2.x Documentation:**
   - Research 2018 webOS 4.0 app requirements
   - Check LG's legacy documentation
   - Find reference apps from that era

---

## Related Files

- `legacy-webos4-enact1/src/index.js` - Entry point with debug overlay
- `legacy-webos4-enact1/src/App/App.js` - Main app component
- `legacy-webos4-enact1/enact.config.js` - Webpack config forcing React 15
- `legacy-webos4-enact1/package.json` - Dependencies locked to Enact 1.13.4
- `legacy-webos4-enact1/services/login-service/` - Luna Service implementation

---

## Comparison: Legacy vs Modern

| Feature | Legacy (webOS 4.0) | Modern (webOS 6.0+) |
|---------|-------------------|-------------------|
| **Status** | ❌ Black screen | ✅ Fully functional |
| **Framework** | Enact 1.13.4 | Enact 5.6.0 |
| **React** | 15.6.2 | 18.3.1 |
| **Build Tool** | @enact/cli 1.2.1 | @enact/cli 6.1.5 |
| **Node** | 10.24.1 | 20.x |
| **Browser** | Chromium 53-63 | Chromium 108+ |
| **Logs** | ❌ No access | ✅ ares-log works |
| **DevTools** | ⚠️ Limited | ✅ Full support |
| **Luna Service** | Included | Included |
| **HLS Playback** | ❓ Untested | ✅ Works |

---

## Conclusion

The legacy webOS 4.0 app is currently **non-functional** despite fixing the React version mismatch. The black screen indicates a fundamental issue with JavaScript execution, possibly due to:

1. Syntax incompatibility with old Chromium
2. Service initialization blocking
3. Security policy restrictions
4. Resource loading failures

Without access to logs or DevTools, debugging is extremely difficult. The **recommendation is to focus on the modern Enact 5.x app** which works perfectly on webOS 6.0+ TVs, and consider webOS 4.0 support as a "nice to have" rather than a requirement.

If webOS 4.0 support is critical, the next step should be creating a minimal test app to isolate the exact cause of the failure.
