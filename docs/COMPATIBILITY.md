# webOS Compatibility Guide: webOS 4.0 (2018) vs webOS 24 (2024)

## Overview

This guide explains how to build webOS TV apps that work seamlessly across both your 2018 TV (webOS 4.0) and 2024 TV (webOS 24), along with all versions in between.

## Platform Comparison

| Feature | webOS 4.0 (2018) | webOS 24 (2024) |
|---------|------------------|-----------------|
| **Web Engine** | Chromium Blink | Chromium Blink |
| **Chrome Version** | 79 | 120 |
| **JavaScript Engine** | V8 | V8 (newer) |
| **ES6 Support** | ✅ Yes | ✅ Yes |
| **Flexbox** | ✅ Yes | ✅ Yes |
| **CSS Grid** | ✅ Yes | ✅ Yes |
| **WebGL** | ✅ Yes | ✅ Yes |
| **Developer Mode** | ✅ Yes | ✅ Yes |
| **CLI Tools** | ✅ Supported | ✅ Supported |

## Key Differences

### 1. Chrome/V8 Version Gap

The main difference is the Chrome version:
- **webOS 4.0**: Chrome 79 (released Dec 2019)
- **webOS 24**: Chrome 120 (released Nov 2023)

This 41-version gap means some newer web APIs may not be available on the 2018 TV.

### 2. Debug Settings (webOS 4.0)

webOS 4.0 introduced encryption for some debug settings. This doesn't affect normal app development but may impact advanced debugging scenarios.

### 3. Performance Characteristics

The 2024 TV has:
- Faster JavaScript execution
- Better CSS animation performance
- More efficient memory management
- Improved WebGL performance

However, apps should still be optimized for the 2018 TV's capabilities.

## Backward Compatibility Best Practices

### 1. Event Handler Pattern

**Always use `addEventListener()`** instead of direct property assignment.

```javascript
// ✅ CORRECT - Works on all webOS versions
var element = document.getElementById('myButton');
element.addEventListener('click', function(event) {
  console.log('Button clicked');
});

// ❌ WRONG - May fail on older versions
element.onclick = function(event) {
  console.log('Button clicked');
};
```

**Video element example:**

```javascript
// ✅ CORRECT
var video = document.getElementById('myVideo');
video.addEventListener('loadeddata', function(event) {
  console.log('Video loaded');
});

// ❌ WRONG
video.onloadeddata = function(event) {
  console.log('Video loaded');
};
```

### 2. CSS Vendor Prefixes

Include both `-webkit-` prefixed and unprefixed properties.

**Flexbox:**

```css
.container {
  display: -webkit-flex;
  display: flex;
  -webkit-flex-direction: row;
  flex-direction: row;
  -webkit-justify-content: center;
  justify-content: center;
  -webkit-align-items: center;
  align-items: center;
}
```

**Animations:**

```css
.animated-element {
  -webkit-animation-duration: 4s;
  animation-duration: 4s;
  -webkit-animation-name: slideIn;
  animation-name: slideIn;
  -webkit-animation-timing-function: ease-in-out;
  animation-timing-function: ease-in-out;
}

@-webkit-keyframes slideIn {
  from {
    -webkit-transform: translateX(-100%);
    transform: translateX(-100%);
  }
  to {
    -webkit-transform: translateX(0);
    transform: translateX(0);
  }
}

@keyframes slideIn {
  from {
    -webkit-transform: translateX(-100%);
    transform: translateX(0);
  }
  to {
    -webkit-transform: translateX(0);
    transform: translateX(0);
  }
}
```

**Transforms:**

```css
.scaled-element {
  -webkit-transform: scale(1.2) rotate(45deg);
  transform: scale(1.2) rotate(45deg);
  -webkit-transform-origin: center;
  transform-origin: center;
}
```

**Transitions:**

```css
.transition-element {
  -webkit-transition: all 0.3s ease;
  transition: all 0.3s ease;
}
```

### 3. Feature Detection (Not Browser Detection)

Use feature detection to check if APIs/features are available.

```javascript
// ✅ CORRECT - Feature detection
function initApp() {
  // Check for Flexbox support
  if (CSS.supports('display', 'flex')) {
    console.log('Flexbox supported');
    // Use flexbox layout
  } else {
    console.log('Flexbox not supported');
    // Use fallback layout
  }

  // Check for Grid support
  if (CSS.supports('display', 'grid')) {
    console.log('Grid supported');
  }

  // Check for specific API
  if ('IntersectionObserver' in window) {
    // Use IntersectionObserver
  } else {
    // Use fallback (e.g., scroll events)
  }
}

// ❌ WRONG - Browser detection
if (navigator.userAgent.includes('webOS')) {
  // Don't do this
}
```

### 4. JavaScript ES6+ Features

Most ES6 features are safe to use on both platforms:

**Safe to use:**
- `let` and `const`
- Arrow functions
- Template literals
- Destructuring
- Default parameters
- Rest/spread operators
- Promises
- `Array.map()`, `Array.filter()`, etc.
- Classes

```javascript
// ✅ All of this works on both TVs
const app = {
  name: 'My App',
  version: '1.0.0',

  init: () => {
    const { name, version } = app;
    console.log(`Starting ${name} v${version}`);

    const items = [1, 2, 3, 4, 5];
    const doubled = items.map(x => x * 2);

    Promise.resolve()
      .then(() => console.log('App initialized'))
      .catch(err => console.error(err));
  }
};
```

**Use with caution (may need polyfills for webOS 4.0):**
- `async`/`await` - Works but test thoroughly
- Optional chaining (`?.`) - Not available in Chrome 79
- Nullish coalescing (`??`) - Not available in Chrome 79
- `Promise.allSettled()` - Not available in Chrome 79

```javascript
// ❌ These won't work on webOS 4.0 (Chrome 79)
const value = obj?.nested?.property;  // Optional chaining
const result = value ?? 'default';     // Nullish coalescing

// ✅ Use traditional approaches instead
const value = obj && obj.nested && obj.nested.property;
const result = (value !== null && value !== undefined) ? value : 'default';
```

### 5. Polyfills Strategy

If you need newer features on webOS 4.0, include polyfills:

```html
<!-- In your index.html -->
<script src="scripts/polyfills.js"></script>
<script src="scripts/main.js"></script>
```

```javascript
// polyfills.js - Example polyfill for Promise.allSettled
if (!Promise.allSettled) {
  Promise.allSettled = function(promises) {
    return Promise.all(
      promises.map(p =>
        Promise.resolve(p)
          .then(value => ({ status: 'fulfilled', value }))
          .catch(reason => ({ status: 'rejected', reason }))
      )
    );
  };
}
```

## Testing Strategy

### 1. Test on Oldest Platform First

Develop and test on your **2018 TV (webOS 4.0) first**. If it works there, it will almost certainly work on the 2024 TV.

```bash
# Development workflow
ares-package . --outdir ./dist --no-minify
ares-install --device tv2018 ./dist/*.ipk
ares-launch --device tv2018 com.yourdomain.yourapp
ares-inspect --device tv2018 --app com.yourdomain.yourapp --open
```

### 2. Verify on Newest Platform

After testing on webOS 4.0, verify on webOS 24 to ensure:
- Performance is acceptable
- New features are utilized (if applicable)
- No regressions introduced

```bash
# Verify on 2024 TV
ares-install --device tv2024 ./dist/*.ipk
ares-launch --device tv2024 com.yourdomain.yourapp
```

### 3. Console Testing Script

Add this to your app for compatibility testing:

```javascript
// Add to scripts/main.js
function runCompatibilityTests() {
  const tests = {
    'ES6 Classes': typeof class {} === 'function',
    'Arrow Functions': (() => true)(),
    'Promises': typeof Promise !== 'undefined',
    'Flexbox': CSS.supports('display', 'flex'),
    'Grid': CSS.supports('display', 'grid'),
    'Transforms': CSS.supports('transform', 'scale(1)'),
    'Animations': CSS.supports('animation', 'test'),
    'IntersectionObserver': 'IntersectionObserver' in window,
    'webOS API': typeof window.webOS !== 'undefined'
  };

  console.log('=== Compatibility Test Results ===');
  Object.keys(tests).forEach(function(test) {
    const status = tests[test] ? '✅' : '❌';
    console.log(status + ' ' + test + ': ' + tests[test]);
  });
}

// Run on app start
runCompatibilityTests();
```

## Common Pitfalls to Avoid

### ❌ Don't assume latest JS features

```javascript
// ❌ Won't work on webOS 4.0
const name = user?.profile?.name ?? 'Guest';

// ✅ Works everywhere
const name = (user && user.profile && user.profile.name) || 'Guest';
```

### ❌ Don't use CSS without vendor prefixes

```css
/* ❌ May not work consistently */
.box {
  display: flex;
  transform: scale(1.1);
}

/* ✅ Works everywhere */
.box {
  display: -webkit-flex;
  display: flex;
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
```

### ❌ Don't use direct event properties

```javascript
// ❌ Unreliable across versions
element.onclick = handler;

// ✅ Reliable
element.addEventListener('click', handler);
```

### ❌ Don't skip testing on both TVs

Always test on both platforms. Something that works on webOS 24 might break on webOS 4.0.

## Quick Compatibility Checklist

Before deployment, verify:

- [ ] All event handlers use `addEventListener()`
- [ ] All CSS animations have vendor prefixes
- [ ] All CSS transforms have vendor prefixes
- [ ] All flexbox properties have vendor prefixes
- [ ] No optional chaining (`?.`) operators
- [ ] No nullish coalescing (`??`) operators
- [ ] Feature detection used (not browser detection)
- [ ] Tested on webOS 4.0 (2018 TV)
- [ ] Tested on webOS 24 (2024 TV)
- [ ] Console shows no errors on either TV
- [ ] Performance acceptable on webOS 4.0

## Browser DevTools Differences

When using `ares-inspect`:

**webOS 4.0 (Chrome 79 DevTools):**
- Older UI design
- Some newer panels may be missing
- Performance tools available

**webOS 24 (Chrome 120 DevTools):**
- Modern UI
- All latest panels available
- Advanced performance profiling

Both support the essential debugging features you need.

## API Compatibility Matrix

| API | webOS 4.0 | webOS 24 | Notes |
|-----|-----------|----------|-------|
| Fetch API | ✅ | ✅ | Fully supported |
| ES6 Modules | ✅ | ✅ | Import/export works |
| localStorage | ✅ | ✅ | Fully supported |
| sessionStorage | ✅ | ✅ | Fully supported |
| Canvas API | ✅ | ✅ | Fully supported |
| WebGL | ✅ | ✅ | Fully supported |
| Web Audio | ✅ | ✅ | Fully supported |
| Geolocation | ❌ | ❌ | Not on TVs |
| Service Workers | ⚠️ | ⚠️ | Limited/not supported |
| WebRTC | ⚠️ | ⚠️ | Limited support |

## Resources

- [LG webOS Backward Compatibility Guide](https://webostv.developer.lge.com/develop/guides/backward-compatibility)
- [Chrome 79 Release Notes](https://chromereleases.googleblog.com/2019/12/stable-channel-update-for-desktop.html)
- [Chrome 120 Release Notes](https://chromereleases.googleblog.com/2023/11/stable-channel-update-for-desktop_28.html)
- [Can I Use (web feature compatibility)](https://caniuse.com/)

## Summary

Building apps for both webOS 4.0 and webOS 24 is straightforward when you:

1. Use `addEventListener()` for all events
2. Include vendor prefixes for all CSS features
3. Avoid cutting-edge JavaScript features (or polyfill them)
4. Test on webOS 4.0 first
5. Use feature detection, not browser detection

Following these guidelines ensures your app works perfectly on both your 2018 and 2024 LG TVs, and every webOS version in between.
