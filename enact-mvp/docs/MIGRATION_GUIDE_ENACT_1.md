# Migration Guide: Enact 4.x to Enact 1.13 for webOS 4.0 Support

## Overview

This guide provides step-by-step instructions for migrating the Floatplane Enact MVP from Enact 4.5.6 (React 18) to Enact 1.13 (React 15) to support older LG webOS 4.0 TVs (2018 models like OLED55C8LLA).

**⚠️ Warning:** This is a major refactoring effort requiring significant code changes. Estimated time: 2-4 weeks full-time development.

## Prerequisites

- Understanding of React class components (hooks not available in React 15)
- Familiarity with Enact 1.x API
- Access to webOS 4.0 test device
- Git branch for legacy support

## Phase 1: Environment Setup

### 1.1 Create Legacy Branch

```bash
cd /Volumes/macminiExtern/webos_app/enact-mvp
git checkout -b legacy-webos4-enact1
```

### 1.2 Update package.json

Replace the current dependencies with Enact 1.13 compatible versions:

```json
{
  "name": "floatplane-enact-mvp",
  "version": "0.1.0-legacy",
  "private": true,
  "description": "Enact 1.13-based Floatplane webOS app for webOS 4.0 TVs",
  "main": "src/index.js",
  "scripts": {
    "serve": "enact serve",
    "pack": "enact pack",
    "lint": "enact lint",
    "install-service": "ares-novacom -- install service ./services/login-service"
  },
  "dependencies": {
    "@enact/core": "~1.13.4",
    "@enact/moonstone": "~1.13.4",
    "@enact/webos": "~1.13.4",
    "@enact/ui": "~1.13.4",
    "@enact/i18n": "~1.13.4",
    "@enact/spotlight": "~1.13.4",
    "hls.js": "^0.12.4",
    "prop-types": "^15.7.2",
    "react": "~15.6.2",
    "react-dom": "~15.6.2"
  },
  "devDependencies": {
    "@enact/cli": "~1.2.4",
    "eslint": "^4.19.1",
    "eslint-config-enact": "^1.5.0"
  },
  "engines": {
    "node": ">=8.0.0 <11.0.0"
  },
  "enact": {
    "theme": "moonstone",
    "ri": {
      "baseSize": 24
    }
  }
}
```

**Key Changes:**
- Enact packages downgraded to 1.13.x
- React downgraded to 15.6.2
- HLS.js downgraded to 0.12.4 (compatible with ES5)
- Node version constraint for Enact CLI 1.x
- Added eslint config for Enact 1.x

### 1.3 Install Dependencies

```bash
# Clean existing installation
rm -rf node_modules package-lock.json

# Use Node 10 (required for Enact CLI 1.x)
nvm install 10
nvm use 10

# Install dependencies
npm install
```

## Phase 2: React Migration (Hooks → Classes)

### 2.1 Component Structure Changes

**Enact 4.x (Current) - Functional with Hooks:**

```javascript
import {useState, useEffect, useCallback} from 'react';
import kind from '@enact/core/kind';

const MyComponent = kind({
  name: 'MyComponent',

  render: ({prop1, prop2}) => {
    const [state, setState] = useState(initialState);

    useEffect(() => {
      // Side effect
    }, [dependency]);

    const handleClick = useCallback(() => {
      setState(newState);
    }, [dependency]);

    return <div onClick={handleClick}>{state.value}</div>;
  }
});
```

**Enact 1.x (Target) - Class Component:**

```javascript
import React from 'react';
import kind from '@enact/core/kind';

const MyComponentBase = kind({
  name: 'MyComponent',

  propTypes: {
    prop1: PropTypes.string,
    prop2: PropTypes.number
  },

  defaultProps: {
    prop1: 'default'
  },

  styles: {
    css,
    className: 'myComponent'
  },

  computed: {
    computedProp: ({prop1}) => prop1.toUpperCase()
  },

  handlers: {
    handleClick: (ev, {prop2}) => {
      // Handler logic
    }
  },

  render: ({handleClick, computedProp, ...rest}) => {
    return <div onClick={handleClick}>{computedProp}</div>;
  }
});

// If you need component state, wrap in a class
class MyComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: null
    };
  }

  componentDidMount() {
    // Lifecycle method
  }

  componentDidUpdate(prevProps, prevState) {
    // Update logic
  }

  componentWillUnmount() {
    // Cleanup
  }

  handleStateChange = () => {
    this.setState({value: 'new value'});
  }

  render() {
    return (
      <MyComponentBase
        {...this.props}
        value={this.state.value}
        onAction={this.handleStateChange}
      />
    );
  }
}
```

### 2.2 Common Hook Conversions

#### useState → this.state

**Before (Enact 4.x):**
```javascript
const [videos, setVideos] = useState([]);
const [loading, setLoading] = useState(false);
```

**After (Enact 1.x):**
```javascript
constructor(props) {
  super(props);
  this.state = {
    videos: [],
    loading: false
  };
}

// Usage
this.setState({videos: newVideos});
this.setState({loading: true});
```

#### useEffect → Lifecycle Methods

**Before (Enact 4.x):**
```javascript
useEffect(() => {
  fetchData();
}, [dependency]);

useEffect(() => {
  const timer = setInterval(poll, 1000);
  return () => clearInterval(timer);
}, []);
```

**After (Enact 1.x):**
```javascript
componentDidMount() {
  this.fetchData();
  this.timer = setInterval(this.poll, 1000);
}

componentDidUpdate(prevProps) {
  if (prevProps.dependency !== this.props.dependency) {
    this.fetchData();
  }
}

componentWillUnmount() {
  clearInterval(this.timer);
}
```

#### useCallback → Class Methods

**Before (Enact 4.x):**
```javascript
const handleClick = useCallback(() => {
  doSomething(prop);
}, [prop]);
```

**After (Enact 1.x):**
```javascript
handleClick = () => {
  this.doSomething(this.props.prop);
}

// Or in kind handlers
handlers: {
  handleClick: (ev, {prop}) => {
    doSomething(prop);
  }
}
```

#### useContext → Legacy Context API

**Before (Enact 4.x):**
```javascript
const theme = useContext(ThemeContext);
```

**After (Enact 1.x):**
```javascript
// Define context types
static contextTypes = {
  theme: PropTypes.object
}

// Access in render
render() {
  const {theme} = this.context;
}
```

## Phase 3: Enact API Migration

### 3.1 Import Path Changes

**Enact 4.x:**
```javascript
import kind from '@enact/core/kind';
import Spotlight from '@enact/spotlight';
import {VirtualGridList} from '@enact/moonstone/VirtualList';
import LS2Request from '@enact/webos/LS2Request';
```

**Enact 1.x:**
```javascript
import kind from '@enact/core/kind';
import Spotlight from '@enact/spotlight';
import {GridListImageItem} from '@enact/moonstone/GridListImageItem';
import {VirtualList} from '@enact/moonstone/VirtualList';
import LS2Request from '@enact/webos/LS2Request';
```

### 3.2 Moonstone Component Changes

#### Panels

**Enact 4.x:**
```javascript
import {Panel, Header} from '@enact/moonstone/Panels';

<Panel>
  <Header title="My App" />
  <div>Content</div>
</Panel>
```

**Enact 1.x:**
```javascript
import {Panel, Header} from '@enact/moonstone/Panels';

<Panel>
  <Header title="My App" type="compact" />
  <div>Content</div>
</Panel>
```

#### Button

**Enact 4.x:**
```javascript
import Button from '@enact/moonstone/Button';

<Button onClick={handleClick}>Click Me</Button>
```

**Enact 1.x:**
```javascript
import Button from '@enact/moonstone/Button';

<Button onTap={handleClick}>Click Me</Button>
```

**Note:** In Enact 1.x, use `onTap` instead of `onClick` for better remote control support.

#### Input

**Enact 4.x:**
```javascript
import Input from '@enact/moonstone/Input';

<Input
  value={value}
  onChange={handleChange}
  placeholder="Enter text"
/>
```

**Enact 1.x:**
```javascript
import Input from '@enact/moonstone/Input';

<Input
  value={value}
  onChange={handleChange}
  placeholder="Enter text"
  dismissOnEnter
/>
```

#### VideoPlayer

**Enact 4.x:**
```javascript
import VideoPlayer from '@enact/moonstone/VideoPlayer';

<VideoPlayer
  title="Video Title"
  poster="poster.jpg"
>
  <source src="video.mp4" />
</VideoPlayer>
```

**Enact 1.x:**
```javascript
import VideoPlayer from '@enact/moonstone/VideoPlayer';
import MediaControls from '@enact/moonstone/MediaControls';

<VideoPlayer
  title="Video Title"
  poster="poster.jpg"
>
  <source src="video.mp4" />
  <MediaControls />
</VideoPlayer>
```

### 3.3 Spotlight (Focus Management)

**Enact 4.x:**
```javascript
import Spotlight from '@enact/spotlight';
import {Spottable} from '@enact/spotlight/Spottable';

const SpottableDiv = Spottable('div');

<SpottableDiv onFocus={handleFocus}>
  Content
</SpottableDiv>
```

**Enact 1.x:**
```javascript
import Spotlight from '@enact/spotlight';
import Spottable from '@enact/spotlight/Spottable';

const SpottableDiv = Spottable('div');

<SpottableDiv onSpotlightDown={handleDown}>
  Content
</SpottableDiv>
```

### 3.4 LS2Request (Luna Service)

**Enact 4.x:**
```javascript
import LS2Request from '@enact/webos/LS2Request';

const request = new LS2Request();
request.send({
  service: 'luna://com.example.service',
  method: 'getData',
  parameters: {key: 'value'},
  onSuccess: (response) => {},
  onError: (error) => {}
});
```

**Enact 1.x (Same API):**
```javascript
import LS2Request from '@enact/webos/LS2Request';

// API is mostly compatible
const request = new LS2Request();
request.send({
  service: 'luna://com.example.service',
  method: 'getData',
  parameters: {key: 'value'},
  onSuccess: (response) => {},
  onFailure: (error) => {} // Note: onFailure instead of onError
});
```

## Phase 4: HLS.js Integration

### 4.1 Downgrade HLS.js

HLS.js 1.x uses modern JavaScript features not available in webOS 4.0's Chromium 53.

**Required Version:** HLS.js 0.12.4

```bash
npm install hls.js@0.12.4
```

### 4.2 HLS.js API Differences

**Enact 4.x (HLS.js 1.x):**
```javascript
import Hls from 'hls.js';

const hls = new Hls({
  debug: false,
  enableWorker: true,
  loader: CustomLoader
});

hls.loadSource(url);
hls.attachMedia(videoElement);

hls.on(Hls.Events.MANIFEST_PARSED, () => {
  videoElement.play();
});
```

**Enact 1.x (HLS.js 0.12.x):**
```javascript
import Hls from 'hls.js';

const hls = new Hls({
  debug: false,
  enableWorker: true,
  pLoader: CustomLoader // Note: pLoader instead of loader
});

hls.loadSource(url);
hls.attachMedia(videoElement);

hls.on(Hls.Events.MANIFEST_PARSED, function() {
  videoElement.play();
});
```

**Key Differences:**
- Custom loader property is `pLoader` instead of `loader`
- Callback signature changes in some events
- Error handling structure different

### 4.3 Custom Loader for Enact 1.x

```javascript
// Custom loader for decryption keys
class FloatplaneKeyLoader {
  constructor(config) {
    this.config = config;
  }

  load(context, config, callbacks) {
    const url = context.url;

    // Check if this is a key request
    if (url.indexOf('/api/video/watchKey') !== -1) {
      // Use Luna service
      this.loadViaLunaService(url, callbacks);
    } else {
      // Use default XHR
      this.loadViaXHR(url, callbacks);
    }
  }

  loadViaLunaService(url, callbacks) {
    // Implementation using LS2Request
    const request = new LS2Request();
    request.send({
      service: 'luna://com.community.floatplane.enactmvp.login',
      method: 'watchKey',
      parameters: {url: url},
      onSuccess: function(response) {
        // Convert base64 to ArrayBuffer
        const arrayBuffer = base64ToArrayBuffer(response.data);
        callbacks.onSuccess({
          url: url,
          data: arrayBuffer
        });
      },
      onFailure: function(error) {
        callbacks.onError({
          code: error.errorCode,
          text: error.errorText
        });
      }
    });
  }

  loadViaXHR(url, callbacks) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        callbacks.onSuccess({
          url: url,
          data: xhr.response
        });
      } else {
        callbacks.onError({
          code: xhr.status,
          text: xhr.statusText
        });
      }
    };

    xhr.onerror = function() {
      callbacks.onError({
        code: 0,
        text: 'Network error'
      });
    };

    xhr.send();
  }

  abort() {
    // Cleanup
  }

  destroy() {
    // Cleanup
  }
}

// Helper function for base64 decoding (ES5 compatible)
function base64ToArrayBuffer(base64) {
  var binaryString = window.atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
```

## Phase 5: Code Style Updates

### 5.1 ES6+ to ES5 Conversions

#### Arrow Functions

**Before:**
```javascript
const myFunction = (param) => {
  return param * 2;
};
```

**After:**
```javascript
function myFunction(param) {
  return param * 2;
}

// Or for methods
myMethod: function(param) {
  return param * 2;
}
```

#### Template Literals

**Before:**
```javascript
const message = `Hello ${name}, you have ${count} items`;
```

**After:**
```javascript
const message = 'Hello ' + name + ', you have ' + count + ' items';
```

#### Destructuring

**Before:**
```javascript
const {prop1, prop2, ...rest} = props;
const [first, second] = array;
```

**After:**
```javascript
const prop1 = props.prop1;
const prop2 = props.prop2;
const rest = Object.assign({}, props);
delete rest.prop1;
delete rest.prop2;

const first = array[0];
const second = array[1];
```

#### Spread Operator

**Before:**
```javascript
const newArray = [...oldArray, newItem];
const newObject = {...oldObject, key: value};
```

**After:**
```javascript
const newArray = oldArray.concat([newItem]);
const newObject = Object.assign({}, oldObject, {key: value});
```

#### Default Parameters

**Before:**
```javascript
function myFunc(param = 'default') {
  return param;
}
```

**After:**
```javascript
function myFunc(param) {
  if (param === undefined) {
    param = 'default';
  }
  return param;
}
```

### 5.2 Array Methods

Most ES5 array methods work, but be careful with:

**Before (ES6+):**
```javascript
const found = array.find(item => item.id === id);
const hasItem = array.includes(value);
```

**After (ES5):**
```javascript
const found = array.filter(function(item) {
  return item.id === id;
})[0];

const hasItem = array.indexOf(value) !== -1;
```

## Phase 6: Build Configuration

### 6.1 Update .eslintrc

Create/update `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['enact'],
  parserOptions: {
    ecmaVersion: 5,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true,
    node: true,
    es6: false
  },
  rules: {
    'no-var': 'off',
    'prefer-const': 'off',
    'prefer-arrow-callback': 'off',
    'object-shorthand': 'off'
  }
};
```

### 6.2 Enact CLI Configuration

The `.enact/` folder may need updates for older CLI version. Check generated output.

### 6.3 Babel Configuration

Enact CLI 1.x handles transpilation, but verify in `package.json`:

```json
{
  "enact": {
    "theme": "moonstone",
    "ri": {
      "baseSize": 24
    },
    "resolution": "hd",
    "target": ["ie11", "chrome41"]
  }
}
```

## Phase 7: Testing & Validation

### 7.1 Local Development

```bash
# Using Node 10
nvm use 10

# Start dev server
npm run serve
```

Access at `http://localhost:8080` and test in modern browser first.

### 7.2 Build for Device

```bash
npm run pack
```

### 7.3 Deploy to webOS 4.0

```bash
# Package
ares-package dist services

# Install
ares-install -d tv3 com.community.floatplane.enactmvp_0.1.0_all.ipk

# Launch
ares-launch -d tv3 com.community.floatplane.enactmvp
```

### 7.4 Debugging

```bash
# Open inspector
ares-inspect -d tv3 --app com.community.floatplane.enactmvp --open
```

Check console for:
- JavaScript errors (syntax errors, undefined APIs)
- Network requests (HLS segments, keys)
- Performance issues

## Phase 8: Known Issues & Workarounds

### 8.1 Polyfills Needed

Add to `src/index.js`:

```javascript
// Promise polyfill
require('es6-promise').polyfill();

// Fetch polyfill
require('whatwg-fetch');

// Object.assign polyfill
if (typeof Object.assign !== 'function') {
  Object.assign = function(target) {
    'use strict';
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    target = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];
      if (source != null) {
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  };
}
```

### 8.2 Video Player Issues

webOS 4.0 has quirks with `<video>` element:

```javascript
// Workaround for autoplay
videoElement.load();
videoElement.play().then(function() {
  // Success
}).catch(function(error) {
  // Autoplay blocked, show play button
});
```

### 8.3 Memory Management

Older TVs have less RAM:

```javascript
componentWillUnmount() {
  // Clean up HLS instance
  if (this.hls) {
    this.hls.destroy();
    this.hls = null;
  }

  // Clear large arrays
  this.setState({videos: []});
}
```

## Phase 9: Performance Optimization

### 9.1 Reduce Bundle Size

- Remove unused dependencies
- Minimize large libraries
- Use code splitting carefully (limited in Enact 1.x)

### 9.2 Optimize Rendering

```javascript
// Use shouldComponentUpdate
shouldComponentUpdate(nextProps, nextState) {
  return nextProps.data !== this.props.data ||
         nextState.value !== this.state.value;
}

// Or use PureComponent equivalent
import pure from '@enact/core/pure';

const MyComponent = pure(MyComponentBase);
```

### 9.3 Lazy Loading

Load HLS.js only when needed:

```javascript
loadHlsPlayer() {
  if (!this.hlsLoaded) {
    require.ensure([], function(require) {
      const Hls = require('hls.js');
      this.initializeHls(Hls);
      this.hlsLoaded = true;
    }.bind(this));
  }
}
```

## Checklist

### Pre-Migration
- [ ] Create legacy branch
- [ ] Backup current working code
- [ ] Document current features
- [ ] Set up webOS 4.0 test device

### Dependencies
- [ ] Install Node 10
- [ ] Update package.json dependencies
- [ ] Install Enact 1.13 packages
- [ ] Downgrade HLS.js to 0.12.4
- [ ] Add required polyfills

### Code Migration
- [ ] Convert all hooks to class components
- [ ] Update Enact component imports
- [ ] Fix Moonstone component usage
- [ ] Update event handlers (onClick → onTap)
- [ ] Migrate LS2Request calls
- [ ] Convert ES6+ syntax to ES5

### HLS Integration
- [ ] Update HLS.js initialization
- [ ] Fix custom loader implementation
- [ ] Test encrypted video playback
- [ ] Verify key loading through Luna

### Testing
- [ ] Test on webOS 4.0 device
- [ ] Verify UI rendering
- [ ] Test video playback
- [ ] Test remote control navigation
- [ ] Check memory usage
- [ ] Verify Luna service communication

### Documentation
- [ ] Update README with webOS 4.0 requirements
- [ ] Document known issues
- [ ] Update deployment instructions

## Resources

- [Enact 1.x Documentation](https://enactjs.com/docs/1.15.0/)
- [React 15 Documentation](https://reactjs.org/docs/react-component.html)
- [HLS.js 0.12 Documentation](https://github.com/video-dev/hls.js/tree/v0.12.4)
- [webOS TV 4.0 Developer Guide](https://webostv.developer.lge.com/)

## Support

For questions or issues during migration:
- Enact Slack: https://enactjs.slack.com
- webOS Developer Forum: https://forum.webostv.developer.lge.com/
- GitHub Issues: Create issue in project repository
