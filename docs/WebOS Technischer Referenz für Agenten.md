# LG webOS TV Development - Technical Reference for Coding Agents

## Document Purpose

This document serves as a comprehensive technical reference for AI coding agents and developers building applications for LG webOS TV platform. It contains platform-specific knowledge, constraints, best practices, and resources critical for successful webOS TV app development.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [webOS-Specific Constraints & Quirks](#webos-specific-constraints--quirks)
3. [Development Environment Setup](#development-environment-setup)
4. [Core webOS APIs](#core-webos-apis)
5. [Video Playback Architecture](#video-playback-architecture)
6. [Input & Navigation System](#input--navigation-system)
7. [Performance Optimization](#performance-optimization)
8. [Memory Management](#memory-management)
9. [Testing & Debugging](#testing--debugging)
10. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
11. [Essential Resources](#essential-resources)
12. [Platform Version Compatibility](#platform-version-compatibility)

---

## Platform Overview

### What is webOS TV?

- **Origin:** Developed by Palm, acquired by HP, then LG Electronics in 2013
- **Base:** Linux kernel with Chromium-based web engine
- **Architecture:** Web-based application platform (HTML5/CSS/JS)
- **Target:** Smart TVs (10-foot experience)
- **Market:** 200+ million devices globally, 150+ countries

### Key Characteristics

```
webOS TV Stack:
┌────────────────────────────────────────┐
│     Your App (HTML/CSS/JS)             │
├────────────────────────────────────────┤
│     webOS TV Platform APIs             │
│  (webOSTV.js, Luna Service API)        │
├────────────────────────────────────────┤
│     Chromium Browser Engine            │
│  (Version depends on webOS version)    │
├────────────────────────────────────────┤
│     Linux Kernel (webOS Base)          │
├────────────────────────────────────────┤
│     TV Hardware (ARM/x86)              │
└────────────────────────────────────────┘
```

### Chromium Versions by webOS Version

| webOS Version | TV Models | Chromium | Key Limitations |
|---------------|-----------|----------|-----------------|
| webOS 1.0 | 2014 | 34 | Very limited ES6, no fetch() |
| webOS 2.0 | 2015 | 34 | Same as 1.0 |
| webOS 3.0 | 2016 | 38 | Limited ES6, no async/await |
| webOS 3.5 | 2017 | 38 | Same as 3.0 |
| webOS 4.0 | 2018 | 53 | Better ES6, limited ES7 |
| webOS 4.5 | 2019 | 68 | Good ES6, some ES7 |
| webOS 5.0 | 2020 | 79 | Full ES6, most ES7/ES8 |
| webOS 6.0 | 2021 | 87 | Modern JS support |
| webOS 22+ | 2022+ | 94+ | Latest web standards |

**CRITICAL:** Always check target Chromium version. Old TVs have significant limitations!

---

## webOS-Specific Constraints & Quirks

### Hardware Limitations

#### Memory Constraints
```javascript
// webOS TVs have LIMITED RAM

webOS Version | Typical RAM | Available for Apps
--------------|-------------|-------------------
webOS 4.x     | 1 GB        | ~200-300 MB
webOS 5.x     | 1.1 GB      | ~250-350 MB
webOS 6.x     | 1.3 GB      | ~300-400 MB
webOS 22+     | 1.5-2 GB    | ~400-600 MB

// Your app WILL be killed if it exceeds memory limits
// Implement aggressive memory management!
```

**Implications:**
- Limit DOM element count (< 1000 elements)
- Clear unused elements aggressively
- Avoid large arrays/objects in memory
- Use lazy loading for images/content
- Implement pagination for long lists

#### CPU Constraints
```javascript
// TV CPUs are relatively weak (ARM-based)

// BAD - Will cause stuttering:
for (let i = 0; i < 10000; i++) {
  heavyComputation();
}

// GOOD - Use requestIdleCallback:
function processInChunks(items, chunkSize = 50) {
  let index = 0;
  
  function processChunk() {
    const chunk = items.slice(index, index + chunkSize);
    chunk.forEach(item => process(item));
    
    index += chunkSize;
    
    if (index < items.length) {
      requestIdleCallback(processChunk);
    }
  }
  
  processChunk();
}
```

### Browser API Limitations

#### localStorage Restrictions
```javascript
// CRITICAL: localStorage has limits on webOS

// Maximum size: 5-10 MB (varies by webOS version)
// WILL fail silently or throw quota errors if exceeded

// SOLUTION: Implement size checking
class SafeStorage {
  static set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      
      // Check size (rough estimate)
      if (serialized.length > 4000000) { // ~4MB
        console.warn('Value too large for localStorage');
        return false;
      }
      
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded');
        this.clearOldData();
        return false;
      }
      throw e;
    }
  }
  
  static clearOldData() {
    // Remove oldest cached data
    const keys = Object.keys(localStorage);
    keys.sort((a, b) => {
      const aTime = localStorage.getItem(`${a}_timestamp`);
      const bTime = localStorage.getItem(`${b}_timestamp`);
      return aTime - bTime;
    });
    
    // Remove oldest 20%
    const toRemove = Math.floor(keys.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(keys[i]);
    }
  }
}
```

#### No Service Workers
```javascript
// webOS does NOT support Service Workers
// This means:
// ❌ No offline caching
// ❌ No background sync
// ❌ No push notifications (via web standards)

// WORKAROUND: Use localStorage and manual caching
class ManualCache {
  static async fetchWithCache(url, maxAge = 3600000) {
    const cacheKey = `cache_${btoa(url)}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < maxAge) {
        return data;
      }
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    
    return data;
  }
}
```

#### WebRTC Limitations
```javascript
// webOS 4.x and earlier: NO WebRTC support
// webOS 5.x+: Partial WebRTC support

// Check before using:
if (!window.RTCPeerConnection) {
  console.warn('WebRTC not supported on this TV');
  // Fall back to HLS/DASH streaming
}
```

### CSS Quirks

#### Hardware Acceleration
```css
/* webOS requires explicit hardware acceleration hints */

/* BAD - May not be accelerated */
.element {
  transition: left 0.3s;
}

/* GOOD - Forces GPU acceleration */
.element {
  transform: translateZ(0); /* Forces layer creation */
  will-change: transform;
  transition: transform 0.3s;
}

.animated {
  transform: translate3d(100px, 0, 0); /* Use 3D transforms */
}
```

#### Flexbox Issues on Old webOS
```css
/* webOS 3.x and earlier have flexbox bugs */

/* BAD - Broken on webOS 3.x */
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* GOOD - More compatible */
.container {
  display: -webkit-box;
  display: -webkit-flex;
  display: flex;
  -webkit-flex-direction: column;
  flex-direction: column;
  height: 100%;
  min-height: 0; /* Important! */
}

.item {
  -webkit-box-flex: 1;
  -webkit-flex: 1;
  flex: 1;
  min-height: 0; /* Prevents overflow bugs */
}
```

### JavaScript Limitations

#### No ES6+ on Old Devices
```javascript
// webOS 4.0 and earlier have limited ES6 support

// Features to AVOID on webOS 4.x and earlier:
// ❌ async/await
// ❌ Arrow functions (use sparingly)
// ❌ Template literals (in critical paths)
// ❌ Destructuring
// ❌ Classes (prefer constructor functions)
// ❌ Spread operator
// ❌ Promise.allSettled, Promise.any

// SOLUTION 1: Transpile with Babel
// Target: Chrome 53 (webOS 4.0)

// SOLUTION 2: Feature detection
function supportsAsync() {
  try {
    eval('(async () => {})');
    return true;
  } catch (e) {
    return false;
  }
}

if (supportsAsync()) {
  // Use modern code
} else {
  // Use ES5 fallback
}
```

#### Fetch API Issues
```javascript
// webOS 3.x and earlier: NO fetch API
// webOS 4.x: fetch exists but buggy
// webOS 5.x+: fetch works well

// SOLUTION: Use fetch polyfill or XMLHttpRequest fallback
function universalFetch(url, options = {}) {
  if (typeof fetch !== 'undefined') {
    return fetch(url, options);
  }
  
  // Fallback to XMLHttpRequest
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || 'GET', url);
    
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }
    
    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: () => Promise.resolve(JSON.parse(xhr.responseText)),
        text: () => Promise.resolve(xhr.responseText)
      });
    };
    
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(options.body);
  });
}
```

---

## Development Environment Setup

### Required Tools

```bash
# 1. Node.js (LTS version recommended)
# Download from: https://nodejs.org/
node --version  # Should be 16.x or higher

# 2. webOS TV CLI Tools
npm install -g @webos-tools/cli

# Verify installation
ares --version
ares-package --version
ares-install --version
ares-launch --version

# 3. (Optional) webOS TV SDK
# Download from: http://webostv.developer.lge.com/sdk/download/
# Includes IDE, emulator, and additional tools
```

### CLI Commands Reference

```bash
# Device Management
ares-setup-device              # Add/configure TV
ares-setup-device --search     # Search for TVs on network
ares-device-info -d <device>   # Get device info
ares-novacom --device <device> --getkey  # Set up SSH key

# Development
ares-package <src-dir>                    # Package app
ares-package --no-minify <src-dir>        # Package without minification
ares-install -d <device> <ipk-file>       # Install on TV
ares-launch -d <device> <app-id>          # Launch app
ares-inspect -d <device> <app-id> --open  # Launch with DevTools

# Debugging
ares-server                    # Start local web server
ares-shell -d <device>         # SSH into TV
ares-log -d <device>           # View TV logs
```

### Project Structure Template

```
floatplane-webos/
├── src/                          # Source files
│   ├── index.html               # Entry point
│   ├── appinfo.json             # App metadata (REQUIRED)
│   ├── css/
│   │   ├── reset.css            # CSS reset for TV
│   │   ├── main.css
│   │   └── components/
│   ├── js/
│   │   ├── app.js               # Main app logic
│   │   ├── polyfills.js         # ES5 compatibility
│   │   ├── api/
│   │   ├── ui/
│   │   └── utils/
│   ├── lib/                     # Third-party libraries
│   │   ├── webostv.js           # webOS TV library
│   │   ├── shaka-player.js
│   │   └── socket.io.js
│   └── images/
│       ├── icon_80px.png        # App icon (REQUIRED)
│       ├── icon_130px.png       # Large icon
│       └── splash.png           # Launch screen
├── dist/                        # Build output
├── .eslintrc.js                 # Linting config
├── babel.config.js              # Transpilation config
├── package.json
└── README.md
```

### appinfo.json Configuration

```json
{
  "id": "com.floatplane.webos",
  "version": "1.0.0",
  "vendor": "Your Name",
  "type": "web",
  "main": "index.html",
  "title": "Floatplane",
  "icon": "images/icon_80px.png",
  "largeIcon": "images/icon_130px.png",
  
  "resolution": "1920x1080",
  
  "requiredPermissions": [
    "network",
    "websocket"
  ],
  
  "bgImage": "images/splash.png",
  "bgColor": "#000000",
  
  "disallowScrollingInMainWindow": true,
  
  "uiRevision": 2
}
```

**CRITICAL appinfo.json Fields:**
- `id`: Must be unique, reverse domain format (com.company.appname)
- `version`: Semantic versioning (major.minor.patch)
- `type`: Always "web" for web apps
- `main`: Entry HTML file
- `icon`: 80x80px PNG (REQUIRED)
- `resolution`: "1920x1080" or "1280x720"
- `disallowScrollingInMainWindow`: Set to true (prevents unwanted scrolling)

---

## Core webOS APIs

### webOSTV.js Library

```javascript
// Load webOSTV.js in HTML
<script src="lib/webostv.js"></script>

// Or use CDN
<script src="https://webostv.developer.lge.com/download_sdk/SDK_WEBOS_TV/5.0.0/web-os-tv/webOS.js"></script>

// Check if running on webOS
if (window.webOS) {
  console.log('Running on webOS TV');
}
```

#### Platform Detection
```javascript
// Detect webOS version
const webOSVersion = window.webOS && window.webOS.platform && 
                     window.webOS.platform.tv ? 
                     window.webOS.platformInfo.webOSVersion : null;

console.log('webOS Version:', webOSVersion); // e.g., "6.0"

// Detect TV model
const modelName = window.webOS && window.webOS.deviceInfo ?
                  window.webOS.deviceInfo.modelName : null;

console.log('TV Model:', modelName); // e.g., "OLED55C1"
```

#### System Info API
```javascript
// Get system information
webOS.service.request('luna://com.webos.service.tv.systemproperty', {
  method: 'getSystemInfo',
  parameters: {
    keys: ['modelName', 'firmwareVersion', 'UHD', 'sdkVersion']
  },
  onSuccess: function(response) {
    console.log('System Info:', response);
  },
  onFailure: function(error) {
    console.error('Failed to get system info:', error);
  }
});
```

#### Network API
```javascript
// Check network connectivity
webOS.service.request('luna://com.webos.service.connectionmanager', {
  method: 'getStatus',
  parameters: {},
  onSuccess: function(response) {
    console.log('Network Status:', response);
    // response.isInternetConnectionAvailable
    // response.wifi.state (connected/disconnected)
  }
});
```

### Luna Service API

```javascript
// Luna Service is webOS's IPC mechanism
// Used to access system services

// Example: Get TV settings
webOS.service.request('luna://com.webos.service.tv.settings', {
  method: 'getSystemSettings',
  parameters: {
    category: 'picture',
    keys: ['brightness', 'contrast']
  },
  onSuccess: function(response) {
    console.log('Picture Settings:', response.settings);
  },
  onFailure: function(error) {
    console.error('Error:', error);
  }
});
```

**Common Luna Services:**
- `com.webos.service.tv.systemproperty` - System information
- `com.webos.service.connectionmanager` - Network status
- `com.webos.service.tv.settings` - TV settings
- `com.webos.service.applicationmanager` - App management

---

## Video Playback Architecture

### HTML5 Video Element

```javascript
// Basic setup
const video = document.createElement('video');
video.id = 'videoPlayer';
video.controls = false; // Use custom controls
video.autoplay = false;
video.preload = 'auto';

// CRITICAL: Set these attributes for webOS
video.setAttribute('type', 'video/mp4'); // Or appropriate type
video.style.width = '100%';
video.style.height = '100%';
video.style.objectFit = 'contain'; // Maintain aspect ratio

document.body.appendChild(video);
```

### Media Source Extensions (MSE)

```javascript
// Check MSE support
if ('MediaSource' in window) {
  console.log('MSE supported');
} else {
  console.error('MSE NOT supported - cannot use adaptive streaming');
}

// MSE is REQUIRED for:
// - HLS streaming (via libraries)
// - DASH streaming
// - Adaptive bitrate
```

### Shaka Player Integration (Recommended)

```javascript
// Shaka Player is the BEST choice for webOS
// Supports HLS, DASH, and handles MSE complexity

// Load Shaka Player
<script src="lib/shaka-player.compiled.js"></script>

// Initialize
async function initPlayer() {
  // Check browser support
  shaka.polyfill.installAll();
  
  if (!shaka.Player.isBrowserSupported()) {
    console.error('Browser not supported');
    return;
  }
  
  const video = document.getElementById('videoPlayer');
  const player = new shaka.Player(video);
  
  // Configure for webOS
  player.configure({
    streaming: {
      bufferingGoal: 30,        // Seconds of content to buffer
      rebufferingGoal: 5,       // When to start rebuffering
      bufferBehind: 30,         // Amount of buffer to keep behind
      retryParameters: {
        timeout: 30000,         // 30 seconds timeout
        maxAttempts: 3,
        baseDelay: 1000,
        backoffFactor: 2
      }
    },
    manifest: {
      retryParameters: {
        timeout: 30000,
        maxAttempts: 3
      }
    },
    drm: {
      servers: {
        // Add DRM servers if needed
      }
    }
  });
  
  // Error handling
  player.addEventListener('error', (event) => {
    console.error('Shaka Player Error:', event.detail);
  });
  
  // Load manifest
  try {
    await player.load('https://example.com/manifest.m3u8');
    console.log('Video loaded successfully');
  } catch (error) {
    console.error('Failed to load video:', error);
  }
}
```

### webOS Video API (Native)

```javascript
// webOS provides native video API for better integration
// This is OPTIONAL but recommended for advanced features

if (window.webOS && window.webOS.mediaAPI) {
  // Use webOS native media API
  const mediaAPI = window.webOS.mediaAPI;
  
  mediaAPI.init({
    videoElement: document.getElementById('videoPlayer'),
    onSuccess: function() {
      console.log('Media API initialized');
    },
    onFailure: function(error) {
      console.error('Media API initialization failed:', error);
    }
  });
}
```

### DRM Support

```javascript
// webOS supports Widevine DRM (most common)

// Check DRM support
async function checkDRMSupport() {
  const config = [{
    initDataTypes: ['cenc'],
    audioCapabilities: [{
      contentType: 'audio/mp4; codecs="mp4a.40.2"'
    }],
    videoCapabilities: [{
      contentType: 'video/mp4; codecs="avc1.42E01E"',
      robustness: 'SW_SECURE_CRYPTO'
    }]
  }];
  
  try {
    const keySystemAccess = await navigator.requestMediaKeySystemAccess(
      'com.widevine.alpha', 
      config
    );
    console.log('Widevine supported');
    return true;
  } catch (e) {
    console.error('Widevine NOT supported');
    return false;
  }
}
```

---

## Input & Navigation System

### Remote Control Keycodes

```javascript
// webOS TV Remote Control Key Codes

const KeyCodes = {
  // D-Pad Navigation
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  OK: 13,           // Center button / Enter
  
  // Basic Controls
  BACK: 461,        // Back button (webOS specific)
  BACK_ALT: 8,      // Backspace (alternative)
  EXIT: 1001,       // Exit button (rarely used)
  
  // Media Controls
  PLAY: 415,
  PAUSE: 19,
  STOP: 413,
  REWIND: 412,
  FAST_FORWARD: 417,
  
  // Numeric Keys
  NUM_0: 48, NUM_1: 49, NUM_2: 50, NUM_3: 51, NUM_4: 52,
  NUM_5: 53, NUM_6: 54, NUM_7: 55, NUM_8: 56, NUM_9: 57,
  
  // Color Buttons
  RED: 403,
  GREEN: 404,
  YELLOW: 405,
  BLUE: 406,
  
  // Volume (may not work in apps)
  VOLUME_UP: 447,
  VOLUME_DOWN: 448,
  MUTE: 449,
  
  // Channel (may not work in apps)
  CHANNEL_UP: 427,
  CHANNEL_DOWN: 428,
  
  // Additional
  INFO: 457,
  HOME: 1000,       // Home button
  MENU: 458
};

// Listen for key events
document.addEventListener('keydown', (event) => {
  const keyCode = event.keyCode;
  
  switch(keyCode) {
    case KeyCodes.UP:
      navigateUp();
      break;
    case KeyCodes.DOWN:
      navigateDown();
      break;
    case KeyCodes.LEFT:
      navigateLeft();
      break;
    case KeyCodes.RIGHT:
      navigateRight();
      break;
    case KeyCodes.OK:
      activateCurrentElement();
      break;
    case KeyCodes.BACK:
      goBack();
      break;
    // ... handle other keys
  }
  
  event.preventDefault();
  event.stopPropagation();
});
```

### Magic Remote (Pointer Mode)

```javascript
// Magic Remote has two modes:
// 1. Pointer mode - Acts like a mouse cursor
// 2. D-pad mode - Standard navigation

// Detect pointer mode
let pointerMode = false;

document.addEventListener('mousemove', () => {
  pointerMode = true;
  showPointerCursor();
});

document.addEventListener('keydown', () => {
  pointerMode = false;
  hidePointerCursor();
});

// Handle click events (pointer mode)
element.addEventListener('click', (e) => {
  if (pointerMode) {
    // Pointer clicked
  } else {
    // OK button pressed
  }
});

// IMPORTANT: All interactive elements must support BOTH:
// 1. Mouse events (for pointer)
// 2. Keyboard events (for D-pad)
```

### Spatial Navigation

```javascript
// Spatial navigation determines which element receives focus
// based on physical position on screen

// Enable spatial navigation
navigator.spatialNavigationEnabled = true;

// Manual spatial navigation implementation
class SpatialNavigator {
  constructor() {
    this.focusableElements = [];
    this.currentFocusIndex = 0;
  }
  
  registerFocusable(element) {
    element.setAttribute('tabindex', '0');
    this.focusableElements.push(element);
  }
  
  findNearest(direction) {
    const current = this.focusableElements[this.currentFocusIndex];
    const currentRect = current.getBoundingClientRect();
    
    let bestElement = null;
    let bestScore = Infinity;
    
    this.focusableElements.forEach((element, index) => {
      if (index === this.currentFocusIndex) return;
      
      const rect = element.getBoundingClientRect();
      const score = this.calculateScore(currentRect, rect, direction);
      
      if (score < bestScore) {
        bestScore = score;
        bestElement = { element, index };
      }
    });
    
    return bestElement;
  }
  
  calculateScore(fromRect, toRect, direction) {
    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;
    
    switch(direction) {
      case 'up':
        if (dy >= 0) return Infinity; // Wrong direction
        return Math.abs(dx) + Math.abs(dy) * 2;
      
      case 'down':
        if (dy <= 0) return Infinity;
        return Math.abs(dx) + Math.abs(dy) * 2;
      
      case 'left':
        if (dx >= 0) return Infinity;
        return Math.abs(dx) * 2 + Math.abs(dy);
      
      case 'right':
        if (dx <= 0) return Infinity;
        return Math.abs(dx) * 2 + Math.abs(dy);
      
      default:
        return Infinity;
    }
  }
  
  navigate(direction) {
    const nearest = this.findNearest(direction);
    if (nearest) {
      this.currentFocusIndex = nearest.index;
      nearest.element.focus();
    }
  }
}
```

### Focus Management Best Practices

```javascript
// ALWAYS provide clear focus indicators
.focusable:focus {
  outline: 3px solid #4a9eff;
  outline-offset: 2px;
  transform: scale(1.05);
  transition: all 0.2s;
}

// Mark elements as focusable
<button class="focusable" tabindex="0">Click Me</button>

// Focus trap for modals
function trapFocus(container) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  container.addEventListener('keydown', (e) => {
    if (e.keyCode === 9) { // Tab key
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  });
}
```

---

## Performance Optimization

### Frame Rate Optimization

```javascript
// Target: 60 FPS (16.67ms per frame)
// webOS TVs struggle with complex animations

// Use requestAnimationFrame for animations
function smoothAnimation() {
  let position = 0;
  
  function animate() {
    position += 1;
    element.style.transform = `translateX(${position}px)`;
    
    if (position < targetPosition) {
      requestAnimationFrame(animate);
    }
  }
  
  requestAnimationFrame(animate);
}

// Monitor performance
const perfMonitor = {
  frameCount: 0,
  lastTime: performance.now(),
  
  checkFPS() {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= this.lastTime + 1000) {
      const fps = Math.round(
        (this.frameCount * 1000) / (currentTime - this.lastTime)
      );
      console.log('FPS:', fps);
      
      if (fps < 30) {
        console.warn('Performance degraded!');
        this.reduceQuality();
      }
      
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
    
    requestAnimationFrame(() => this.checkFPS());
  },
  
  reduceQuality() {
    // Reduce animations, effects, etc.
  }
};
```

### DOM Optimization

```javascript
// MINIMIZE DOM SIZE

// BAD - Creates too many elements:
function renderList(items) {
  items.forEach(item => {
    const div = document.createElement('div');
    div.textContent = item;
    container.appendChild(div);
  });
}

// GOOD - Uses document fragment:
function renderList(items) {
  const fragment = document.createDocumentFragment();
  
  items.forEach(item => {
    const div = document.createElement('div');
    div.textContent = item;
    fragment.appendChild(div);
  });
  
  container.appendChild(fragment);
}

// BETTER - Virtual scrolling for long lists:
class VirtualScroller {
  constructor(container, itemHeight, totalItems) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.totalItems = totalItems;
    this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
    this.scrollTop = 0;
    
    this.render();
  }
  
  render() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + this.visibleItems,
      this.totalItems
    );
    
    // Only render visible items
    this.container.innerHTML = '';
    
    for (let i = startIndex; i < endIndex; i++) {
      const item = this.createItem(i);
      item.style.position = 'absolute';
      item.style.top = `${i * this.itemHeight}px`;
      this.container.appendChild(item);
    }
  }
}
```

### Image Optimization

```javascript
// ALWAYS optimize images for TV

// Use appropriate sizes
// TV resolution: 1920x1080
// Thumbnail size: 320x180 (16:9 ratio)
// Poster size: 640x360 or 800x450

// Lazy loading
class LazyImageLoader {
  constructor() {
    this.images = [];
    this.observer = new IntersectionObserver(
      (entries) => this.onIntersection(entries),
      { rootMargin: '100px' }
    );
  }
  
  observe(img) {
    this.images.push(img);
    this.observer.observe(img);
  }
  
  onIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          this.observer.unobserve(img);
        }
      }
    });
  }
}

// Usage:
// <img data-src="actual-image.jpg" src="placeholder.jpg" />
```

---

## Memory Management

### Memory Monitoring

```javascript
// Monitor memory usage
class MemoryMonitor {
  constructor() {
    this.checkInterval = 30000; // Check every 30 seconds
    this.startMonitoring();
  }
  
  startMonitoring() {
    setInterval(() => {
      if (performance.memory) {
        const used = performance.memory.usedJSHeapSize;
        const total = performance.memory.totalJSHeapSize;
        const limit = performance.memory.jsHeapSizeLimit;
        
        const usagePercent = (used / limit) * 100;
        
        console.log(`Memory: ${Math.round(usagePercent)}%`);
        
        if (usagePercent > 80) {
          console.warn('High memory usage!');
          this.triggerCleanup();
        }
      }
    }, this.checkInterval);
  }
  
  triggerCleanup() {
    // Clear caches
    this.clearImageCache();
    this.clearDataCache();
    
    // Force garbage collection (if available)
    if (window.gc) {
      window.gc();
    }
  }
  
  clearImageCache() {
    // Remove unused images from DOM
    const images = document.querySelectorAll('img[data-cached]');
    images.forEach(img => {
      if (!this.isVisible(img)) {
        img.src = ''; // Clear image data
      }
    });
  }
  
  clearDataCache() {
    // Clear old localStorage entries
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    Object.keys(localStorage).forEach(key => {
      const timestampKey = `${key}_timestamp`;
      const timestamp = localStorage.getItem(timestampKey);
      
      if (timestamp && (now - parseInt(timestamp)) > maxAge) {
        localStorage.removeItem(key);
        localStorage.removeItem(timestampKey);
      }
    });
  }
}
```

### Prevent Memory Leaks

```javascript
// Common memory leak patterns and solutions

// LEAK: Event listeners not removed
class ComponentWithLeak {
  constructor() {
    window.addEventListener('resize', this.onResize);
  }
  
  onResize() {
    // ...
  }
  
  destroy() {
    // BUG: Event listener not removed!
  }
}

// FIX: Always clean up
class ComponentFixed {
  constructor() {
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
  }
  
  onResize() {
    // ...
  }
  
  destroy() {
    window.removeEventListener('resize', this.onResize);
  }
}

// LEAK: Timers not cleared
class TimerLeak {
  start() {
    this.interval = setInterval(() => {
      this.doSomething();
    }, 1000);
  }
  
  destroy() {
    // BUG: Timer not cleared!
  }
}

// FIX: Clear all timers
class TimerFixed {
  start() {
    this.interval = setInterval(() => {
      this.doSomething();
    }, 1000);
  }
  
  destroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// LEAK: Circular references
class CircularLeak {
  constructor() {
    this.element = document.createElement('div');
    this.element.component = this; // Circular reference!
  }
}

// FIX: Use WeakMap
const componentMap = new WeakMap();

class CircularFixed {
  constructor() {
    this.element = document.createElement('div');
    componentMap.set(this.element, this);
  }
  
  destroy() {
    componentMap.delete(this.element);
    this.element = null;
  }
}
```

---

## Testing & Debugging

### Remote Debugging

```bash
# Enable Developer Mode on TV:
# 1. Install "Developer Mode" app from LG Content Store
# 2. Launch Developer Mode app
# 3. Toggle "Dev Mode Status" to ON
# 4. Toggle "Key Server" to ON
# 5. Note the passphrase displayed

# Connect from computer:
ares-setup-device

# Enter TV information:
# name: tv
# host: <TV IP address>
# port: 9922
# username: prisoner

# Set up SSH key:
ares-novacom --device tv --getkey
# Enter the passphrase from TV screen

# Install and inspect app:
ares-install -d tv myapp.ipk
ares-inspect -d tv com.myapp.id --open

# This opens Chrome DevTools connected to your app!
```

### Console Logging

```javascript
// webOS TV console is accessible via Chrome DevTools

// Create a logger with levels
class Logger {
  static level = 'debug'; // 'debug', 'info', 'warn', 'error'
  
  static levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  
  static log(level, message, data) {
    if (this.levels[level] >= this.levels[this.level]) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      
      if (data) {
        console[level](prefix, message, data);
      } else {
        console[level](prefix, message);
      }
    }
  }
  
  static debug(message, data) {
    this.log('debug', message, data);
  }
  
  static info(message, data) {
    this.log('info', message, data);
  }
  
  static warn(message, data) {
    this.log('warn', message, data);
  }
  
  static error(message, data) {
    this.log('error', message, data);
  }
}

// Usage:
Logger.debug('App initialized');
Logger.info('User logged in', { userId: 123 });
Logger.warn('Network slow', { latency: 5000 });
Logger.error('Failed to load video', error);
```

### On-Screen Debug Display

```javascript
// Show debug info on TV screen (useful when DevTools not available)

class OnScreenDebug {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'debug-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 10px;
      font-family: monospace;
      font-size: 14px;
      z-index: 99999;
      max-width: 400px;
      max-height: 300px;
      overflow-y: auto;
    `;
    document.body.appendChild(this.container);
  }
  
  log(message) {
    const line = document.createElement('div');
    line.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    this.container.appendChild(line);
    
    // Keep only last 20 lines
    const lines = this.container.children;
    if (lines.length > 20) {
      this.container.removeChild(lines[0]);
    }
    
    // Auto-scroll to bottom
    this.container.scrollTop = this.container.scrollHeight;
  }
  
  clear() {
    this.container.innerHTML = '';
  }
  
  hide() {
    this.container.style.display = 'none';
  }
  
  show() {
    this.container.style.display = 'block';
  }
}

// Usage:
const debug = new OnScreenDebug();
debug.log('App started');
debug.log('Memory: ' + performance.memory.usedJSHeapSize);

// Toggle with remote control
document.addEventListener('keydown', (e) => {
  if (e.keyCode === 457) { // Info button
    debug.show();
  }
});
```

### Error Tracking

```javascript
// Global error handler
window.addEventListener('error', (event) => {
  const error = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error ? event.error.stack : null,
    timestamp: new Date().toISOString()
  };
  
  Logger.error('Uncaught error', error);
  
  // Send to analytics service (if available)
  sendErrorReport(error);
});

// Promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  Logger.error('Unhandled promise rejection', {
    reason: event.reason,
    timestamp: new Date().toISOString()
  });
});
```

---

## Common Pitfalls & Solutions

### 1. App Crashes After Few Minutes

**Symptom:** App runs fine initially, then freezes or crashes

**Cause:** Memory leak or excessive memory usage

**Solution:**
```javascript
// Implement memory monitoring and cleanup
setInterval(() => {
  // Clear unused data
  clearOldCacheData();
  
  // Remove unused DOM elements
  removeHiddenElements();
  
  // Force garbage collection (if available)
  if (window.gc) window.gc();
}, 60000); // Every minute
```

### 2. Video Won't Play

**Symptoms:** Black screen, error events, or video stuck loading

**Possible Causes & Solutions:**
```javascript
// 1. Codec not supported
video.addEventListener('error', (e) => {
  const error = e.target.error;
  console.error('Video error code:', error.code);
  
  switch(error.code) {
    case MediaError.MEDIA_ERR_DECODE:
      // Codec not supported - try different quality
      loadAlternativeStream();
      break;
    
    case MediaError.MEDIA_ERR_NETWORK:
      // Network error - retry
      retryVideoLoad();
      break;
    
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      // Format not supported
      showUnsupportedMessage();
      break;
  }
});

// 2. CORS issues
// Make sure video server sends proper CORS headers
// Access-Control-Allow-Origin: *

// 3. DRM issues
// Ensure Widevine is properly configured

// 4. Memory exhausted
// Reduce buffer size in player config
```

### 3. Navigation Doesn't Work

**Symptom:** Can't navigate between elements with D-pad

**Solution:**
```javascript
// Ensure ALL interactive elements are focusable
const focusableElements = document.querySelectorAll(
  'button, a, input, [tabindex]'
);

focusableElements.forEach(el => {
  // Set tabindex if not set
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '0');
  }
  
  // Ensure focus visible
  el.addEventListener('focus', () => {
    el.classList.add('focused');
  });
  
  el.addEventListener('blur', () => {
    el.classList.remove('focused');
  });
});

// Provide focus styles
.focused {
  outline: 3px solid #4a9eff;
  transform: scale(1.05);
}
```

### 4. App Rejected by LG QA

**Common rejection reasons:**

1. **Back button doesn't work on home screen**
```javascript
// MUST exit app when back pressed on home screen
if (isHomeScreen() && keyCode === 461) {
  window.close(); // Exit app
}
```

2. **No focus indicators**
```css
/* MUST have visible focus states */
:focus {
  outline: 2px solid blue;
}
```

3. **Text too small**
```css
/* Minimum font size: 24px for body text */
body {
  font-size: 28px;
}
```

4. **Not responsive to all navigation keys**
```javascript
// MUST handle Up, Down, Left, Right, OK, Back
```

### 5. Slow Performance

**Symptoms:** Laggy animations, slow response to input

**Solutions:**
```javascript
// 1. Reduce DOM complexity
// Keep total elements under 500

// 2. Use CSS transforms instead of position
// BAD:
element.style.left = x + 'px';

// GOOD:
element.style.transform = `translateX(${x}px)`;

// 3. Enable hardware acceleration
element.style.willChange = 'transform';
element.style.transform = 'translateZ(0)';

// 4. Debounce expensive operations
const debouncedSearch = debounce(search, 300);

// 5. Use requestAnimationFrame
requestAnimationFrame(() => {
  // Perform visual updates here
});
```

---

## Essential Resources

### Official Documentation

1. **LG webOS TV Developer Portal**
   - URL: http://webostv.developer.lge.com/
   - SDK downloads, documentation, tutorials
   - MUST READ: Developer Guide

2. **webOS TV API Documentation**
   - URL: http://webostv.developer.lge.com/api/
   - Complete API reference
   - Luna Service API documentation

3. **webOS TV Sample Apps**
   - URL: https://github.com/webOS-TV-app-samples
   - Official sample applications
   - **Recommended:** MediaPlayback sample

4. **LG Developer Forums**
   - URL: http://webostv.developer.lge.com/community/
   - Ask questions, get help

### Third-Party Resources

5. **webOS Homebrew Project**
   - URL: https://www.webosbrew.org/
   - Community homebrew apps
   - Dev Manager Desktop tool

6. **webOS Brew GitHub**
   - URL: https://github.com/webosbrew
   - Open source tools and apps
   - Root/jailbreak information (if needed)

7. **Awesome Smart TV**
   - URL: https://github.com/vitalets/awesome-smart-tv
   - Curated list of Smart TV resources
   - Frameworks, tools, tutorials

### Video Playback Libraries

8. **Shaka Player**
   - URL: https://github.com/shaka-project/shaka-player
   - **RECOMMENDED** for HLS/DASH
   - Excellent webOS support

9. **HLS.js**
   - URL: https://github.com/video-dev/hls.js
   - Alternative HLS player
   - Good compatibility

10. **Video.js**
    - URL: https://videojs.com/
    - Full-featured player framework
    - Plugin ecosystem

### Development Tools

11. **webOS CLI**
    - URL: https://www.npmjs.com/package/@webos-tools/cli
    - Command-line development tools

12. **webOS Dev Manager Desktop**
    - URL: https://github.com/webosbrew/dev-manager-desktop
    - GUI tool for installing apps
    - Easier than CLI for beginners

### Testing Resources

13. **BrowserStack** (for browser testing)
    - URL: https://www.browserstack.com/
    - Test on various browsers
    - Simulate old webOS versions

14. **Can I Use**
    - URL: https://caniuse.com/
    - Check feature compatibility
    - Critical for targeting old webOS

### Community

15. **Reddit: r/webOS**
    - General webOS discussion
    - User experiences

16. **Stack Overflow**
    - Tag: `[webos]`
    - Technical Q&A

---

## Platform Version Compatibility

### Feature Support Matrix

| Feature | webOS 3.0 | webOS 4.0 | webOS 5.0 | webOS 6.0+ |
|---------|-----------|-----------|-----------|------------|
| Fetch API | ❌ | ⚠️ Buggy | ✅ | ✅ |
| async/await | ❌ | ❌ | ✅ | ✅ |
| Arrow functions | ⚠️ | ✅ | ✅ | ✅ |
| Promises | ✅ | ✅ | ✅ | ✅ |
| ES6 Classes | ⚠️ | ✅ | ✅ | ✅ |
| Template literals | ⚠️ | ✅ | ✅ | ✅ |
| Destructuring | ❌ | ⚠️ | ✅ | ✅ |
| Spread operator | ❌ | ⚠️ | ✅ | ✅ |
| Flexbox | ⚠️ Buggy | ✅ | ✅ | ✅ |
| Grid Layout | ❌ | ❌ | ⚠️ | ✅ |
| CSS Variables | ❌ | ⚠️ | ✅ | ✅ |
| WebSocket | ✅ | ✅ | ✅ | ✅ |
| WebRTC | ❌ | ❌ | ⚠️ | ✅ |
| MSE | ✅ | ✅ | ✅ | ✅ |
| EME (DRM) | ✅ | ✅ | ✅ | ✅ |

Legend:
- ✅ Fully supported
- ⚠️ Partial support / buggy
- ❌ Not supported

### Recommended Target

**For maximum compatibility:**
- Target: **webOS 4.0** (2018 TVs)
- Chromium: **53**
- Use Babel transpilation
- Include polyfills

**For modern features:**
- Target: **webOS 5.0+** (2020 TVs)
- Chromium: **79+**
- Native ES6+ support
- Better performance

### Polyfills Required

```javascript
// For webOS 4.0 and earlier, include these polyfills:

// 1. Fetch polyfill
<script src="https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.js"></script>

// 2. Promise polyfill (if targeting webOS 2.x)
<script src="https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js"></script>

// 3. Object.assign polyfill
if (typeof Object.assign !== 'function') {
  Object.assign = function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
}

// 4. Array.from polyfill
if (!Array.from) {
  Array.from = function(arrayLike) {
    return Array.prototype.slice.call(arrayLike);
  };
}
```

---

## Conclusion for Coding Agents

### Critical Success Factors

1. **Target webOS 4.0+ for compatibility**
2. **Use Shaka Player for video**
3. **Implement proper focus management**
4. **Monitor and manage memory**
5. **Test on real hardware early**
6. **Handle Back button correctly**
7. **Provide clear focus indicators**
8. **Use hardware-accelerated CSS**
9. **Implement proper error handling**
10. **Follow LG's QA guidelines**

### Development Checklist

Before considering app complete:
- [ ] Tested on real webOS TV (not just emulator)
- [ ] Back button exits app on home screen
- [ ] All elements have focus indicators
- [ ] Video playback works (VOD and livestream)
- [ ] Memory usage stays under 300MB
- [ ] App doesn't crash after 30 minutes
- [ ] Navigation works with D-pad and pointer
- [ ] Text is readable from 10 feet
- [ ] App responds to all key inputs within 500ms
- [ ] Error states handled gracefully
- [ ] Loading states shown for async operations
- [ ] Chat works in livestreams (if applicable)

### Quick Reference Commands

```bash
# Setup
npm install -g @webos-tools/cli
ares-setup-device

# Build & Deploy
ares-package --no-minify src/
ares-install -d tv *.ipk
ares-launch -d tv com.floatplane.webos

# Debug
ares-inspect -d tv com.floatplane.webos --open
ares-log -d tv

# Info
ares-device-info -d tv
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Target Audience:** AI Coding Agents & Developers  
**Platform:** LG webOS TV 4.0+
