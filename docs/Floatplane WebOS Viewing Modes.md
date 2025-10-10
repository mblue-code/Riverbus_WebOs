# Floatplane webOS - Viewing Modes & Livestream Implementation Guide

## How Floaty Handles Livestreams

### The Good News: Livestreams Work Like VOD!

Based on the Floatplane API structure, **livestreams use the exact same delivery mechanism as regular videos**. Here's what this means:

```javascript
// Whether it's VOD or livestream, the API call is identical:

// 1. Get content list (includes both VOD and live)
GET /api/v3/content/creator?id={creatorId}&hasVideo=true

// Response for LIVESTREAM:
{
  "id": "stream123",
  "title": "Live Stream Title",
  "isLive": true,           // <- Only difference
  "videoAttachments": [...],
  // ... rest is the same
}

// 2. Get stream URL (SAME endpoint for both!)
GET /api/v2/cdn/delivery?type=video&id=stream123

// Response:
{
  "cdn": "https://cdn.floatplane.com",
  "resource": {
    "uri": "/live/stream123/playlist.m3u8",  // HLS manifest
    "data": {
      "qualityLevels": [...]
    }
  }
}

// 3. Play the HLS stream (player treats it the same!)
player.load("https://cdn.floatplane.com/live/stream123/playlist.m3u8");
```

### Key Implementation Insight

**Floaty's approach (which you should copy):**

```javascript
// Single unified video player handles both:

class VideoPlayerController {
  async loadVideo(videoId) {
    // Step 1: Get delivery info
    const delivery = await api.getVideoDelivery(videoId);
    const streamUrl = `${delivery.cdn}${delivery.resource.uri}`;
    
    // Step 2: Detect if live based on URL pattern or metadata
    const isLive = streamUrl.includes('/live/') || 
                   delivery.resource.data.isLive;
    
    // Step 3: Configure player for live vs VOD
    if (isLive) {
      this.configureForLiveStream();
    } else {
      this.configureForVOD();
    }
    
    // Step 4: Load and play (same method!)
    await this.player.load(streamUrl);
    this.player.play();
  }
  
  configureForLiveStream() {
    this.isLiveMode = true;
    this.showLiveControls();
    this.startLivePolling();
    this.connectToChat();
  }
  
  configureForVOD() {
    this.isLiveMode = false;
    this.showVODControls();
  }
}
```

### What This Means For You

You **don't need special livestream handling** for the video playback itself! The HLS player (Shaka Player) automatically handles:
- ✅ Live edge detection
- ✅ DVR buffer management
- ✅ Adaptive bitrate for live
- ✅ Manifest updates

**You only need to handle:**
1. UI differences (live badge, viewer count, etc.)
2. Chat integration (optional but recommended)
3. Live status polling

---

## Viewing Modes Implementation

### Three Viewing Modes

```
Mode 1: THEATER MODE          Mode 2: CHAT MODE            Mode 3: FULLSCREEN
(Video Only)                   (Video + Chat)               (Immersive)

┌────────────────────┐        ┌──────────────┬─────────┐   ┌──────────────────┐
│                    │        │              │ Chat    │   │                  │
│                    │        │              │ ┌─────┐ │   │                  │
│      VIDEO         │        │    VIDEO     │ │msg1 │ │   │      VIDEO       │
│                    │        │              │ │msg2 │ │   │   (Full Screen)  │
│                    │        │              │ │msg3 │ │   │                  │
└────────────────────┘        └──────────────┴─────────┘   └──────────────────┘
[Controls] [Mode: 🎭]         [Controls] [Mode: 💬]        [Tap to show controls]
```

### Implementation Architecture

```javascript
// src/js/ui/viewing-modes.js

const ViewingMode = {
  THEATER: 'theater',      // Video only, no chat
  CHAT: 'chat',           // Video + chat sidebar
  FULLSCREEN: 'fullscreen' // Native fullscreen
};

class ViewingModeManager {
  constructor(playerElement, chatElement) {
    this.player = playerElement;
    this.chat = chatElement;
    this.currentMode = ViewingMode.THEATER;
    this.savedMode = null;
  }

  setMode(mode) {
    // Exit fullscreen if changing modes
    if (document.fullscreenElement && mode !== ViewingMode.FULLSCREEN) {
      document.exitFullscreen();
    }

    this.currentMode = mode;
    this.applyMode(mode);
    
    // Save preference
    localStorage.setItem('fp_viewing_mode', mode);
  }

  applyMode(mode) {
    const container = document.querySelector('.player-container');
    
    // Remove all mode classes
    container.classList.remove('mode-theater', 'mode-chat', 'mode-fullscreen');
    
    switch(mode) {
      case ViewingMode.THEATER:
        this.applyTheaterMode(container);
        break;
      
      case ViewingMode.CHAT:
        this.applyChatMode(container);
        break;
      
      case ViewingMode.FULLSCREEN:
        this.applyFullscreenMode(container);
        break;
    }
  }

  applyTheaterMode(container) {
    container.classList.add('mode-theater');
    
    // Hide chat
    this.chat.style.display = 'none';
    
    // Expand video to full width
    this.player.style.width = '100%';
    this.player.style.height = 'calc(100vh - 120px)';
    
    // Update mode indicator
    this.updateModeIndicator('🎭 Theater');
  }

  applyChatMode(container) {
    container.classList.add('mode-chat');
    
    // Show chat
    this.chat.style.display = 'block';
    
    // Split screen layout
    this.player.style.width = '70%';
    this.player.style.height = 'calc(100vh - 120px)';
    
    this.chat.style.width = '30%';
    this.chat.style.height = 'calc(100vh - 120px)';
    
    // Update mode indicator
    this.updateModeIndicator('💬 Chat');
  }

  applyFullscreenMode(container) {
    container.classList.add('mode-fullscreen');
    
    // Request fullscreen
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    }
    
    // In fullscreen, hide chat but can toggle overlay
    this.chat.style.display = 'none';
    
    // Update mode indicator (will auto-hide)
    this.updateModeIndicator('🖥️ Fullscreen');
  }

  toggleMode() {
    // Cycle through modes
    const modes = [ViewingMode.THEATER, ViewingMode.CHAT, ViewingMode.FULLSCREEN];
    const currentIndex = modes.indexOf(this.currentMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    this.setMode(nextMode);
  }

  toggleChat() {
    if (this.currentMode === ViewingMode.CHAT) {
      this.setMode(ViewingMode.THEATER);
    } else if (this.currentMode === ViewingMode.THEATER) {
      this.setMode(ViewingMode.CHAT);
    }
    // In fullscreen, show chat overlay temporarily
    else if (this.currentMode === ViewingMode.FULLSCREEN) {
      this.showChatOverlay();
    }
  }

  showChatOverlay() {
    // Show chat as temporary overlay in fullscreen
    const overlay = document.createElement('div');
    overlay.className = 'chat-overlay';
    overlay.innerHTML = `
      <div class="chat-overlay-content">
        ${this.chat.innerHTML}
      </div>
      <button class="close-overlay" onclick="this.parentElement.remove()">
        ✕
      </button>
    `;
    document.body.appendChild(overlay);
    
    // Auto-hide after 10 seconds
    setTimeout(() => overlay.remove(), 10000);
  }

  updateModeIndicator(text) {
    const indicator = document.querySelector('.mode-indicator');
    if (indicator) {
      indicator.textContent = text;
      indicator.classList.add('show');
      
      // Auto-hide after 2 seconds
      setTimeout(() => {
        indicator.classList.remove('show');
      }, 2000);
    }
  }

  restoreSavedMode() {
    const saved = localStorage.getItem('fp_viewing_mode');
    if (saved && Object.values(ViewingMode).includes(saved)) {
      this.setMode(saved);
    }
  }

  // Handle fullscreen change events
  onFullscreenChange() {
    if (!document.fullscreenElement) {
      // Exited fullscreen - restore previous mode
      if (this.currentMode === ViewingMode.FULLSCREEN) {
        this.setMode(this.savedMode || ViewingMode.THEATER);
      }
    }
  }
}
```

---

## HTML Structure for Viewing Modes

```html
<!-- index.html -->
<div class="player-container mode-theater">
  
  <!-- Video Player Section -->
  <div class="video-section">
    <video id="videoPlayer"></video>
    
    <!-- Live Badge (only for livestreams) -->
    <div class="live-badge" data-visible="false">
      <span class="live-dot"></span>
      LIVE
    </div>
    
    <!-- Viewer Count (only for livestreams) -->
    <div class="viewer-count" data-visible="false">
      👁 1.2K watching
    </div>
    
    <!-- Video Controls -->
    <div class="video-controls">
      <button class="control-btn play-pause">▶</button>
      <div class="seek-bar"></div>
      <button class="control-btn quality">Quality</button>
      
      <!-- Mode Toggle Button -->
      <button class="control-btn mode-toggle" 
              onclick="viewingModeManager.toggleMode()"
              title="Change viewing mode">
        🎭
      </button>
      
      <!-- Chat Toggle Button -->
      <button class="control-btn chat-toggle" 
              onclick="viewingModeManager.toggleChat()"
              title="Toggle chat">
        💬
      </button>
      
      <!-- Fullscreen Button -->
      <button class="control-btn fullscreen" 
              onclick="viewingModeManager.setMode('fullscreen')">
        ⛶
      </button>
    </div>
  </div>

  <!-- Chat Section -->
  <div class="chat-section" data-visible="false">
    <!-- Chat Header -->
    <div class="chat-header">
      <h3>Live Chat</h3>
      <button class="close-chat" 
              onclick="viewingModeManager.setMode('theater')">
        ✕
      </button>
    </div>
    
    <!-- Chat Messages -->
    <div class="chat-messages" id="chatMessages">
      <!-- Messages rendered here -->
    </div>
    
    <!-- Chat Input (optional) -->
    <div class="chat-input">
      <input type="text" 
             placeholder="Send a message..." 
             id="chatInput" />
      <button onclick="sendChatMessage()">Send</button>
    </div>
  </div>

  <!-- Mode Indicator (shows briefly when switching) -->
  <div class="mode-indicator">🎭 Theater</div>
</div>
```

---

## CSS for Viewing Modes

```css
/* src/css/viewing-modes.css */

/* Base Container */
.player-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #000;
  position: relative;
}

/* ============================================
   THEATER MODE (Video Only)
   ============================================ */
.player-container.mode-theater .video-section {
  width: 100%;
  height: 100%;
}

.player-container.mode-theater .chat-section {
  display: none;
}

/* ============================================
   CHAT MODE (Video + Chat)
   ============================================ */
.player-container.mode-chat {
  flex-direction: row;
}

.player-container.mode-chat .video-section {
  width: 70%;
  height: 100%;
  border-right: 2px solid #333;
}

.player-container.mode-chat .chat-section {
  width: 30%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

/* ============================================
   FULLSCREEN MODE
   ============================================ */
.player-container.mode-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
}

.player-container.mode-fullscreen .video-section {
  width: 100%;
  height: 100%;
}

.player-container.mode-fullscreen .chat-section {
  display: none;
}

.player-container.mode-fullscreen .video-controls {
  opacity: 0;
  transition: opacity 0.3s;
}

.player-container.mode-fullscreen:hover .video-controls {
  opacity: 1;
}

/* ============================================
   Chat Overlay (for fullscreen)
   ============================================ */
.chat-overlay {
  position: fixed;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  width: 400px;
  max-height: 80vh;
  background: rgba(0, 0, 0, 0.95);
  border: 2px solid #333;
  border-radius: 8px;
  z-index: 10000;
  animation: slideInRight 0.3s;
}

@keyframes slideInRight {
  from {
    transform: translateY(-50%) translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateY(-50%) translateX(0);
    opacity: 1;
  }
}

.chat-overlay-content {
  padding: 16px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.close-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ff4444;
  border: none;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.close-overlay:hover {
  background: #ff6666;
}

/* ============================================
   Mode Indicator
   ============================================ */
.mode-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px 40px;
  border-radius: 12px;
  font-size: 24px;
  font-weight: bold;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.mode-indicator.show {
  opacity: 1;
}

/* ============================================
   Chat Section Styling
   ============================================ */
.chat-section {
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 16px;
  background: #2a2a2a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #333;
}

.chat-header h3 {
  margin: 0;
  color: white;
  font-size: 18px;
}

.close-chat {
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
}

.close-chat:hover {
  color: #ff4444;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.chat-input {
  padding: 16px;
  background: #2a2a2a;
  border-top: 2px solid #333;
  display: flex;
  gap: 8px;
}

.chat-input input {
  flex: 1;
  padding: 12px;
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 6px;
  color: white;
  font-size: 16px;
}

.chat-input input:focus {
  outline: none;
  border-color: #4a9eff;
}

.chat-input button {
  padding: 12px 24px;
  background: #4a9eff;
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.chat-input button:hover {
  background: #6bb0ff;
}

/* ============================================
   Control Buttons
   ============================================ */
.control-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  padding: 8px 12px;
  cursor: pointer;
  transition: transform 0.2s;
}

.control-btn:hover {
  transform: scale(1.1);
}

.control-btn:focus {
  outline: 2px solid #4a9eff;
  outline-offset: 2px;
}

.control-btn.active {
  color: #4a9eff;
}
```

---

## Remote Control Navigation for Modes

```javascript
// src/js/ui/mode-navigation.js

class ModeNavigationController {
  constructor(viewingModeManager) {
    this.modeManager = viewingModeManager;
    this.setupKeyBindings();
  }

  setupKeyBindings() {
    document.addEventListener('keydown', (e) => {
      // Only handle if player is active
      if (!document.querySelector('.player-container')) return;

      switch(e.keyCode) {
        case 403: // Red button - Toggle viewing mode
          e.preventDefault();
          this.modeManager.toggleMode();
          break;

        case 404: // Green button - Toggle chat
          e.preventDefault();
          this.modeManager.toggleChat();
          break;

        case 405: // Yellow button - Theater mode
          e.preventDefault();
          this.modeManager.setMode(ViewingMode.THEATER);
          break;

        case 406: // Blue button - Chat mode
          e.preventDefault();
          this.modeManager.setMode(ViewingMode.CHAT);
          break;

        case 457: // Info button - Show mode info
          e.preventDefault();
          this.showModeInfo();
          break;
      }
    });
  }

  showModeInfo() {
    const overlay = document.createElement('div');
    overlay.className = 'info-overlay';
    overlay.innerHTML = `
      <div class="info-content">
        <h2>Viewing Modes</h2>
        <div class="mode-info">
          <div class="mode-item">
            <span class="mode-icon">🎭</span>
            <span class="mode-name">Theater Mode</span>
            <span class="mode-desc">Video only, no distractions</span>
          </div>
          <div class="mode-item">
            <span class="mode-icon">💬</span>
            <span class="mode-name">Chat Mode</span>
            <span class="mode-desc">Video + live chat sidebar</span>
          </div>
          <div class="mode-item">
            <span class="mode-icon">🖥️</span>
            <span class="mode-name">Fullscreen</span>
            <span class="mode-desc">Immersive viewing experience</span>
          </div>
        </div>
        <div class="controls-info">
          <p><strong>Red Button:</strong> Cycle modes</p>
          <p><strong>Green Button:</strong> Toggle chat</p>
          <p><strong>Yellow Button:</strong> Theater mode</p>
          <p><strong>Blue Button:</strong> Chat mode</p>
        </div>
        <button class="close-info" onclick="this.parentElement.parentElement.remove()">
          Close
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}
```

---

## Smart Mode Switching

```javascript
// src/js/ui/smart-mode.js

class SmartModeManager extends ViewingModeManager {
  constructor(playerElement, chatElement) {
    super(playerElement, chatElement);
    this.setupSmartMode();
  }

  setupSmartMode() {
    // Auto-switch to chat mode when livestream starts
    this.on('livestream-started', () => {
      if (this.currentMode === ViewingMode.THEATER) {
        this.suggestChatMode();
      }
    });

    // Auto-switch to theater when stream ends
    this.on('livestream-ended', () => {
      if (this.currentMode === ViewingMode.CHAT) {
        this.setMode(ViewingMode.THEATER);
      }
    });
  }

  suggestChatMode() {
    // Show notification suggesting chat mode
    const notification = document.createElement('div');
    notification.className = 'mode-suggestion';
    notification.innerHTML = `
      <div class="suggestion-content">
        <p>💬 Join the live chat?</p>
        <button class="btn-primary" onclick="viewingModeManager.setMode('chat')">
          Enable Chat
        </button>
        <button class="btn-secondary" onclick="this.parentElement.parentElement.remove()">
          No Thanks
        </button>
      </div>
    `;
    document.body.appendChild(notification);

    // Auto-dismiss after 5 seconds
    setTimeout(() => notification.remove(), 5000);
  }

  // Remember user's preference per content type
  rememberPreference(contentType, mode) {
    const prefs = JSON.parse(
      localStorage.getItem('fp_mode_preferences') || '{}'
    );
    prefs[contentType] = mode;
    localStorage.setItem('fp_mode_preferences', JSON.stringify(prefs));
  }

  loadPreferenceFor(contentType) {
    const prefs = JSON.parse(
      localStorage.getItem('fp_mode_preferences') || '{}'
    );
    return prefs[contentType] || ViewingMode.THEATER;
  }

  // Apply mode based on content
  applyModeForContent(isLive, hasChat) {
    if (isLive && hasChat) {
      // Livestream with chat - load user's livestream preference
      const preferred = this.loadPreferenceFor('livestream');
      this.setMode(preferred);
    } else {
      // VOD content - load user's VOD preference
      const preferred = this.loadPreferenceFor('vod');
      this.setMode(preferred);
    }
  }
}
```

---

## Initialization Example

```javascript
// src/js/app.js

// Initialize viewing modes when player loads
async function initializePlayer(videoId, isLive) {
  // Create player elements
  const playerElement = document.getElementById('videoPlayer');
  const chatElement = document.getElementById('chatSection');

  // Initialize mode manager
  const viewingModeManager = new SmartModeManager(
    playerElement,
    chatElement
  );

  // Make globally accessible for buttons
  window.viewingModeManager = viewingModeManager;

  // Set up navigation
  const modeNav = new ModeNavigationController(viewingModeManager);

  // Apply appropriate mode for content type
  if (isLive) {
    // For livestreams, suggest chat mode
    viewingModeManager.applyModeForContent(true, true);
    
    // Connect to chat
    const chatClient = new FloatplaneChatClient(authService);
    await chatClient.connect(videoId);
  } else {
    // For VOD, use theater mode by default
    viewingModeManager.applyModeForContent(false, false);
  }

  // Load video
  const streamUrl = await getStreamUrl(videoId);
  const player = new LivestreamPlayer(playerElement);
  await player.loadVideo(streamUrl, { isLive });

  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', () => {
    viewingModeManager.onFullscreenChange();
  });
}
```

---

## Summary

### What You Get:

1. **Three Viewing Modes:**
   - 🎭 **Theater:** Video only, maximum screen real estate
   - 💬 **Chat:** Split screen with live chat
   - 🖥️ **Fullscreen:** Immersive mode with overlay chat

2. **Smart Behavior:**
   - Auto-suggest chat for livestreams
   - Remember user preferences per content type
   - Smooth transitions between modes

3. **Remote Control:**
   - Colored buttons for mode switching
   - D-pad navigation works in all modes
   - Easy fullscreen toggle

4. **Livestream Handling:**
   - Same video player for VOD and live
   - Automatic detection and configuration
   - Chat integration when live

### Key Takeaway from Floaty:

The video playback is **identical** for VOD and livestreams. The only differences are:
- UI elements (live badge, viewer count)
- Chat availability
- Control behavior (DVR vs full seek)

Your app can use **one unified player** with mode switches for different viewing experiences!

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Part of:** Floatplane webOS Documentation Suite
