# webOS TV Compatibility Guide

## Overview

This document explains the webOS platform compatibility requirements for the Floatplane Enact MVP application and the challenges encountered when attempting to run on older LG TV models.

## Current Status

### Supported Platforms

**✅ Working Configuration:**
- webOS 6.0 or later (2021+ LG TVs)
- Enact 4.5.6
- React 18.2.0
- Moonstone theme 4.5.6

**❌ Incompatible Configuration:**
- webOS 4.0 (2018 LG TVs like OLED55C8LLA)
- Symptom: Black/dark screen, app fails to load
- Root cause: Enact 4.5.6 requires webOS 6.0+

## webOS Version History

### LG webOS TV Platform Versions

| webOS Version | Release Year | LG TV Models | Supported Enact Version |
|---------------|--------------|--------------|-------------------------|
| webOS 3.x     | 2016-2017    | C6, E6, G6 series | Enact 1.x |
| webOS 4.0     | 2018         | C8, E8, SK series | Enact 1.13 |
| webOS 4.5     | 2019         | C9, E9, SM series | Enact 1.x (last Enyo support) |
| webOS 5.0     | 2020         | CX, GX, BX series | Enact 2.x - 3.x |
| webOS 6.0     | 2021         | C1, G1, A1 series | Enact 4.x |
| webOS 22      | 2022         | C2, G2, B2 series | Enact 4.x |
| webOS 23      | 2023         | C3, G3, B3 series | Enact 4.x |

### Framework Evolution

**Enyo Framework (Deprecated)**
- Legacy framework used before 2019
- Last supported on webOS 4.5 (2019)
- No longer maintained or supported by LG

**Enact Framework**
- Modern React-based framework
- Multiple major versions with breaking changes
- Not backward compatible across major versions

## Compatibility Table

### Official LG Enact Version Support

According to [LG webOS TV Developer Documentation](https://webostv.developer.lge.com/develop/guides/enyo-enact-guide):

| webOS TV Version | Platform Year | Enact Version | React Version |
|------------------|---------------|---------------|---------------|
| 3.x              | 2016-2017     | 1.x           | 15.x          |
| 4.0              | 2018          | 1.13          | 15.x          |
| 4.5              | 2019          | 1.x           | 15.x          |
| 5.0              | 2020          | 2.x - 3.x     | 16.x          |
| 6.0+             | 2021+         | 4.x           | 18.x          |

**Important Note:** Enyo framework is not supported on webOS TV released in 2019 (webOS TV 4.5) and later.

## Problem Description

### Testing Results

**Device: LG OLED55C8LLA (2018 Model)**
- Model: OLED55C8LLA (C8 series)
- webOS Version: 4.0
- IP: 192.168.1.47
- Result: Black screen, application fails to render

**Device: LG TV (2021+ Model)**
- webOS Version: 6.0 or later
- IP: 192.168.1.214
- Result: ✅ Application works correctly, encrypted video playback functional

### Root Cause Analysis

The Floatplane Enact MVP was developed using:
```json
{
  "@enact/core": "^4.5.6",
  "@enact/moonstone": "^4.5.6",
  "@enact/webos": "^4.5.6",
  "react": "^18.2.0",
  "react-dom": "^18.2.0"
}
```

**Why It Fails on webOS 4.0:**

1. **JavaScript Engine Limitations**
   - webOS 4.0 uses an older Chromium version (53-63)
   - Limited ES6+ feature support
   - React 18 requires modern JavaScript features not available

2. **Enact API Changes**
   - Enact 4.x uses completely different component APIs than 1.x
   - Component lifecycle methods changed significantly
   - Theme structure (Moonstone 4.x vs 1.x) is incompatible

3. **Build Target Mismatch**
   - Enact CLI 5.0 transpiles for modern browsers
   - Output assumes ES6+ support in runtime
   - Polyfills included don't cover all gaps for webOS 4.0

4. **React Version Requirements**
   - React 18 requires specific browser capabilities
   - Concurrent features need modern JavaScript engine
   - Event system changes incompatible with older browsers

## Migration Options

### Option 1: Continue with Modern Stack (Recommended)

**Target:** webOS 6.0+ (2021+ TVs)

**Pros:**
- Already implemented and working
- Modern development experience
- Access to latest features
- Better performance
- Active community support

**Cons:**
- Limited to newer TVs (2021+)
- Cannot support 2018-2020 models
- Smaller potential audience

**Action:** Document minimum requirements clearly

### Option 2: Downgrade to Enact 1.13

**Target:** webOS 4.0+ (2018+ TVs)

**Complexity:** High - Major refactoring required

**Required Changes:**

1. **Dependencies Downgrade**
   ```json
   {
     "@enact/core": "~1.13.0",
     "@enact/moonstone": "~1.13.0",
     "@enact/webos": "~1.13.0",
     "@enact/cli": "~1.2.0",
     "react": "~15.6.2",
     "react-dom": "~15.6.2"
   }
   ```

2. **Component API Changes**
   - Remove React hooks (not available in React 15)
   - Convert to class components
   - Update lifecycle methods
   - Remove context API usage

3. **Moonstone Theme Differences**
   - Component props changed between versions
   - Styling approach different
   - Layout system changes

4. **Build Configuration**
   - Update Enact CLI configuration
   - Adjust transpilation targets
   - Configure polyfills for ES5

**Estimated Effort:** 2-4 weeks full-time development

### Option 3: Create Legacy Branch

**Target:** Maintain two versions

**Pros:**
- Support both old and new TVs
- Don't lose existing work
- Can evolve separately

**Cons:**
- Double maintenance burden
- Feature parity challenges
- Testing complexity

**Recommendation:** Only if significant user base on 2018-2020 TVs

### Option 4: Plain HTML5/JavaScript App

**Target:** Maximum compatibility (webOS 3.0+)

**Approach:**
- No framework dependencies
- Vanilla JavaScript
- Basic CSS styling
- Direct Luna Service integration

**Pros:**
- Works on all webOS versions
- Smaller bundle size
- Simpler debugging

**Cons:**
- Significantly more development work
- Manual state management
- No component reusability
- Primitive UI compared to Enact

## Recommendation

**For MVP/Prototype:** Continue with Enact 4.x targeting webOS 6.0+
- Fastest path to functional app
- Best development experience
- Focus on core features first

**For Production Release:** Consider target audience
- If targeting general consumers with newer TVs (2021+): Keep Enact 4.x
- If supporting hotels/commercial with older hardware: Need legacy support
- If maximizing reach: Create plain JavaScript version for older TVs

## Testing Strategy

### Minimum Test Matrix

| webOS Version | Model Example | Test Priority |
|---------------|---------------|---------------|
| 6.0 (2021)    | C1 series     | ✅ Critical   |
| 22 (2022)     | C2 series     | ✅ Critical   |
| 23 (2023)     | C3 series     | ✅ Critical   |
| 5.0 (2020)    | CX series     | ⚠️ Optional   |
| 4.0 (2018)    | C8 series     | ❌ Unsupported |

### Testing Checklist

- [ ] Application launches and renders UI
- [ ] Login flow completes successfully
- [ ] Video playback (unencrypted)
- [ ] Video playback (encrypted/HLS)
- [ ] Navigation with remote control
- [ ] Luna service communication
- [ ] Memory usage acceptable
- [ ] Performance metrics acceptable

## Technical Debt

### Current Implementation Gaps

1. **No Version Detection**
   - App doesn't detect webOS version
   - No graceful degradation
   - No user-friendly error message

2. **No Compatibility Warning**
   - Silent failure on incompatible platforms
   - Users see black screen with no explanation

3. **Missing Documentation**
   - Minimum requirements not documented in README
   - Installation guide doesn't mention version requirements

### Suggested Improvements

1. **Add Version Check**
   ```javascript
   import {platform} from '@enact/webos/LS2Request';

   platform.getVersion((version) => {
     if (parseFloat(version) < 6.0) {
       // Show unsupported platform message
     }
   });
   ```

2. **Graceful Degradation**
   - Detect capabilities at runtime
   - Show compatibility warning
   - Provide link to requirements documentation

3. **User Documentation**
   - Update README with minimum requirements
   - Add troubleshooting section
   - Include compatibility matrix

## Resources

### Official Documentation

- [LG webOS TV Developer Portal](https://webostv.developer.lge.com/)
- [Enact Framework Documentation](https://enactjs.com/)
- [Enact GitHub Repository](https://github.com/enactjs/enact)
- [webOS TV Developer Forum](https://forum.webostv.developer.lge.com/)

### Community Resources

- [Enact Samples Repository](https://github.com/enactjs/samples)
- [webOS OSE Documentation](https://www.webosose.org/)

## Version History

- **2025-01-XX**: Initial documentation
  - Discovered incompatibility with webOS 4.0
  - Documented testing results on OLED55C8LLA
  - Created migration guide

## Contributors

- Identified by: Testing on LG OLED55C8LLA (webOS 4.0)
- Documented by: Claude Code
- Verified with: LG webOS TV Developer Documentation
