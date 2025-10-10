# LG webOS TV Development - Technical Reference Guide
## For Building Video Streaming Applications

---

## Table of Contents

1. [webOS Platform Overview](#webos-platform-overview)
2. [Critical Platform Differences](#critical-platform-differences)
3. [Development Environment Setup](#development-environment-setup)
4. [webOS-Specific APIs](#webos-specific-apis)
5. [Video Playback on webOS](#video-playback-on-webos)
6. [Performance Optimization](#performance-optimization)
7. [Testing Strategies](#testing-strategies)
8. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
9. [Essential Libraries & Tools](#essential-libraries--tools)
10. [Official Resources](#official-resources)

---

## webOS Platform Overview

### What is webOS?

webOS is LG's Linux-based smart TV operating system that uses web technologies (HTML5, CSS, JavaScript) for app development. Originally developed by Palm for mobile devices, acquired by HP, then LG in 2013.

**Key Facts:**
- **Browser Engine:** Chromium-based (version varies by webOS version)
- **Runtime:** V8 JavaScript engine
- **UI Framework:** Custom (not Android, not iOS)
- **Package Format:** IPK (similar to Debian packages)
- **App Language:** HTML5, CSS3, JavaScript (ES5/ES6 support varies)

### webOS Version History & Browser Support

| webOS Version | Year | TV Models | Chromium Version | RAM | Notable Changes |
|---------------|------|-----------|------------------|-----|-----------------|
| webOS 1.0 | 2014 | 2014 models | ~34 | 512MB | Initial release |
| webOS 2.0 | 2015 | 2015 models | ~38 | 512MB | Improved performance |
| webOS 3.0 | 2016 | 2016 models | ~38 | 1GB | Magic Remote 2.0 |
| webOS 3.5 | 2017 | 2017 models | ~53 | 1GB | Better app support |
| webOS 4.0 | 2018 | 2018 models | ~53 | 1GB | AI ThinQ integration |
| webOS 4.5 | 2019 | 2019 models | ~68 | 1.1GB | HomeKit support |
| webOS 5.0 | 2020 | 2020 models | ~79 | 1.1GB | Sports alert |
| webOS 6.0 | 2021 | 2021 models | ~87 | 1.3GB | UI redesign |
| webOS 22 | 2022 | 2022 models | ~94 | 1.5GB | New naming scheme |
| webOS 23 | 2023 | 2023 models | ~108 | 2GB | Performance boost |

**Recommended Target:** webOS 4.0+ (2018 and newer TVs)

### Key Limitation: Old Chromium Versions

⚠️ **CRITICAL:** Even the newest TVs run Chromium versions that are 1-2 years old. This means:

- **No modern JavaScript features** without transpilation
- **Limited CSS support** (no modern grid in old versions)
- **No ES modules** in older versions
- **Limited WebGL** support
- **No Service Workers** in older versions

**Always check browser compatibility:** https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine

---

## Critical Platform Differences

### 1. Input Model: Remote Control Only

**Unlike Desktop/Mobile:**
- No mouse (except Magic Remote pointer mode)
- No keyboard (virtual keyboard only)
- No touch screen
- Limited to D-pad navigation + special keys

**What This Means:**
```javascript
// ❌ DON'T: Assume mouse events
element.addEventListener('click', handler);
element.addEventListener('mouseover', handler);

// ✅ DO: Use generic pointer events
element.addEventListener('click', handler); // OK for remote
// But also support keyboard navigation
element.addEventListener('keydown', (e) => {
  if (e.keyCode === 13) handler(); // OK/Enter
});
```

**Required Navigation Support:**
- All interactive elements must be keyboard/D-pad accessible
- Clear focus indicators required
- Logical tab order essential
- Back button must work properly

### 2. Screen Resolution & Safe Zones

**Resolution:**
- **1920x1080** (Full HD) - Standard
- **3840x2160** (4K) - Newer models
- Always design for 1080p, scale up for 4K

**Safe Zones:**
```
┌─────────────────────────────────────────┐
│ Overscan Area (not always visible)     │
│  ┌───────────────────────────────────┐ │
│  │  Safe Zone (always visible)       │ │
│  │  Design for this area!            │ │
│  │                                   │ │
│  │  Keep important UI 5-10% inset   │ │
│  │  from edges                       │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**CSS Safe Zone:**
```css
.content-area {
  /* 5% inset from each edge */
  padding: 5vh 5vw;
}

/* Or use explicit pixel values */
.safe-content {
  margin: 54px 96px; /* 5% of 1080p */
}
```

### 3. 10-Foot UI Design

**Viewing Distance:** 8-10 feet from screen

**Minimum Sizes:**
- **Text:** 28px minimum (32-36px recommended)
- **Touch Targets:** 80x80px minimum (100x100px recommended)
- **Line Height:** 1.5x minimum
- **Contrast:** WCAG AAA level recommended

**Font Considerations:**
```css
/* Good for TV */
body {
  font-family: 'Roboto', 'Arial', sans-serif;
  font-size: 32px;
  line-height: 1.6;
  font-weight: 400; /* Regular weight more readable */
  letter-spacing: 0.02em; /* Slight spacing helps */
}

/* Avoid thin fonts */
h1 {
  font-weight: 700; /* Bold, not thin */
  font-size: 48px;
}
```

### 4. Memory Constraints

**RAM Limits:**
- webOS 4.0: ~1GB total
- webOS 6.0: ~1.3GB total
- **Your app gets ~200-300MB maximum**

**What This Means:**
- Aggressive image optimization required
- Limit DOM elements (max ~1000-2000)
- Clear intervals/timeouts
- Remove event listeners
- Implement virtual scrolling for long lists
- Lazy load images

**Memory Management:**
```javascript
// ❌ DON'T: Keep all images in memory
const allThumbnails = videos.map(v => {
  const img = new Image();
  img.src = v.thumbnail;
  return img;
});

// ✅ DO: Load on demand
const visibleThumbnails = getVisibleVideos().map(v => {
  const img = new Image();
  img.src = v.thumbnail;
  return img;
});

// ✅ DO: Clean up
function cleanup() {
  // Remove event listeners
  element.removeEventListener('click', handler);
  
  // Clear timers
  clearInterval(pollInterval);
  clearTimeout(hideTimeout);
  
  // Remove DOM nodes
  container.innerHTML = '';
  
  // Null large objects
  largeDataArray = null;
}
```

### 5. No localStorage Limits (But Use Wisely)

**Unlike browsers:**
- No 5-10MB localStorage limit
- Can store more data
- But still should be conservative

**Best Practices:**
```javascript
// ✅ DO: Store essential data
localStorage.setItem('session', sessionToken);
localStorage.setItem('settings', JSON.stringify(settings));

// ❌ DON'T: Store massive datasets
// Don't cache entire video catalog
localStorage.setItem('videos', JSON.stringify(1000Videos)); // Bad

// ✅ DO: Store IDs/references
localStorage.setItem('recent', JSON.stringify(recentVideoIds));
```

### 6. Network Conditions

**Typical TV Network:**
- Often WiFi (not ethernet)
- Can be slower than desktop/mobile
- May have interruptions
- Shared bandwidth with other devices

**Implications:**
- Implement retry logic
- Show loading states
- Support resume playback
- Cache critical data
- Implement offline detection

```javascript
// Network status monitoring
window.addEventListener('online', () => {
  console.log('Network restored');
  retryFailedRequests();
});

window.addEventListener('offline', () => {
  console.log('Network lost');
  showOfflineMessage();
});
```

---

## Development Environment Setup

### Option 1: Using webOS CLI (Recommended)

**Installation:**
```bash
# Install Node.js 16+ first

# Install webOS CLI globally
npm install -g @webos-tools/cli

# Verify installation
ares --version
```

**Key Commands:**
```bash
# Package app
ares-package src/ --outdir ./dist

# Set up TV connection
ares-setup-device

# Install app on TV
ares-install --device tv myapp.ipk

# Launch app
ares-launch --device tv com.myapp.id

# Debug with inspector
ares-inspect --device tv com.myapp.id --open

# View logs
ares-shell --device tv --run "cat /var/log/messages | grep myapp"
```

### Option 2: Using webOS Studio (IDE)

**Download:** https://webostv.developer.lge.com/develop/tools/webos-studio

**Features:**
- Visual IDE (VS Code based)
- Device manager
- Emulator integration
- Debug tools
- Template projects

**When to Use:**
- Beginners
- Need visual tools
- Want templates

**When to Avoid:**
- CI/CD pipelines
- Prefer command line
- Custom build process

### Option 3: Docker Development (Most Flexible)

**Dockerfile Example:**
```dockerfile
FROM node:16-alpine

# Install webOS CLI
RUN npm install -g @webos-tools/cli

# Install development dependencies
RUN apk add --no-cache \
    bash \
    git \
    openssh

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy application
COPY . .

CMD ["sh"]
```

**Usage:**
```bash
# Build image
docker build -t floatplane-webos-dev .

# Run container with app mounted
docker run -it --rm \
  --network host \
  -v $(pwd):/app \
  floatplane-webos-dev

# Inside container, build and deploy
ares-package src/ --outdir ./dist
ares-install --device tv dist/*.ipk
```

### Setting Up Physical TV for Development

**Step 1: Install Developer Mode App**
1. Open LG Content Store
2. Search for "Developer Mode"
3. Install and launch

**Step 2: Enable Dev Mode**
1. Toggle "Dev Mode Status" to ON
2. Toggle "Key Server" to ON
3. Note the TV's IP address
4. Note the passphrase displayed

**Step 3: Configure Connection**
```bash
# Add TV as device
ares-setup-device

# Enter when prompted:
# - Device name: tv
# - IP address: [Your TV IP]
# - Port: 9922
# - Username: prisoner
# - Description: My LG TV

# Get SSH key from TV
ares-novacom --device tv --getkey

# Test connection
ares-device-info -d tv
```

**Important Notes:**
- Developer Mode times out after 2-4 hours (varies by model)
- Must re-enable Dev Mode Status periodically
- Key Server must be running for deployment
- TV must be on same network as development machine

---

## webOS-Specific APIs

### webOSTV.js Library

**Core library for TV features** - Must include in your app:

```html
<script src="webOSTV.js"></script>
```

**Or install via npm:**
```bash
npm install webostv
```

### Key APIs:

#### 1. System Information

```javascript
// Get webOS version
webOS.platform.tv === true; // Check if running on TV

// Get device info
const systemInfo = webOS.systemInfo;
console.log('webOS Version:', systemInfo.webOSVersion);
console.log('SDK Version:', systemInfo.sdkVersion);
console.log('Screen Resolution:', systemInfo.screenWidth, systemInfo.screenHeight);
```

#### 2. TV-Specific Features

```javascript
// Get TV model information
webOS.service.request('luna://com.webos.service.tv.systemproperty', {
  method: 'getSystemInfo',
  parameters: {
    keys: ['modelName', 'firmwareVersion', 'sdkVersion']
  },
  onSuccess: function(result) {
    console.log('Model:', result.modelName);
    console.log('Firmware:', result.firmwareVersion);
  },
  onFailure: function(error) {
    console.error('Failed to get system info:', error);
  }
});
```

#### 3. Network Status

```javascript
// Check network connection
webOS.service.request('luna://com.webos.service.connectionmanager', {
  method: 'getStatus',
  onSuccess: function(result) {
    console.log('WiFi:', result.wifi);
    console.log('Wired:', result.wired);
    console.log('IsInternetConnectionAvailable:', result.isInternetConnectionAvailable);
  }
});
```

#### 4. Application Lifecycle

```javascript
// App activated (resumed)
document.addEventListener('webOSLaunch', function(event) {
  console.log('App launched/resumed:', event.detail);
});

// App going to background
document.addEventListener('webOSRelaunch', function(event) {
  console.log('App reactivated');
});

// Handle back button
document.addEventListener('keydown', function(e) {
  if (e.keyCode === 461) { // webOS back button
    e.preventDefault();
    // Handle back navigation
    if (isHomePage()) {
      window.close(); // Exit app
    } else {
      goToPreviousPage();
    }
  }
});
```

### Luna Service Bus

**Access system services** for advanced features:

```javascript
// Example: Get current time from system
webOS.service.request('luna://com.webos.service.systemservice', {
  method: 'time/getSystemTime',
  parameters: {},
  onSuccess: function(result) {
    console.log('System time:', result.utc);
  },
  onFailure: function(error) {
    console.error('Error getting time:', error);
  }
});
```

**Common Luna Services:**
- `com.webos.service.tv.systemproperty` - TV properties
- `com.webos.service.connectionmanager` - Network status
- `com.webos.service.applicationmanager` - App management
- `com.webos.media` - Media playback
- `com.webos.service.pdm` - Device management

**⚠️ Warning:** Most Luna services require elevated permissions not available to third-party apps.

### Virtual Keyboard

```javascript
// Show keyboard
webOS.keyboard.show();

// Hide keyboard
webOS.keyboard.hide();

// Keyboard events
document.addEventListener('webOSKeyboard', function(event) {
  if (event.detail.visibility === 'shown') {
    console.log('Keyboard visible');
  } else {
    console.log('Keyboard hidden');
  }
});
```

---

## Video Playback on webOS

### Supported Formats

**Container Formats:**
- ✅ MP4 (Recommended)
- ✅ HLS (.m3u8) - **Primary for streaming**
- ✅ DASH (.mpd) - Limited support
- ❌ WebM - Not consistently supported

**Video Codecs:**
- ✅ H.264/AVC (Main/High profile)
- ✅ H.265/HEVC (newer models)
- ❌ VP8/VP9 - Not supported on all models
- ❌ AV1 - Not supported

**Audio Codecs:**
- ✅ AAC (Recommended)
- ✅ MP3
- ✅ AC3/EAC3 (Dolby Digital)
- ✅ DTS (limited)

**⚠️ Always test on physical devices** - Codec support varies by TV model and year.

### HLS Streaming (Recommended)

**Why HLS:**
- Best compatibility across all webOS versions
- Adaptive bitrate works reliably
- DRM support (PlayReady, Widevine)
- Low latency options on newer models

**Basic Implementation:**
```html
<video id="videoPlayer" 
       autoplay 
       preload="auto"
       style="width: 100%; height: 100%;">
  <source src="https://example.com/stream/playlist.m3u8" 
          type="application/x-mpegURL">
</video>

<script>
const video = document.getElementById('videoPlayer');

video.addEventListener('loadedmetadata', () => {
  console.log('Video metadata loaded');
  console.log('Duration:', video.duration);
});

video.addEventListener('error', (e) => {
  console.error('Video error:', video.error);
});

// Play video
video.play();
</script>
```

### Using Shaka Player (Recommended for Floatplane)

**Why Shaka Player:**
- ✅ Excellent HLS support
- ✅ Adaptive streaming
- ✅ DRM support
- ✅ Live streaming
- ✅ Works on webOS 4.0+

**Installation:**
```html
<!-- Include Shaka Player -->
<script src="https://cdn.jsdelivr.net/npm/shaka-player@4.3.0/dist/shaka-player.compiled.js"></script>
```

**Implementation:**
```javascript
// Initialize
shaka.polyfill.installAll();

if (shaka.Player.isBrowserSupported()) {
  const video = document.getElementById('videoPlayer');
  const player = new shaka.Player(video);

  // Configure for webOS
  player.configure({
    streaming: {
      bufferingGoal: 30,
      rebufferingGoal: 5,
      bufferBehind: 30,
      retryParameters: {
        timeout: 30000,
        maxAttempts: 3,
        baseDelay: 1000,
        backoffFactor: 2,
        fuzzFactor: 0.5
      }
    },
    manifest: {
      retryParameters: {
        timeout: 30000,
        maxAttempts: 3
      }
    }
  });

  // Error handling
  player.addEventListener('error', onError);

  // Load manifest
  player.load('https://example.com/stream/playlist.m3u8')
    .then(() => {
      console.log('Video loaded successfully');
      video.play();
    })
    .catch(onError);

  function onError(error) {
    console.error('Error code', error.code, 'object', error);
  }
} else {
  console.error('Browser not supported');
}
```

### DRM Support

**Supported DRM Systems:**
- **Widevine** (Chrome-based) - webOS 4.5+
- **PlayReady** (Microsoft) - All versions

**Widevine Implementation:**
```javascript
player.configure({
  drm: {
    servers: {
      'com.widevine.alpha': 'https://license.example.com/widevine'
    }
  }
});

// Load protected content
player.load('https://example.com/protected/manifest.mpd')
  .catch(onError);
```

### Performance Tips

**1. Preloading:**
```javascript
// Preload metadata only (faster initial load)
video.preload = 'metadata';

// Or preload some data
video.preload = 'auto';
```

**2. Buffering Strategy:**
```javascript
// For webOS, moderate buffering works best
player.configure({
  streaming: {
    bufferingGoal: 20,      // 20 seconds ahead
    rebufferingGoal: 3,     // Start playing at 3 seconds
    bufferBehind: 20        // Keep 20 seconds behind
  }
});
```

**3. Quality Selection:**
```javascript
// Auto-select quality based on bandwidth
player.configure({
  abr: {
    enabled: true,
    defaultBandwidthEstimate: 5000000 // 5 Mbps default
  }
});

// Or manual quality selection
const tracks = player.getVariantTracks();
const hdTrack = tracks.find(t => t.height === 1080);
player.selectVariantTrack(hdTrack);
```

---

## Performance Optimization

### 1. DOM Optimization

**Limit DOM Nodes:**
```javascript
// ❌ BAD: Render all 1000 videos
videos.forEach(video => {
  container.appendChild(createVideoCard(video));
});

// ✅ GOOD: Virtual scrolling
function renderVisibleVideos() {
  const visibleStart = Math.floor(scrollTop / cardHeight);
  const visibleEnd = visibleStart + cardsPerScreen + 2; // +2 for buffer
  
  const visible = videos.slice(visibleStart, visibleEnd);
  
  container.innerHTML = '';
  visible.forEach(video => {
    container.appendChild(createVideoCard(video));
  });
}
```

**Use DocumentFragment:**
```javascript
// ✅ GOOD: Batch DOM updates
const fragment = document.createDocumentFragment();
videos.forEach(video => {
  fragment.appendChild(createVideoCard(video));
});
container.appendChild(fragment);
```

### 2. Image Optimization

**Lazy Loading:**
```javascript
// Use Intersection Observer
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      imageObserver.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
```

**Image Sizes:**
```html
<!-- Provide multiple sizes -->
<img srcset="thumbnail-320.jpg 320w,
             thumbnail-640.jpg 640w,
             thumbnail-1280.jpg 1280w"
     sizes="(max-width: 640px) 320px,
            (max-width: 1280px) 640px,
            1280px"
     src="thumbnail-640.jpg"
     alt="Video thumbnail">
```

**Use WebP with Fallback:**
```html
<picture>
  <source srcset="thumbnail.webp" type="image/webp">
  <img src="thumbnail.jpg" alt="Thumbnail">
</picture>
```

### 3. CSS Performance

**Use Hardware Acceleration:**
```css
/* Trigger GPU acceleration */
.animated-element {
  transform: translateZ(0);
  will-change: transform;
}

/* Use transform instead of position */
.sliding-menu {
  transform: translateX(0);
  transition: transform 0.3s;
}

.sliding-menu.open {
  transform: translateX(300px);
}
```

**Avoid Expensive Properties:**
```css
/* ❌ SLOW: */
.element {
  box-shadow: 0 0 50px rgba(0,0,0,0.5);
  filter: blur(10px);
}

/* ✅ FAST: */
.element {
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
```

### 4. JavaScript Performance

**Throttle/Debounce Events:**
```javascript
// Throttle scroll events
function throttle(func, delay) {
  let timeout = null;
  return function(...args) {
    if (!timeout) {
      timeout = setTimeout(() => {
        func.apply(this, args);
        timeout = null;
      }, delay);
    }
  };
}

window.addEventListener('scroll', throttle(() => {
  updateVisibleItems();
}, 100));

// Debounce search input
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

searchInput.addEventListener('input', debounce((e) => {
  performSearch(e.target.value);
}, 300));
```

**Minimize Reflows:**
```javascript
// ❌ BAD: Multiple reflows
element.style.width = '100px';
element.style.height = '100px';
element.style.padding = '10px';

// ✅ GOOD: Single reflow
element.style.cssText = 'width: 100px; height: 100px; padding: 10px;';

// Or use classes
element.className = 'expanded';
```

### 5. Memory Management

**Clean Up Intervals/Timeouts:**
```javascript
class Component {
  constructor() {
    this.timers = [];
    this.listeners = [];
  }

  addTimer(callback, delay) {
    const id = setInterval(callback, delay);
    this.timers.push(id);
    return id;
  }

  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  destroy() {
    // Clear all timers
    this.timers.forEach(id => clearInterval(id));
    this.timers = [];

    // Remove all listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  }
}
```

---

## Testing Strategies

### 1. Browser Testing (Quick Testing)

**Chrome DevTools Device Mode:**
```
1. Open Chrome DevTools (F12)
2. Enable Device Toolbar (Ctrl+Shift+M)
3. Select "Responsive" mode
4. Set resolution to 1920x1080
5. Test with keyboard only (no mouse)
```

**Chrome with CORS Disabled:**
```bash
# Linux
google-chrome --disable-web-security --user-data-dir=/tmp/chrome-dev

# macOS
open -na "Google Chrome" --args --disable-web-security --user-data-dir=/tmp/chrome-dev

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir=C:\tmp\chrome-dev
```

### 2. webOS Emulator (Not Recommended)

**Why Not:**
- Outdated (webOS 3.x)
- Poor performance
- Doesn't match real device behavior
- No hardware acceleration

**When to Use:**
- Initial layout testing only
- No physical TV available
- Package verification

### 3. Physical TV Testing (Required!)

**Essential Tests:**
- Video playback (various formats)
- Navigation with real remote
- Network interruption handling
- Memory usage over extended use
- Actual performance on target hardware

**Test Multiple Models:**
- Old TV (webOS 4.0, 2018)
- Mid-range (webOS 5.0-6.0, 2020-2021)
- Newer TV (webOS 22+, 2022+)

### 4. Remote Debugging

**Chrome DevTools on TV:**
```bash
# Launch app with inspector
ares-inspect --device tv com.floatplane.webos --open

# This opens Chrome DevTools connected to TV
# You can:
# - View console logs
# - Inspect DOM
# - Debug JavaScript
# - Monitor network
# - Check performance
```

**View Logs:**
```bash
# Real-time logs
ares-shell --device tv --run "tail -f /var/log/messages | grep floatplane"

# Filter by app ID
ares-shell --device tv --run "cat /var/log/messages | grep com.floatplane.webos"
```

### 5. Automated Testing

**Unit Tests (Jest):**
```javascript
// test/api.test.js
describe('Floatplane API', () => {
  test('should authenticate user', async () => {
    const auth = new AuthService();
    const result = await auth.login('user', 'pass');
    expect(result).toHaveProperty('sessionCookie');
  });
});
```

**Integration Tests:**
```javascript
// test/player.test.js
describe('Video Player', () => {
  test('should load and play HLS stream', async () => {
    const player = new VideoPlayer(document.createElement('video'));
    await player.load('https://test.com/stream.m3u8');
    expect(player.isReady()).toBe(true);
  });
});
```

---

## Common Pitfalls & Solutions

### 1. Focus Management Issues

**Problem:** Can't navigate with remote

**Solution:**
```javascript
// Ensure all interactive elements are focusable
document.querySelectorAll('button, a, [data-focusable]').forEach(el => {
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '0');
  }
});

// Implement focus trap for modals
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  container.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
```

### 2. Video Won't Play

**Problem:** Black screen, no error

**Causes & Solutions:**
```javascript
// 1. CORS issues
// Solution: Server must set CORS headers
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Headers: *

// 2. Codec not supported
// Solution: Check supported formats
video.canPlayType('application/vnd.apple.mpegurl'); // HLS
video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'); // H.264 + AAC

// 3. Not calling play() after load
video.addEventListener('loadedmetadata', () => {
  video.play().catch(e => console.error('Play failed:', e));
});

// 4. DRM issues
// Solution: Check license server and key system
```

### 3. Memory Leaks

**Problem:** App slows down over time

**Solution:**
```javascript
// Track all dynamic resources
class ResourceManager {
  constructor() {
    this.resources = new Set();
  }

  register(resource) {
    this.resources.add(resource);
  }

  cleanup() {
    this.resources.forEach(resource => {
      if (resource.destroy) {
        resource.destroy();
      } else if (resource.remove) {
        resource.remove();
      }
    });
    this.resources.clear();
  }
}

// Use in components
class VideoListComponent {
  constructor() {
    this.resources = new ResourceManager();
    this.images = [];
  }

  render() {
    this.videos.forEach(video => {
      const img = new Image();
      img.src = video.thumbnail;
      this.images.push(img);
      this.resources.register(img);
    });
  }

  destroy() {
    this.resources.cleanup();
    this.images = [];
  }
}
```

### 4. Network Timeouts

**Problem:** Requests fail on slow networks

**Solution:**
```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        timeout: 30000 // 30 second timeout
      });
      
      if (response.ok) {
        return response;
      }
      
      // Server error, retry
      if (response.status >= 500 && i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000); // Exponential backoff
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 5. Back Button Not Working

**Problem:** Back button exits app instead of navigating

**Solution:**
```javascript
// Track navigation history
const navigationStack = ['home'];

document.addEventListener('keydown', (e) => {
  if (e.keyCode === 461) { // webOS back button
    e.preventDefault();
    
    if (navigationStack.length > 1) {
      // Navigate back
      navigationStack.pop();
      const previousScreen = navigationStack[navigationStack.length - 1];
      showScreen(previousScreen);
    } else {
      // Exit app
      window.close();
    }
  }
});

function navigateTo(screen) {
  navigationStack.push(screen);
  showScreen(screen);
}
```

### 6. Text Too Small

**Problem:** Text unreadable from couch

**Solution:**
```css
/* Minimum sizes for TV */
body {
  font-size: 32px; /* Never smaller than 28px */
}

h1 { font-size: 48px; }
h2 { font-size: 42px; }
h3 { font-size: 36px; }

button {
  font-size: 32px;
  padding: 16px 32px;
  min-width: 200px;
  min-height: 80px;
}
```

---

## Essential Libraries & Tools

### Video Playback

**Shaka Player** (Recommended)
```bash
npm install shaka-player
```
- **Use for:** HLS/DASH streaming, DRM, live streams
- **Pros:** Best webOS compatibility, active development
- **Cons:** Larger file size (~300KB)
- **Docs:** https://shaka-player-demo.appspot.com/docs/

**HLS.js** (Alternative)
```bash
npm install hls.js
```
- **Use for:** HLS-only, smaller bundle size
- **Pros:** Lightweight (~150KB), simple API
- **Cons:** No DASH, limited DRM
- **Docs:** https://github.com/video-dev/hls.js/

**Video.js** (Alternative)
```bash
npm install video.js
```
- **Use for:** Rich UI controls
- **Pros:** Beautiful UI, plugins
- **Cons:** Heavier, less optimized for TV
- **Docs:** https://videojs.com/

### UI Frameworks

**Enact** (LG's Framework)
```bash
npm install -g @enact/cli
enact create myapp
```
- **Use for:** Official LG support, TV-optimized
- **Pros:** Built for webOS, spotlight navigation
- **Cons:** Learning curve, React-based
- **Docs:** https://enactjs.com/

**React** (Popular Choice)
```bash
npm install react react-dom
```
- **Use for:** Familiar framework
- **Pros:** Large ecosystem, developer experience
- **Cons:** Bundle size, needs optimization
- **Note:** Must transpile for older webOS

**Vanilla JS** (Our Recommendation)
- **Use for:** Maximum compatibility, smallest bundle
- **Pros:** No framework overhead, full control
- **Cons:** More code to write
- **Best for:** Floatplane app (simpler, faster)

### Utilities

**Socket.IO** (For Chat)
```bash
npm install socket.io-client
```
- **Use for:** Floatplane chat/livestream
- **Version:** 4.x (best webOS compatibility)
- **Docs:** https://socket.io/docs/

**Axios** (HTTP Client)
```bash
npm install axios
```
- **Use for:** API requests
- **Pros:** Better than fetch for webOS (better error handling)
- **Cons:** Additional dependency

**Lodash** (Utilities)
```bash
npm install lodash
```
- **Use for:** Throttle, debounce, utilities
- **Tip:** Import only what you need:
  ```javascript
  import throttle from 'lodash/throttle';
  import debounce from 'lodash/debounce';
  ```

### Build Tools

**Webpack** (Bundler)
```bash
npm install --save-dev webpack webpack-cli
```
- **Use for:** Bundle JavaScript
- **Config:** Target ES5 for old webOS
- **Plugins:** terser, babel

**Babel** (Transpiler)
```bash
npm install --save-dev @babel/core @babel/preset-env
```
- **Use for:** Convert ES6+ to ES5
- **Config:**
  ```javascript
  // babel.config.js
  module.exports = {
    presets: [
      ['@babel/preset-env', {
        targets: {
          chrome: '53' // webOS 4.0 minimum
        }
      }]
    ]
  };
  ```

---

## Official Resources

### Primary Documentation

**webOS TV Developer Site**
https://webostv.developer.lge.com/
- Main hub for all webOS TV development
- SDK downloads, documentation, tutorials

**API Documentation**
https://webostv.developer.lge.com/develop/references/web-api-reference
- Complete API reference
- webOSTV.js documentation
- Luna service APIs

**Web API Support**
https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine
- Browser compatibility tables
- Chromium versions
- Supported web APIs

**Sample Apps**
https://github.com/webOS-TV-app-samples
- Official sample applications
- Media playback examples
- Best practices

### Tools Downloads

**webOS Studio**
https://webostv.developer.lge.com/develop/tools/webos-studio
- Visual IDE for webOS development

**webOS CLI**
```bash
npm install -g @webos-tools/cli
```
- Command-line tools

**VS Code Extension**
https://marketplace.visualstudio.com/items?itemName=webOSTV.webostv
- webOS development in VS Code

### Developer Support

**LG Developer Forum**
https://webostv.developer.lge.com/community
- Ask questions
- Share experiences
- Get official support

**LG Seller Lounge**
https://seller.lgappstv.com
- App submission portal
- Content Store management
- Revenue tracking

### Testing & Certification

**App Submission Guide**
https://webostv.developer.lge.com/distribute/app-submission
- How to submit to Content Store
- Review process
- Requirements

**Self-Test Checklist**
https://webostv.developer.lge.com/distribute/app-self-checklist
- Pre-submission testing
- Common rejection reasons
- Quality guidelines

---

## Community Resources

### Open Source Projects

**webOS Homebrew**
https://www.webosbrew.org/
- Homebrew store for webOS
- Root/elevated access tools
- Community apps

**Dev Manager Desktop**
https://github.com/webosbrew/dev-manager-desktop
- Alternative to webOS Studio
- Easier TV management
- Open source

### Useful GitHub Repos

**Jellyfin webOS**
https://github.com/jellyfin/jellyfin-webos
- Well-structured video streaming app
- Good reference implementation
- Active development

**webOS Sample Apps**
https://github.com/webOS-TV-app-samples
- Official LG samples
- Various app types
- Best practices

**Floatplane API Docs**
https://github.com/jamamp/FloatplaneAPI
- Complete API specification
- OpenAPI format
- Unofficial but comprehensive

### Video Streaming Resources

**HLS.js Demo**
https://hls-js.netlify.app/demo/
- Test HLS playback
- Check device compatibility
- Debug streaming issues

**Shaka Player Demo**
https://shaka-player-demo.appspot.com/
- Interactive examples
- Configuration builder
- DRM testing

**Bitmovin webOS Guide**
https://developer.bitmovin.com/playback/docs/getting-started-with-the-web-player-on-lg-webos
- Professional player for webOS
- Good setup guide
- Best practices

---

## Floatplane-Specific Considerations

### API Rate Limiting

**Known Issues:**
- No official rate limits documented
- Be conservative with requests
- Implement caching

**Best Practices:**
```javascript
// Cache content lists
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let contentCache = null;
let cacheTime = 0;

async function getContent(creatorId) {
  if (contentCache && Date.now() - cacheTime < CACHE_DURATION) {
    return contentCache;
  }
  
  contentCache = await api.getCreatorContent(creatorId);
  cacheTime = Date.now();
  return contentCache;
}

// Throttle polling
const pollLiveStatus = throttle(async (streamId) => {
  const status = await api.getLiveStatus(streamId);
  updateUI(status);
}, 30000); // Max once per 30 seconds
```

### Session Management

**Cookie Handling:**
```javascript
// webOS doesn't always persist cookies properly
// Store session manually

class SessionManager {
  constructor() {
    this.sessionKey = 'fp_session';
  }

  saveSession(cookie) {
    localStorage.setItem(this.sessionKey, cookie);
  }

  getSession() {
    return localStorage.getItem(this.sessionKey);
  }

  clearSession() {
    localStorage.removeItem(this.sessionKey);
  }

  isValid() {
    const session = this.getSession();
    // Add expiration check if needed
    return !!session;
  }
}
```

### Chat Performance

**WebSocket on TV:**
```javascript
// Limit chat message history
const MAX_MESSAGES = 100;
let messages = [];

function addMessage(msg) {
  messages.push(msg);
  
  if (messages.length > MAX_MESSAGES) {
    messages.shift();
    // Remove oldest message from DOM
    chatContainer.firstChild.remove();
  }
  
  renderMessage(msg);
}

// Throttle message rendering
const renderMessage = throttle((msg) => {
  const element = createMessageElement(msg);
  chatContainer.appendChild(element);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}, 100);
```

### Image Loading Strategy

**Thumbnail Optimization:**
```javascript
// Load thumbnails progressively
class ThumbnailLoader {
  constructor() {
    this.queue = [];
    this.loading = 0;
    this.maxConcurrent = 4;
  }

  load(url) {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.loading >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const { url, resolve, reject } = this.queue.shift();
    this.loading++;

    const img = new Image();
    img.onload = () => {
      this.loading--;
      resolve(img);
      this.processQueue();
    };
    img.onerror = () => {
      this.loading--;
      reject(new Error(`Failed to load: ${url}`));
      this.processQueue();
    };
    img.src = url;
  }
}

const thumbnailLoader = new ThumbnailLoader();
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Test on physical TV (multiple models if possible)
- [ ] Verify video playback (VOD and livestream)
- [ ] Test navigation with remote control only
- [ ] Check memory usage over 30+ minutes
- [ ] Test network interruption handling
- [ ] Verify authentication flow
- [ ] Test session persistence
- [ ] Check text readability from 10 feet
- [ ] Verify back button behavior
- [ ] Test quality selection
- [ ] Verify chat functionality (if livestream)
- [ ] Check loading states
- [ ] Verify error handling

### Package Verification

- [ ] appinfo.json correctly configured
- [ ] All assets included (icons, splash screen)
- [ ] No console errors
- [ ] No memory leaks
- [ ] Reasonable bundle size (<10MB)
- [ ] All permissions declared
- [ ] Correct app ID format

### Performance Targets

- [ ] Launch time < 3 seconds
- [ ] Video start time < 5 seconds
- [ ] Navigation response < 200ms
- [ ] Memory usage < 200MB
- [ ] No dropped frames during playback
- [ ] Smooth scrolling (60fps)

---

## Summary: Key Takeaways

### What Makes webOS Different:

1. **Old Browser Versions** - Always transpile modern JS
2. **Limited Memory** - Optimize aggressively
3. **Remote Control Only** - Focus management critical
4. **10-Foot UI** - Everything bigger than web
5. **Physical TV Testing** - Emulator not sufficient

### For Floatplane App Specifically:

1. **Use Shaka Player** - Best HLS compatibility
2. **Vanilla JS** - Simpler, faster, smaller
3. **Cache Aggressively** - Slow networks common
4. **Session Management** - Store sessions manually
5. **Progressive Enhancement** - Start simple, add features

### Best Resources:

1. **Official Docs:** https://webostv.developer.lge.com/
2. **Shaka Player:** https://shaka-player-demo.appspot.com/docs/
3. **Jellyfin Reference:** https://github.com/jellyfin/jellyfin-webos
4. **FloatplaneAPI Spec:** https://github.com/jamamp/FloatplaneAPI
5. **Community:** https://www.webosbrew.org/

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Target Audience:** Developers, Coding Agents  
**Part of:** Floatplane webOS Documentation Suite
