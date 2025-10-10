# Floatplane webOS - Livestream Support Addendum

## Overview

This document extends the main product documentation with comprehensive livestream support. Floatplane creators can broadcast live content to their subscribers, and your webOS app needs to handle both live streams and VOD (Video on Demand) content.

---

## Livestream Architecture

### Key Differences from VOD

| Feature | VOD Content | Livestream Content |
|---------|-------------|-------------------|
| Availability | Always available | Only during broadcast |
| Seek/Scrub | Full timeline control | Limited to live buffer |
| Chat | No live chat | Real-time chat via WebSocket |
| Notifications | None | Live start notifications |
| Quality | Fixed renditions | Adaptive with live encoding |
| Latency | N/A | 10-30 seconds typical |

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Floatplane Backend                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [REST API]              [WebSocket API]               │
│  www.floatplane.com      chat.floatplane.com           │
│       │                        │                        │
│       ├─ Live status           ├─ Chat messages        │
│       ├─ Stream URL            ├─ Live polls           │
│       └─ Metadata              └─ Notifications        │
│                                                         │
└─────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│                   webOS TV App                           │
├──────────────────────────────────────────────────────────┤
│  [HTTP Client]              [WebSocket Client]          │
│  - Fetch live status        - Connect to chat           │
│  - Get stream URL           - Receive messages          │
│  - Poll for updates         - Send messages             │
│                                                          │
│  [Video Player]             [Chat UI]                   │
│  - HLS live stream          - Message display           │
│  - DVR buffer               - Poll voting               │
│  - Low latency mode         - Emote rendering           │
└──────────────────────────────────────────────────────────┘
```

---

## API Integration

### Detecting Live Streams

**Endpoint:** Same as regular content, but check for live flag

```javascript
// Get creator content (includes live streams)
GET /api/v3/content/creator?id={creatorId}&hasVideo=true

// Response includes live flag
{
  "blogPosts": [
    {
      "id": "video123",
      "title": "Live Stream Title",
      "isLive": true,  // <- Key indicator
      "liveStreamStatus": "live", // or "ended", "scheduled"
      "scheduledStart": "2025-01-15T20:00:00Z",
      "viewerCount": 1234,
      // ... other fields
    }
  ]
}
```

### Getting Live Stream URL

```javascript
// Same as VOD, but returns live manifest
GET /api/v2/cdn/delivery?type=video&id={liveStreamId}

// Response
{
  "cdn": "https://cdn.floatplane.com",
  "resource": {
    "uri": "/live/stream123/playlist.m3u8",
    "data": {
      "qualityLevels": [...],
      "isLive": true,
      "dvr": true  // DVR enabled (seek in live buffer)
    }
  }
}
```

### WebSocket Chat Connection

**Endpoint:** `wss://chat.floatplane.com/sails.io/`

```javascript
// Connection requires Socket.IO client
// Based on Sails.js framework

// Connection URL format
wss://chat.floatplane.com/sails.io/?
  __sails_io_sdk_version=0.13.0&
  __sails_io_sdk_platform=browser&
  __sails_io_sdk_language=javascript&
  EIO=3&
  transport=websocket
```

**Authentication:**
- Include session cookie in connection headers
- Send authentication message after connection

**Available Events:**
- `chatMessage` - New chat message
- `pollOpen` - Live poll started
- `pollUpdateTally` - Poll vote counts updated
- `pollClose` - Poll ended
- `creatorNotification` - Stream status changes

---

## Implementation Guide

### 1. Livestream Detection

```javascript
// src/js/api/livestream.js

class LivestreamService {
  constructor(contentService) {
    this.content = contentService;
    this.pollInterval = null;
  }

  async getLiveStreams(creatorId) {
    const content = await this.content.getCreatorContent(creatorId, {
      hasVideo: true,
      limit: 20
    });

    // Filter for live content
    return content.blogPosts.filter(post => 
      post.isLive && post.liveStreamStatus === 'live'
    );
  }

  async checkLiveStatus(streamId) {
    // Poll for live status updates
    const content = await this.content.getVideoDetails(streamId);
    return {
      isLive: content.isLive,
      status: content.liveStreamStatus,
      viewerCount: content.viewerCount,
      startedAt: content.startedAt
    };
  }

  startPolling(streamId, callback, interval = 30000) {
    // Poll every 30 seconds for status updates
    this.pollInterval = setInterval(async () => {
      const status = await this.checkLiveStatus(streamId);
      callback(status);
    }, interval);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
```

### 2. Live Video Player Setup

```javascript
// src/js/player/livestream-player.js

class LivestreamPlayer extends VideoPlayer {
  constructor(videoElement) {
    super(videoElement);
    this.isLive = false;
    this.dvrEnabled = false;
    this.liveEdge = true;
  }

  async loadLivestream(manifestUrl, options = {}) {
    this.isLive = true;
    this.dvrEnabled = options.dvr || false;

    // Configure Shaka for live streaming
    this.player.configure({
      streaming: {
        bufferingGoal: 10, // seconds
        rebufferingGoal: 2,
        bufferBehind: 30, // DVR buffer
        ignoreTextStreamFailures: true,
        alwaysStreamText: false,
        startAtSegmentBoundary: false,
        stallEnabled: true,
        stallThreshold: 1,
        stallSkip: 0.1
      },
      manifest: {
        defaultPresentationDelay: 10, // Lower for less latency
        availabilityWindowOverride: 300 // 5 min DVR window
      }
    });

    await this.player.load(manifestUrl);
    
    // Jump to live edge
    this.seekToLive();
  }

  seekToLive() {
    if (!this.isLive) return;
    
    const seekRange = this.player.seekRange();
    const liveEdge = seekRange.end;
    this.video.currentTime = liveEdge;
    this.liveEdge = true;
  }

  isAtLiveEdge() {
    if (!this.isLive) return false;
    
    const seekRange = this.player.seekRange();
    const currentTime = this.video.currentTime;
    const liveEdge = seekRange.end;
    
    // Within 5 seconds of live edge
    return (liveEdge - currentTime) < 5;
  }

  onTimeUpdate() {
    super.onTimeUpdate();
    
    if (this.isLive) {
      this.liveEdge = this.isAtLiveEdge();
      // Update UI to show live indicator
      this.emit('liveEdgeChange', this.liveEdge);
    }
  }

  getDvrWindow() {
    if (!this.isLive || !this.dvrEnabled) {
      return { start: 0, end: 0 };
    }
    
    const seekRange = this.player.seekRange();
    return {
      start: seekRange.start,
      end: seekRange.end,
      duration: seekRange.end - seekRange.start
    };
  }

  // Override seek for live streams
  seek(seconds) {
    if (!this.dvrEnabled) {
      console.warn('Seeking not available in live mode');
      return;
    }
    
    const seekRange = this.player.seekRange();
    const targetTime = Math.max(
      seekRange.start,
      Math.min(seconds, seekRange.end)
    );
    
    this.video.currentTime = targetTime;
    this.liveEdge = this.isAtLiveEdge();
  }
}
```

### 3. Chat Integration

```javascript
// src/js/chat/chat-client.js

class FloatplaneChatClient {
  constructor(authService) {
    this.auth = authService;
    this.socket = null;
    this.connected = false;
    this.listeners = {};
  }

  async connect(streamId) {
    // Import Socket.IO client library
    const io = window.io;

    // Connect to chat server
    this.socket = io('wss://chat.floatplane.com', {
      path: '/sails.io',
      transports: ['websocket'],
      extraHeaders: {
        'Cookie': `sails.sid=${this.auth.getSessionCookie()}`
      }
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('Chat connected');
      this.connected = true;
      this.joinStream(streamId);
    });

    this.socket.on('disconnect', () => {
      console.log('Chat disconnected');
      this.connected = false;
    });

    // Chat events
    this.socket.on('chatMessage', (data) => {
      this.emit('message', data);
    });

    this.socket.on('pollOpen', (data) => {
      this.emit('pollOpen', data);
    });

    this.socket.on('pollUpdateTally', (data) => {
      this.emit('pollUpdate', data);
    });

    this.socket.on('pollClose', (data) => {
      this.emit('pollClose', data);
    });
  }

  joinStream(streamId) {
    if (!this.connected) return;

    // Join stream chat room
    this.socket.emit('get', {
      url: '/api/v3/chat/join',
      data: { streamId }
    }, (response) => {
      console.log('Joined stream chat:', response);
    });
  }

  sendMessage(message) {
    if (!this.connected) return;

    this.socket.emit('post', {
      url: '/api/v3/chat/message',
      data: { message }
    });
  }

  votePoll(pollId, optionIndex) {
    if (!this.connected) return;

    this.socket.emit('post', {
      url: '/api/v3/poll/vote',
      data: { pollId, option: optionIndex }
    });
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      callback(data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}
```

### 4. Chat Message Model

```javascript
// Chat message structure
{
  "id": "msg123",
  "user": {
    "id": "user123",
    "username": "viewer_name",
    "profileImage": "https://...",
    "badges": ["subscriber", "moderator"]
  },
  "message": "Great stream!",
  "timestamp": "2025-01-15T20:05:30Z",
  "emotes": [
    {
      "name": ":lttLove:",
      "imageUrl": "https://...",
      "position": [14, 22]
    }
  ]
}
```

---

## UI Implementation

### Livestream Indicator

```html
<!-- Home Screen - Live Badge -->
<div class="video-card live-stream">
  <div class="live-badge">
    <span class="live-dot"></span>
    LIVE
  </div>
  <img src="thumbnail.jpg" class="video-thumbnail" />
  <div class="video-info">
    <h3>Stream Title</h3>
    <p>1.2K viewers</p>
  </div>
</div>
```

```css
/* src/css/livestream.css */

.live-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #ff0000;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-stream .video-thumbnail {
  border: 2px solid #ff0000;
}
```

### Live Player Controls

```html
<!-- Video Player - Live Controls -->
<div class="player-controls">
  <div class="playback-controls">
    <button class="control-btn play-pause">▶/❚❚</button>
    
    <!-- DVR Seek Bar (only if DVR enabled) -->
    <div class="seek-bar-container" data-dvr="true">
      <div class="seek-bar">
        <div class="buffered"></div>
        <div class="played"></div>
        <div class="live-edge-indicator"></div>
      </div>
      <div class="time-display">-5:00 / LIVE</div>
    </div>
    
    <!-- Jump to Live Button -->
    <button class="control-btn jump-to-live" data-at-edge="false">
      <span class="live-indicator">●</span> GO LIVE
    </button>
    
    <!-- Viewer Count -->
    <div class="viewer-count">
      👁 1.2K watching
    </div>
    
    <!-- Quality/Settings -->
    <button class="control-btn quality">Quality</button>
    <button class="control-btn settings">⚙</button>
  </div>
</div>
```

### Chat Sidebar Layout

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                                                      │
│                VIDEO PLAYER                          │
│              (Livestream Playing)                    │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Chat                                   [Fullscreen] │
├──────────────────────────────────────────────────────┤
│  user1: Great stream! 👍                            │
│  user2: :lttLove:                                    │
│  [MOD] user3: Welcome everyone                      │
│  user4: Question about the product?                 │
│  ...                                                 │
│                                                      │
│  [Active Poll]                                       │
│  What's your favorite feature?                       │
│  ○ Feature A (45%)                                   │
│  ● Feature B (55%)                                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Chat UI Component

```html
<!-- Chat Container -->
<div class="chat-container" data-visible="true">
  <!-- Chat Header -->
  <div class="chat-header">
    <h3>Live Chat</h3>
    <div class="chat-actions">
      <button class="chat-toggle">Hide Chat</button>
      <button class="chat-settings">⚙</button>
    </div>
  </div>

  <!-- Chat Messages -->
  <div class="chat-messages" id="chatMessages">
    <!-- Messages append here -->
  </div>

  <!-- Active Poll (if any) -->
  <div class="chat-poll" data-active="true">
    <div class="poll-question">What's your favorite feature?</div>
    <div class="poll-options">
      <button class="poll-option" data-votes="45">
        <span class="option-text">Feature A</span>
        <span class="option-percentage">45%</span>
      </button>
      <button class="poll-option" data-votes="55">
        <span class="option-text">Feature B</span>
        <span class="option-percentage">55%</span>
      </button>
    </div>
    <div class="poll-timer">30s remaining</div>
  </div>

  <!-- Chat Input (Optional - if sending enabled) -->
  <div class="chat-input">
    <input type="text" placeholder="Send a message..." />
    <button class="send-button">Send</button>
  </div>
</div>
```

```css
/* src/css/chat.css */

.chat-container {
  width: 100%;
  max-height: 400px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  font-size: 16px;
  line-height: 1.5;
}

.chat-message {
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.chat-message-user {
  font-weight: bold;
  color: #4a9eff;
}

.chat-message-badge {
  display: inline-block;
  padding: 2px 6px;
  background: #ff6b00;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 4px;
}

.chat-message-text {
  color: #ffffff;
}

.chat-poll {
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.poll-question {
  font-weight: bold;
  margin-bottom: 12px;
  font-size: 18px;
}

.poll-option {
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  transition: all 0.2s;
}

.poll-option:focus {
  border-color: #4a9eff;
  background: rgba(74, 158, 255, 0.2);
}

.poll-option:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

### Chat Message Rendering

```javascript
// src/js/ui/chat-renderer.js

class ChatRenderer {
  constructor(containerElement) {
    this.container = containerElement;
    this.maxMessages = 50; // Limit for performance
  }

  addMessage(messageData) {
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';

    // Render badges
    const badges = messageData.user.badges
      .map(badge => `<span class="chat-message-badge">${badge}</span>`)
      .join('');

    // Render message with emotes
    const messageText = this.renderEmotes(
      messageData.message,
      messageData.emotes
    );

    messageEl.innerHTML = `
      <div class="chat-message-user">
        ${badges}
        ${messageData.user.username}:
      </div>
      <div class="chat-message-text">${messageText}</div>
    `;

    this.container.appendChild(messageEl);
    
    // Auto-scroll to bottom
    this.container.scrollTop = this.container.scrollHeight;

    // Remove old messages
    this.pruneMessages();
  }

  renderEmotes(text, emotes) {
    if (!emotes || emotes.length === 0) return text;

    let result = text;
    
    // Replace emote codes with images (reverse order to maintain positions)
    emotes.reverse().forEach(emote => {
      const [start, end] = emote.position;
      const emoteName = text.substring(start, end);
      const emoteImg = `<img src="${emote.imageUrl}" 
                             alt="${emoteName}" 
                             class="chat-emote" 
                             title="${emoteName}" />`;
      
      result = result.substring(0, start) + 
               emoteImg + 
               result.substring(end);
    });

    return result;
  }

  pruneMessages() {
    const messages = this.container.querySelectorAll('.chat-message');
    if (messages.length > this.maxMessages) {
      const excess = messages.length - this.maxMessages;
      for (let i = 0; i < excess; i++) {
        messages[i].remove();
      }
    }
  }

  clear() {
    this.container.innerHTML = '';
  }
}
```

---

## Screen Flows

### Live Stream Discovery Flow

```
Home Screen
    │
    ├─ Show "LIVE NOW" section at top
    │  (if any subscribed creators are live)
    │
    ├─ Display live badge on thumbnails
    │
    └─ User selects live stream
        │
        ▼
    Loading Screen
        │
        ├─ Fetch stream details
        ├─ Get live stream URL
        └─ Connect to chat
        │
        ▼
    Livestream Player Screen
        │
        ├─ Video player (top)
        ├─ Chat sidebar (bottom/side)
        ├─ Live controls
        └─ Viewer count
```

### Livestream End Handling

```javascript
// Detect when stream ends
class LivestreamMonitor {
  constructor(player, livestreamService) {
    this.player = player;
    this.service = livestreamService;
    this.checkInterval = null;
  }

  startMonitoring(streamId) {
    this.checkInterval = setInterval(async () => {
      const status = await this.service.checkLiveStatus(streamId);
      
      if (status.status === 'ended') {
        this.handleStreamEnded();
      }
    }, 10000); // Check every 10 seconds
  }

  handleStreamEnded() {
    // Stop monitoring
    this.stopMonitoring();

    // Pause player
    this.player.pause();

    // Show "Stream Ended" overlay
    this.showStreamEndedOverlay();

    // Disconnect chat
    if (this.chatClient) {
      this.chatClient.disconnect();
    }
  }

  showStreamEndedOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'stream-ended-overlay';
    overlay.innerHTML = `
      <div class="overlay-content">
        <h2>Stream Has Ended</h2>
        <p>Thanks for watching!</p>
        <button class="btn-primary" onclick="goToHome()">
          Back to Home
        </button>
        <button class="btn-secondary" onclick="reloadPage()">
          Check for VOD
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
```

---

## Configuration Updates

### Update appinfo.json

```json
{
  "id": "com.floatplane.webos",
  "version": "1.1.0",
  "vendor": "Community Developer",
  "type": "web",
  "main": "index.html",
  "title": "Floatplane",
  "icon": "images/icon_80px.png",
  "largeIcon": "images/icon_130px.png",
  "resolution": "1920x1080",
  "requiredPermissions": [
    "network",
    "websocket"  // Required for chat
  ]
}
```

### Add Socket.IO Dependency

```html
<!-- index.html -->
<head>
  ...
  <!-- Socket.IO Client for chat -->
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  
  <!-- Or bundle locally -->
  <script src="lib/socket.io.min.js"></script>
</head>
```

---

## Performance Considerations

### Memory Management

```javascript
// Limit chat message history
const MAX_CHAT_MESSAGES = 100;

// Clear old messages periodically
setInterval(() => {
  const messages = document.querySelectorAll('.chat-message');
  if (messages.length > MAX_CHAT_MESSAGES) {
    const toRemove = messages.length - MAX_CHAT_MESSAGES;
    for (let i = 0; i < toRemove; i++) {
      messages[i].remove();
    }
  }
}, 30000); // Every 30 seconds
```

### Network Optimization

```javascript
// Throttle viewer count updates
const updateViewerCount = _.throttle((count) => {
  document.querySelector('.viewer-count').textContent = 
    `👁 ${formatNumber(count)} watching`;
}, 5000); // Max once per 5 seconds

// Debounce chat input
const sendChatMessage = _.debounce((message) => {
  chatClient.sendMessage(message);
}, 1000, { leading: true, trailing: false });
```

---

## Testing Checklist

### Livestream-Specific Tests

- [ ] Live badge displays on active streams
- [ ] Stream loads and plays without buffering issues
- [ ] Jump to live button works correctly
- [ ] DVR seeking works (if enabled)
- [ ] Viewer count updates periodically
- [ ] Chat connection establishes successfully
- [ ] Chat messages display in real-time
- [ ] Poll voting works correctly
- [ ] Stream end detection and overlay
- [ ] Reconnection after network interruption
- [ ] Multiple concurrent livestream handling
- [ ] Chat performance with high message volume
- [ ] Memory usage stays reasonable during long streams

---

## Troubleshooting

### Common Livestream Issues

**Problem:** Chat not connecting
- **Cause:** WebSocket blocked or auth issues
- **Solution:** Check socket.io connection, verify session cookie

**Problem:** High latency (30+ seconds)
- **Cause:** Buffering settings too aggressive
- **Solution:** Reduce `bufferingGoal` in Shaka config

**Problem:** Stream stutters/buffers frequently
- **Cause:** Network instability or low bandwidth
- **Solution:** Implement quality auto-switching, increase buffer

**Problem:** Can't seek in livestream
- **Cause:** DVR not enabled by creator
- **Solution:** Hide seek controls, show "Live only" message

**Problem:** Chat messages missing
- **Cause:** WebSocket disconnection
- **Solution:** Implement reconnection logic with backoff

---

## Future Enhancements

### Potential Features

1. **Chat Moderation**
   - Report messages
   - Block users
   - Moderator actions

2. **Enhanced Interactivity**
   - Channel points/rewards
   - Bit cheering
   - Sub-only chat mode

3. **Multi-stream Support**
   - Watch multiple streams
   - Picture-in-picture
   - Stream switching

4. **Notifications**
   - Push notifications when creator goes live
   - Native webOS notifications
   - Scheduled stream reminders

5. **Recording**
   - Auto-save as VOD after stream
   - Clip creation during live
   - Highlight markers

---

## API Reference Summary

### Livestream Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v3/content/creator` | GET | Get creator content (includes live) |
| `/api/v2/cdn/delivery` | GET | Get stream URL |
| `/api/v3/chat/join` | POST | Join chat room |
| `/api/v3/chat/message` | POST | Send chat message |
| `/api/v3/poll/vote` | POST | Vote in poll |

### WebSocket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `chatMessage` | Server→Client | New chat message |
| `pollOpen` | Server→Client | Poll started |
| `pollUpdateTally` | Server→Client | Poll vote update |
| `pollClose` | Server→Client | Poll ended |
| `streamStatusChange` | Server→Client | Stream status change |

---

## Resources

- **Socket.IO Documentation:** https://socket.io/docs/
- **Shaka Player Live Streaming:** https://shaka-player-demo.appspot.com/docs/tutorial-live.html
- **HLS.js (Alternative):** https://github.com/video-dev/hls.js/
- **Floatplane AsyncAPI Docs:** https://jman012.github.io/FloatplaneAPIDocs/AsyncAPIFrontend/

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Companion to:** Floatplane webOS Product Documentation v1.0
