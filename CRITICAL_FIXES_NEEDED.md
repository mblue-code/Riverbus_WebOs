# Critical Fixes Needed - Root Cause Analysis

Based on the log file analysis, here are the three critical issues and their fixes:

## Problem 1: Virtual Keyboard Not Working

**Root Cause**:
```
hasKeyboardApi: true
supportsKeyboardApi: false
```

The `window.webOS.keyboard` object EXISTS, but `webOS.keyboard.show` is NOT a function. This means webOSTV.js loaded, but the keyboard API is incomplete or different than expected.

**Fix**:
The TV might be using an older keyboard API. We need to:
1. Check if `webOS.keyboard` is a constructor that needs instantiation
2. Or use the `isManualKeyboardEnabled()` approach
3. Add fallback to native HTML input focus (let the TV handle it automatically)

**Code Fix in scripts/main.js line 464**:
```javascript
// Instead of checking if show is a function, try instantiating or using different API
const supportsKeyboardApi = !!(keyboardApi);  // Just check if exists
```

And update the `showFor` function to handle different API structures.

## Problem 2: Navigation Stuck in Login Group

**Root Cause**:
The log shows focus NEVER switches from `'login'` group to `'login-buttons'` group. All navigation stays in `currentGroup: 'login'`.

Looking at lines 1418-1432 in scripts/main.js:
- The DOWN key handler calls `FocusManager.move('down')`
- If that returns `false`, it SHOULD switch to `login-buttons`
- But it's not working

**Likely Issue**:
The `login` group has a type of `'list'`, and line 297-303 shows list navigation uses BOTH `down` AND `right` for moving forward. This means pressing RIGHT from password field moves within the list instead of triggering the transition logic.

**Fix**: Change login group type from `'list'` to `'column'` or handle the group transition before calling `move()`.

## Problem 3: Login Still Sending Captcha Token

**Root Cause**:
Line 1635 in scripts/main.js:
```javascript
continueLogin(turnstileDisabled ? null : turnstileToken);
```

When `turnstileDisabled` is `true`, this passes `null` correctly.
But when coming from line 1587-1633, it can still execute Turnstile code even though `turnstileDisabled` is true, because `turnstileToken` might be `undefined` (not `null`).

The API is rejecting because an `undefined` value is being sent as the token parameter.

**Fix**: Force token to explicitly be `null` when disabled:
```javascript
continueLogin(null);  // Always null when turnstileDisabled is true
```

## Recommended Action

Use "Sample Data" mode to bypass login entirely and test the app's other features (video browsing, playback, etc.) while we fix these issues.

The Sample Data button should work with the current navigation if you can reach it with arrow keys.
