# Floatplane webOS TV App - Product Documentation

## Project Overview

### About
An unofficial webOS TV application for Floatplane, the creator-driven streaming platform by Linus Media Group. This app enables LG Smart TV users to access their Floatplane subscriptions directly on their television with an optimized 10-foot interface.

### Platform Compatibility
- **Target Platform:** LG webOS TV
- **Minimum Version:** webOS 4.0 (2018 models and newer)
- **Recommended:** webOS 6.0+ (2021 models and newer)
- **Screen Resolution:** 1920x1080 (Full HD support)

### Key Features
- Native Floatplane authentication and login
- Browse subscribed creators and content
- Stream videos in multiple quality levels
- Magic Remote support with pointer and D-pad navigation
- Resume playback tracking
- Creator feed updates
- Picture quality optimization for TV displays

---

## Architecture

### Technology Stack

#### Core Technologies
- **HTML5** - Application structure and markup
- **CSS3** - Styling and animations
- **JavaScript (ES6+)** - Application logic and API communication
- **webOSTV.js** - LG TV platform APIs

#### Video Playback
- **Shaka Player** - Adaptive streaming (HLS/DASH)
- **HTML5 Video Element** - Native video rendering
- **MSE (Media Source Extensions)** - Advanced streaming control

#### Build Tools
- **Node.js** - Development runtime
- **npm** - Package management
- **ares-cli** - webOS packaging and deployment
- **Docker** (optional) - Containerized development environment

### Project Structure

```
floatplane-webos/
├── src/
│   ├── index.html              # Main application entry
│   ├── appinfo.json            # App metadata and configuration
│   ├── css/
│   │   ├── main.css           # Global styles
│   │   ├── layouts.css        # Screen layouts
│   │   ├── components.css     # Reusable UI components
│   │   └── player.css         # Video player styles
│   ├── js/
│   │   ├── app.js             # Application initialization
│   │   ├── api/
│   │   │   ├── auth.js        # Authentication handlers
│   │   │   ├── content.js     # Content fetching
│   │   │   ├── user.js        # User profile management
│   │   │   └── video.js       # Video streaming URLs
│   │   ├── ui/
│   │   │   ├── navigation.js  # Remote control handling
│   │   │   ├── screens.js     # Screen management
│   │   │   ├── focus.js       # Focus management system
│   │   │   └── keyboard.js    # Virtual keyboard integration
│   │   ├── player/
│   │   │   ├── video.js       # Video player controller
│   │   │   ├── controls.js    # Playback controls
│   │   │   └── quality.js     # Quality selection
│   │   └── utils/
│   │       ├── storage.js     # Local storage wrapper
│   │       ├── logger.js      # Debug logging
│   │       └── helpers.js     # Utility functions
│   ├── images/
│   │   ├── icon_80px.png      # App icon (80x80)
│   │   ├── icon_130px.png     # App icon (130x130)
│   │   ├── splash.png         # Launch screen
│   │   └── logo.png           # Floatplane logo
│   └── lib/
│       ├── shaka-player.js    # Shaka Player library
│       └── webostv.js         # webOS TV library
├── dist/                       # Build output directory
├── docker/
│   └── Dockerfile             # Development container
├── package.json               # Node dependencies
├── Makefile                   # Build commands
└── README.md                  # Project readme
```

### Application Flow

```
Start App
    ↓
Load Configuration
    ↓
Check Session → [No Session] → Login Screen → Authenticate → Store Session
    ↓            ↓
[Has Session]    ↓
    ↓            ↓
    ↓←───────────┘
    ↓
Load User Profile
    ↓
Fetch Subscriptions
    ↓
Display Home Screen
    ↓
User Navigation → Browse Content → Select Video → Fetch Stream URL → Play Video
    ↑                                                                      ↓
    └──────────────────────────────────────────────────────────────────────┘
```

---

## API Integration

### Floatplane API Endpoints

#### Base Configuration
```javascript
const API_BASE = 'https://www.floatplane.com/api';
const API_VERSION = {
  V2: 'v2',
  V3: 'v3'
};
```

#### Authentication

**Login**
```javascript
// Endpoint: POST /api/v2/auth/login
{
  username: string,
  password: string
}

// Response includes 'sails.sid' cookie
```

**Two-Factor Authentication**
```javascript
// Endpoint: POST /api/v2/auth/factor
{
  token: string  // 2FA code
}
```

**Session Management**
- Authentication uses HTTP cookie: `sails.sid`
- Store cookie securely in localStorage
- Include in all subsequent requests
- Session expires after period of inactivity

#### User Data

**Get Current User**
```javascript
// Endpoint: GET /api/v3/user/self
// Returns: User profile object
```

**Get Subscriptions**
```javascript
// Endpoint: GET /api/v3/user/subscriptions
// Returns: Array of creator subscriptions
```

#### Content Discovery

**Get Creator Content**
```javascript
// Endpoint: GET /api/v3/content/creator
// Parameters:
//   id: Creator GUID
//   hasVideo: true (filter for video content)
//   limit: 1-20 (number of items)
//   fetchAfter: number (pagination offset)
```

**Get Video Delivery Info**
```javascript
// Endpoint: GET /api/v2/cdn/delivery
// Parameters:
//   type: 'video'
//   id: Video/BlogPost ID
// Returns: CDN edge URLs for streaming
```

### API Implementation Guidelines

#### Request Headers
```javascript
const headers = {
  'Content-Type': 'application/json',
  'User-Agent': 'FloatplaneWebOS/1.0.0',
  'Cookie': `sails.sid=${sessionCookie}`
};
```

#### Error Handling
- **401 Unauthorized** - Session expired, redirect to login
- **403 Forbidden** - Access denied, check subscription status
- **404 Not Found** - Content not available
- **429 Too Many Requests** - Rate limited, implement backoff
- **5xx Server Errors** - Service issues, show error message

#### Rate Limiting
- Implement exponential backoff for retries
- Cache API responses where appropriate
- Respect API rate limits (avoid excessive polling)

---

## User Interface Design

### Design Principles

#### 10-Foot Experience
- Design for viewing distance of 8-10 feet from screen
- Minimum text size: 28px
- High contrast for readability
- Large, easy-to-target interactive elements

#### Navigation Requirements
- All elements navigable with 4-way D-pad (Up, Down, Left, Right)
- Clear focus indicators on all interactive elements
- OK button to select/activate
- Back button returns to previous screen or exits app

#### Layout Guidelines
- Maximum 2 primary concepts per screen
- Use card-based layouts for content
- Horizontal scrolling rows for content categories
- Grid layouts with consistent spacing

### Screen Designs

#### 1. Login Screen
```
┌─────────────────────────────────────────┐
│                                         │
│            FLOATPLANE LOGO              │
│                                         │
│    ┌──────────────────────────────┐    │
│    │ Username                      │    │
│    └──────────────────────────────┘    │
│                                         │
│    ┌──────────────────────────────┐    │
│    │ Password                      │    │
│    └──────────────────────────────┘    │
│                                         │
│          [ Login Button ]               │
│                                         │
└─────────────────────────────────────────┘
```

**Elements:**
- Center-aligned layout
- Large input fields (min 400px width)
- Uses LG Virtual Keyboard for text input
- Remember credentials option
- Loading indicator during authentication

#### 2. Home Screen
```
┌─────────────────────────────────────────────────────┐
│  ◄ [User Profile]              [Search] [Settings]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Featured Creator Content                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ Video1 │ │ Video2 │ │ Video3 │ │ Video4 │  ►  │
│  └────────┘ └────────┘ └────────┘ └────────┘     │
│                                                     │
│  Recent Uploads                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ Video  │ │ Video  │ │ Video  │ │ Video  │  ►  │
│  └────────┘ └────────┘ └────────┘ └────────┘     │
│                                                     │
│  Continue Watching                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐                │
│  │ Video  │ │ Video  │ │ Video  │              ►  │
│  └────────┘ └────────┘ └────────┘                │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Horizontal scrolling content rows
- Video thumbnails with metadata overlays
- Focus highlights on current selection
- Quick access to profile and settings

#### 3. Video Player
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                                                     │
│                  VIDEO CONTENT                      │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [◄◄] [▶/❚❚] [►►]    ━━━━━━●━━━━━    [Quality] [⚙] │
│  Title: Video Name                      12:34/45:00 │
└─────────────────────────────────────────────────────┘
```

**Controls:**
- Auto-hide after 5 seconds of inactivity
- Show on any remote input
- Seek bar with preview thumbnails
- Quality selector (720p, 1080p, Auto)
- Playback speed options

#### 4. Content Details
```
┌─────────────────────────────────────────────────────┐
│  ◄ Back                                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  Video Title                         │
│  │          │  Creator Name · Duration · Date      │
│  │  Thumb   │                                       │
│  │          │  [ ▶ Play ]  [ + Queue ]             │
│  └──────────┘                                       │
│                                                     │
│  Description text here...                           │
│  Lorem ipsum dolor sit amet...                      │
│                                                     │
│  Related Videos                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐                │
│  │ Video  │ │ Video  │ │ Video  │              ►  │
│  └────────┘ └────────┘ └────────┘                │
└─────────────────────────────────────────────────────┘
```

### UI Components

#### Video Card
```html
<div class="video-card" tabindex="0">
  <img src="thumbnail.jpg" class="video-thumbnail" />
  <div class="video-info">
    <h3 class="video-title">Video Title</h3>
    <p class="video-metadata">Creator · Duration</p>
  </div>
  <div class="progress-bar" style="width: 45%"></div>
</div>
```

**CSS Requirements:**
- Focus state: 2px border, scale 1.05
- Hover effect: Subtle shadow
- Progress bar for partially watched content

#### Navigation Menu
```html
<nav class="main-nav">
  <button class="nav-item" data-screen="home">Home</button>
  <button class="nav-item" data-screen="subscriptions">Subscriptions</button>
  <button class="nav-item" data-screen="search">Search</button>
  <button class="nav-item" data-screen="settings">Settings</button>
</nav>
```

### Focus Management

#### Focus System Implementation
```javascript
class FocusManager {
  constructor() {
    this.focusableElements = [];
    this.currentFocus = null;
  }
  
  register(element) {
    this.focusableElements.push(element);
    element.setAttribute('tabindex', '0');
  }
  
  navigate(direction) {
    // Calculate next focus based on direction
    // Consider spatial positioning
  }
  
  setFocus(element) {
    if (this.currentFocus) {
      this.currentFocus.classList.remove('focused');
    }
    element.classList.add('focused');
    this.currentFocus = element;
    element.focus();
  }
}
```

---

## Development Guide

### Prerequisites

#### Required Software
- Node.js 16.x or higher
- npm 8.x or higher
- LG Developer Account
- webOS TV SDK or ares-cli tools

#### Optional Tools
- Docker Desktop (for containerized development)
- VS Code with webOS extension
- Git for version control

### Installation

#### 1. Install webOS CLI Tools
```bash
# Install globally via npm
npm install -g @webos-tools/cli

# Verify installation
ares --version
```

#### 2. Clone and Setup Project
```bash
# Create project directory
mkdir floatplane-webos
cd floatplane-webos

# Initialize package.json
npm init -y

# Install dependencies
npm install
```

#### 3. Project Dependencies
```json
{
  "dependencies": {
    "shaka-player": "^4.3.0"
  },
  "devDependencies": {
    "@webos-tools/cli": "^2.0.0",
    "eslint": "^8.0.0"
  }
}
```

### Development Workflow

#### Building the App

**Manual Build**
```bash
# Navigate to project root
cd floatplane-webos

# Package the application
ares-package --no-minify src/ --outdir ./dist
```

**Using Makefile**
```makefile
.PHONY: build install launch

build:
	ares-package --no-minify src/ --outdir ./dist

install:
	ares-install --device tv ./dist/*.ipk

launch:
	ares-launch --device tv com.floatplane.webos

clean:
	rm -rf dist/
```

```bash
# Build
make build

# Install on TV
make install

# Launch app
make launch
```

#### Docker Development (Recommended)

**Dockerfile**
```dockerfile
FROM node:16-alpine

# Install webOS CLI tools
RUN npm install -g @webos-tools/cli

WORKDIR /app

# Copy project files
COPY package*.json ./
RUN npm install

COPY . .

CMD ["sh"]
```

**Build and Run Container**
```bash
# Build image
docker build -t floatplane-webos .

# Run container
docker run -it --rm \
  --network host \
  --name floatplane-dev \
  -v $(pwd):/app \
  floatplane-webos sh
```

### Testing on TV

#### Enable Developer Mode

1. Install "Developer Mode" app from LG Content Store
2. Launch Developer Mode app
3. Toggle "Dev Mode Status" to ON
4. Toggle "Key Server" to ON
5. Note the device IP and passphrase

#### Connect to TV

```bash
# Add TV as target device
ares-setup-device

# Enter device information:
# - Name: tv
# - IP: [Your TV IP]
# - Port: 9922
# - Username: prisoner

# Set up SSH key (Key Server must be running)
ares-novacom --device tv --getkey

# Test connection
ares-device-info -d tv
```

#### Install and Debug

```bash
# Install app on TV
ares-install --device tv ./dist/com.floatplane.webos_1.0.0_all.ipk

# Launch app
ares-launch --device tv com.floatplane.webos

# Launch with inspector (Chrome DevTools)
ares-inspect --device tv com.floatplane.webos --open
```

### Browser Testing

For quick testing without TV hardware:

```bash
# Start local development server
python -m http.server 8000

# Open browser with CORS disabled
# Chrome (Linux):
google-chrome \
  --user-data-dir="/tmp/chrome-dev" \
  --disable-web-security \
  --no-first-run \
  http://localhost:8000/src/index.html

# Chrome (macOS):
open -na "Google Chrome" \
  --args \
  --user-data-dir="/tmp/chrome-dev" \
  --disable-web-security \
  http://localhost:8000/src/index.html
```

**Note:** CORS must be disabled to allow API calls to Floatplane servers.

---

## Application Configuration

### appinfo.json

```json
{
  "id": "com.floatplane.webos",
  "version": "1.0.0",
  "vendor": "Community Developer",
  "type": "web",
  "main": "index.html",
  "title": "Floatplane",
  "icon": "images/icon_80px.png",
  "largeIcon": "images/icon_130px.png",
  "splashBackground": "images/splash.png",
  "resolution": "1920x1080",
  "requiredPermissions": [
    "network"
  ],
  "bgImage": "images/splash.png",
  "disallowScrollingInMainWindow": true
}
```

### Configuration File (config.js)

```javascript
const CONFIG = {
  app: {
    version: '1.0.0',
    name: 'Floatplane for webOS',
    userAgent: 'FloatplaneWebOS/1.0.0'
  },
  
  api: {
    baseUrl: 'https://www.floatplane.com/api',
    timeout: 30000,
    retryAttempts: 3
  },
  
  video: {
    defaultQuality: 'auto',
    qualities: ['360p', '720p', '1080p', 'auto'],
    bufferSize: 30, // seconds
    seekIncrement: 10 // seconds
  },
  
  ui: {
    focusAnimationDuration: 200, // ms
    controlsHideDelay: 5000, // ms
    cardsPerRow: 4,
    rowsVisible: 3
  },
  
  storage: {
    sessionKey: 'fp_session',
    settingsKey: 'fp_settings',
    progressKey: 'fp_progress'
  }
};
```

---

## Core Application Logic

### Authentication Implementation

```javascript
// src/js/api/auth.js

class AuthService {
  constructor() {
    this.baseUrl = 'https://www.floatplane.com/api/v2/auth';
    this.sessionCookie = null;
  }

  async login(username, password) {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': CONFIG.app.userAgent
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      // Extract session cookie
      const cookies = response.headers.get('set-cookie');
      this.sessionCookie = this.extractSailsSid(cookies);
      
      // Store session
      localStorage.setItem('fp_session', this.sessionCookie);

      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async twoFactorAuth(token) {
    const response = await fetch(`${this.baseUrl}/factor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sails.sid=${this.sessionCookie}`
      },
      body: JSON.stringify({ token })
    });

    return await response.json();
  }

  extractSailsSid(cookieString) {
    const match = cookieString.match(/sails\.sid=([^;]+)/);
    return match ? match[1] : null;
  }

  getSessionCookie() {
    return this.sessionCookie || localStorage.getItem('fp_session');
  }

  logout() {
    this.sessionCookie = null;
    localStorage.removeItem('fp_session');
  }

  isAuthenticated() {
    return !!this.getSessionCookie();
  }
}
```

### Content Fetching

```javascript
// src/js/api/content.js

class ContentService {
  constructor(authService) {
    this.auth = authService;
    this.baseUrl = 'https://www.floatplane.com/api/v3';
  }

  async getUserSubscriptions() {
    const response = await this.makeAuthenticatedRequest(
      `${this.baseUrl}/user/subscriptions`
    );
    return response;
  }

  async getCreatorContent(creatorId, options = {}) {
    const params = new URLSearchParams({
      id: creatorId,
      hasVideo: true,
      limit: options.limit || 20,
      ...options
    });

    const response = await this.makeAuthenticatedRequest(
      `${this.baseUrl}/content/creator?${params}`
    );
    return response;
  }

  async getVideoDeliveryInfo(videoId) {
    const params = new URLSearchParams({
      type: 'video',
      id: videoId
    });

    const response = await this.makeAuthenticatedRequest(
      `https://www.floatplane.com/api/v2/cdn/delivery?${params}`
    );
    return response;
  }

  async makeAuthenticatedRequest(url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sails.sid=${this.auth.getSessionCookie()}`
      }
    });

    if (response.status === 401) {
      // Session expired
      this.auth.logout();
      throw new Error('SESSION_EXPIRED');
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
  }
}
```

### Video Player Integration

```javascript
// src/js/player/video.js

class VideoPlayer {
  constructor(videoElement) {
    this.video = videoElement;
    this.player = null;
    this.initShaka();
  }

  async initShaka() {
    // Install polyfills
    shaka.polyfill.installAll();

    // Check browser support
    if (shaka.Player.isBrowserSupported()) {
      this.player = new shaka.Player(this.video);
      this.setupEventListeners();
    } else {
      console.error('Browser not supported');
    }
  }

  async loadVideo(manifestUrl) {
    try {
      await this.player.load(manifestUrl);
      console.log('Video loaded successfully');
    } catch (error) {
      console.error('Error loading video:', error);
    }
  }

  setupEventListeners() {
    this.player.addEventListener('error', this.onError.bind(this));
    this.video.addEventListener('play', this.onPlay.bind(this));
    this.video.addEventListener('pause', this.onPause.bind(this));
    this.video.addEventListener('ended', this.onEnded.bind(this));
  }

  play() {
    this.video.play();
  }

  pause() {
    this.video.pause();
  }

  seek(seconds) {
    this.video.currentTime = seconds;
  }

  setQuality(height) {
    const tracks = this.player.getVariantTracks();
    const track = tracks.find(t => t.height === height);
    if (track) {
      this.player.selectVariantTrack(track);
    }
  }

  getCurrentTime() {
    return this.video.currentTime;
  }

  getDuration() {
    return this.video.duration;
  }

  onError(error) {
    console.error('Player error:', error.detail);
  }

  onPlay() {
    console.log('Playback started');
  }

  onPause() {
    console.log('Playback paused');
  }

  onEnded() {
    console.log('Playback ended');
  }

  destroy() {
    if (this.player) {
      this.player.destroy();
    }
  }
}
```

### Remote Control Navigation

```javascript
// src/js/ui/navigation.js

class NavigationController {
  constructor() {
    this.currentScreen = null;
    this.focusManager = new FocusManager();
    this.setupKeyListeners();
  }

  setupKeyListeners() {
    document.addEventListener('keydown', (e) => {
      this.handleKeyPress(e.keyCode);
    });
  }

  handleKeyPress(keyCode) {
    switch(keyCode) {
      case 37: // Left arrow
        this.focusManager.navigateLeft();
        break;
      case 38: // Up arrow
        this.focusManager.navigateUp();
        break;
      case 39: // Right arrow
        this.focusManager.navigateRight();
        break;
      case 40: // Down arrow
        this.focusManager.navigateDown();
        break;
      case 13: // OK/Enter
        this.focusManager.activateFocused();
        break;
      case 461: // Back button (webOS)
      case 8:   // Backspace
        this.handleBack();
        break;
      case 415: // Play
        this.handlePlayPause();
        break;
      case 19: // Pause
        this.handlePlayPause();
        break;
      case 417: // Fast Forward
        this.handleSeekForward();
        break;
      case 412: // Rewind
        this.handleSeekBackward();
        break;
    }
  }

  handleBack() {
    if (this.currentScreen === 'home') {
      // Exit app
      window.close();
    } else {
      // Go to previous screen
      this.navigateToScreen('home');
    }
  }

  navigateToScreen(screenName) {
    this.currentScreen = screenName;
    // Screen transition logic
  }
}
```

---

## Storage and Data Persistence

### Local Storage Schema

```javascript
// Session Storage
{
  "fp_session": "sails.sid cookie value"
}

// Settings Storage
{
  "fp_settings": {
    "autoPlay": true,
    "defaultQuality": "1080p",
    "volume": 0.8,
    "subtitles": false
  }
}

// Progress Tracking
{
  "fp_progress": {
    "video_id_1": {
      "position": 1234,
      "duration": 3600,
      "lastWatched": "2024-01-15T10:30:00Z"
    }
  }
}

// Cache Storage
{
  "fp_cache": {
    "subscriptions": [...],
    "lastUpdated": "2024-01-15T10:00:00Z"
  }
}
```

### Storage Manager Implementation

```javascript
// src/js/utils/storage.js

class StorageManager {
  static get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  static remove(key) {
    localStorage.removeItem(key);
  }

  static clear() {
    localStorage.clear();
  }

  static updateProgress(videoId, position, duration) {
    const progress = this.get('fp_progress') || {};
    progress[videoId] = {
      position,
      duration,
      lastWatched: new Date().toISOString()
    };
    this.set('fp_progress', progress);
  }

  static getProgress(videoId) {
    const progress = this.get('fp_progress') || {};
    return progress[videoId];
  }
}
```

---

## Testing and Quality Assurance

### Testing Checklist

#### Functional Testing
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] 2FA authentication works correctly
- [ ] Session persists across app restarts
- [ ] Logout clears session data
- [ ] Video playback starts successfully
- [ ] Seeking forward/backward works
- [ ] Quality selection changes stream
- [ ] Resume playback from saved position
- [ ] Content browsing and navigation
- [ ] Search functionality

#### UI/UX Testing
- [ ] All buttons are focusable
- [ ] Focus indicators are visible
- [ ] Navigation with D-pad works smoothly
- [ ] Back button returns to previous screen
- [ ] Text is readable from 10 feet
- [ ] Loading indicators display correctly
- [ ] Error messages are clear
- [ ] Layout adapts to 1920x1080 resolution

#### Performance Testing
- [ ] App launches within 3 seconds
- [ ] Video starts playing within 5 seconds
- [ ] No frame drops during playback
- [ ] Memory usage stays below 200MB
- [ ] No memory leaks during extended use
- [ ] Smooth scrolling in content lists

#### Compatibility Testing
- [ ] Works on webOS 4.0 devices
- [ ] Works on webOS 5.0 devices
- [ ] Works on webOS 6.0+ devices
- [ ] Various TV models tested
- [ ] Both Magic Remote and standard remote

### Debug Logging

```javascript
// src/js/utils/logger.js

class Logger {
  static enabled = true;

  static log(message, data) {
    if (this.enabled) {
      console.log(`[FloatplaneWebOS] ${message}`, data || '');
    }
  }

  static error(message, error) {
    console.error(`[FloatplaneWebOS ERROR] ${message}`, error);
  }

  static warn(message, data) {
    console.warn(`[FloatplaneWebOS WARN] ${message}`, data || '');
  }
}
```

---

## Deployment

### App Submission to LG Content Store

#### Prerequisites
1. LG Seller Lounge account
2. Completed app testing
3. Required assets prepared
4. Privacy policy URL
5. Support contact information

#### Required Assets
- App icon (80x80px)
- Large icon (130x130px)
- Splash screen (1920x1080px)
- Screenshots (minimum 3, 1920x1080px)
- App description (multiple languages recommended)
- Privacy policy
- Terms of service

#### Submission Process

1. **Package Release Build**
```bash
# Create release package
ares-package --no-minify src/ --outdir ./release

# Generated file: com.floatplane.webos_1.0.0_all.ipk
```

2. **Login to Seller Lounge**
   - Visit: https://seller.lgappstv.com
   - Sign in with LG Developer account

3. **Create New App Submission**
   - Click "Register New App"
   - Select "webOS TV"
   - Choose app category: "Video"

4. **Upload App Package**
   - Upload .ipk file
   - System will validate package

5. **Fill App Information**
   - App title and description
   - Version number
   - What's new in this version
   - Keywords for search
   - Age rating
   - Privacy policy URL
   - Support email

6. **Upload Assets**
   - App icons
   - Screenshots
   - Promotional images

7. **Set Pricing and Availability**
   - Free app
   - Select countries/regions
   - Age restrictions

8. **Submit for Review**
   - LG QA team reviews (7-14 days)
   - May request changes
   - Approve/reject decision

9. **Publication**
   - Once approved, app goes live
   - Available in LG Content Store

### Version Updates

```bash
# Update version in appinfo.json
{
  "version": "1.1.0"
}

# Build new package
ares-package --no-minify src/ --outdir ./release

# Submit update through Seller Lounge
```

### Sideloading for Personal Use

For users who want to install without Content Store:

1. **Enable Developer Mode** on TV
2. **Build IPK package**
3. **Install via ares-cli**:
```bash
ares-install --device tv com.floatplane.webos_1.0.0_all.ipk
```

4. **Or use Dev Manager Desktop**:
   - Download from: https://github.com/webosbrew/dev-manager-desktop
   - Connect to TV
   - Drag and drop IPK file

---

## Troubleshooting

### Common Issues and Solutions

#### Authentication Issues

**Problem:** Login fails with "Session cannot be started"
- **Cause:** Invalid credentials or API changes
- **Solution:** Verify username/password, check Floatplane API status

**Problem:** Session expires frequently
- **Cause:** Cookie not being stored properly
- **Solution:** Check localStorage implementation, verify cookie extraction

#### Video Playback Issues

**Problem:** Video won't play
- **Cause:** Invalid stream URL or DRM issues
- **Solution:** Check video delivery API response, verify HLS support

**Problem:** Buffering or stuttering
- **Cause:** Network issues or insufficient buffer
- **Solution:** Increase buffer size, implement adaptive bitrate

**Problem:** No audio
- **Cause:** Audio codec not supported
- **Solution:** Check Shaka Player audio codec support

#### Navigation Issues

**Problem:** Cannot focus on elements
- **Cause:** Elements not registered with focus manager
- **Solution:** Ensure all interactive elements have tabindex and are registered

**Problem:** Back button doesn't work
- **Cause:** Event listener not capturing webOS back button
- **Solution:** Listen for keyCode 461 and 8

#### Performance Issues

**Problem:** App is slow to launch
- **Cause:** Large asset sizes or unnecessary loading
- **Solution:** Optimize images, lazy load components

**Problem:** Memory leaks
- **Cause:** Event listeners not cleaned up
- **Solution:** Remove listeners in cleanup, destroy player instances

### Debug Mode

Enable debug logging:
```javascript
// In config.js
const CONFIG = {
  debug: true,
  logLevel: 'verbose'
};
```

View logs:
```bash
# Connect inspector
ares-inspect --device tv com.floatplane.webos --open

# View in Chrome DevTools console
```

---

## Maintenance and Updates

### Monitoring

#### User Feedback
- Monitor app reviews in LG Content Store
- Create GitHub issues for bug reports
- Community feedback channels

#### Analytics (Optional)
- Track app launches
- Monitor crash reports
- Video playback metrics

### Update Schedule

#### Patch Updates (1.0.x)
- Bug fixes
- Performance improvements
- Minor UI tweaks
- Release as needed

#### Minor Updates (1.x.0)
- New features
- UI enhancements
- API updates
- Every 2-3 months

#### Major Updates (x.0.0)
- Major feature additions
- Complete redesigns
- Breaking API changes
- Yearly or as needed

### Maintenance Tasks

**Weekly:**
- Check for Floatplane API changes
- Monitor user reports
- Review crash logs

**Monthly:**
- Update dependencies
- Security patches
- Performance optimization

**Quarterly:**
- Test on new webOS versions
- Review and update documentation
- Plan new features

---

## Contributing Guidelines

### Development Standards

#### Code Style
- Use ES6+ JavaScript
- 2-space indentation
- Semicolons required
- camelCase for variables
- PascalCase for classes

#### Commit Messages
```
feat: Add quality selector to video player
fix: Resolve focus issue on home screen
docs: Update API documentation
refactor: Improve authentication flow
```

#### Pull Request Process
1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request
6. Wait for review

### Testing Requirements
- All new features must include tests
- Maintain minimum 80% code coverage
- Test on multiple webOS versions
- Document any breaking changes

---

## License and Legal

### Disclaimer
This is an **unofficial** application and is not affiliated with, endorsed by, or associated with Floatplane Media Inc. or Linus Media Group.

### Trademark Notice
Floatplane™ is a registered trademark of Floatplane Media Inc. This project uses the Floatplane name and branding under fair use for the purpose of creating a compatible client application.

### API Usage
This application uses the Floatplane API which is not officially documented or supported for third-party use. API access may be revoked at any time.

### Open Source License
This project is licensed under the MIT License. See LICENSE file for details.

### User Responsibility
Users are responsible for:
- Having valid Floatplane subscriptions
- Complying with Floatplane Terms of Service
- Any legal issues arising from use

---

## Resources

### Documentation
- **LG webOS Developer Site:** https://webostv.developer.lge.com
- **Floatplane API Spec:** https://github.com/jamamp/FloatplaneAPI
- **Shaka Player Docs:** https://shaka-player-demo.appspot.com/docs/

### Tools
- **webOS CLI:** https://github.com/webos-tools/cli
- **Dev Manager Desktop:** https://github.com/webosbrew/dev-manager-desktop
- **webOS Homebrew:** https://www.webosbrew.org

### Community
- **GitHub Issues:** [Your repo URL]
- **Discord:** [Optional community channel]
- **LG Developer Forum:** https://webostv.developer.lge.com/community/

### Reference Projects
- **Jellyfin webOS:** https://github.com/jellyfin/jellyfin-webos
- **Floaty (Flutter):** https://github.com/floatyfp/floaty
- **webOS Samples:** https://github.com/webOS-TV-app-samples

---

## Appendix

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Arrow Keys | Navigate menu |
| OK/Enter | Select/Activate |
| Back | Previous screen/Exit |
| Play/Pause | Toggle playback |
| Fast Forward | Skip forward 10s |
| Rewind | Skip backward 10s |
| Red/Green/Yellow/Blue | Quick actions (optional) |

### API Response Examples

#### Login Response
```json
{
  "user": {
    "id": "user123",
    "username": "username",
    "email": "user@example.com"
  },
  "needs2FA": false
}
```

#### Subscriptions Response
```json
[
  {
    "creator": "creator_guid",
    "plan": {
      "id": "plan123",
      "title": "Creator Name",
      "price": 5.00
    },
    "startDate": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Video Delivery Response
```json
{
  "cdn": "https://cdn.floatplane.com",
  "resource": {
    "uri": "/stream/video123/playlist.m3u8",
    "data": {
      "qualityLevels": [
        {"name": "1080p", "height": 1080},
        {"name": "720p", "height": 720}
      ]
    }
  }
}
```

### Version History

#### Version 1.0.0 (Initial Release)
- Basic authentication and login
- Content browsing from subscribed creators
- Video playback with quality selection
- Resume playback functionality
- Magic Remote support

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Maintained By:** Community Contributors
