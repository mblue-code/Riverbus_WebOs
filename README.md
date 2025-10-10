# webOS TV App

A cross-compatible webOS TV application that works on both webOS 4.0 (2018 TVs) and webOS 24 (2024 TVs).

## Overview

This is a starter template for developing webOS TV applications that are fully compatible with LG TVs from 2018 onwards. The app follows all LG Content Store certification requirements and implements backward compatibility best practices.

## Target Platforms

- **webOS 4.0** (2018 LG TVs) - Chrome 79
- **webOS 24** (2024 LG TVs) - Chrome 120
- All versions in between

## Features

- Cross-version compatibility (webOS 4.0 to webOS 24)
- 4-way navigation support (UP/DOWN/LEFT/RIGHT)
- Remote control OK button handling
- BACK button support (returns to TV Home)
- Visual selection effects (required for certification)
- Responsive design (supports 1920x1080 and 1280x720)
- CSS vendor prefixes for maximum compatibility
- addEventListener() pattern for cross-version events

## Project Structure

```
webos_app/
├── appinfo.json          # App metadata and configuration
├── index.html            # Main HTML file
├── styles/
│   └── main.css         # Styles with vendor prefixes
├── scripts/
│   └── main.js          # Main JavaScript with compatibility patterns
├── icon.png             # App icon (80x80 - to be added)
├── largeIcon.png        # Large icon (130x130 - to be added)
├── bg.png               # Background image (to be added)
└── splash.png           # Splash screen (to be added)
```

## Prerequisites

Before you begin, ensure you have:

1. **LG Account**: Create at LG Seller Lounge
2. **Developer Mode App**: Installed on both TVs (2018 and 2024)
3. **webOS TV CLI**: Installed on your development machine
4. **Node.js**: Version 14+ (for CLI tools)

## Getting Started

### 1. Install webOS TV CLI

```bash
npm install -g @webosose/ares-cli
```

Verify installation:

```bash
ares --version
```

### 2. Configure Your TVs as Target Devices

First, ensure Developer Mode is running on both TVs and note the IP addresses.

Add your 2018 TV (webOS 4.0):
```bash
ares-setup-device
# Follow prompts:
# - name: tv2018
# - host: [IP of 2018 TV]
# - port: 9922
# - username: prisoner
# - password: (blank)
```

Add your 2024 TV (webOS 24):
```bash
ares-setup-device
# Follow prompts:
# - name: tv2024
# - host: [IP of 2024 TV]
# - port: 9922
# - username: prisoner
# - password: (blank)
```

List configured devices:
```bash
ares-setup-device --list
```

### 3. Customize the App

Edit `appinfo.json` to customize your app:

```json
{
  "id": "com.yourdomain.yourapp",
  "version": "1.0.0",
  "vendor": "Your Company Name",
  "title": "Your App Name"
}
```

### 4. Build and Package

Package the app:
```bash
ares-package . --outdir ./dist
```

For development (no minification):
```bash
ares-package . --outdir ./dist --no-minify
```

### 5. Install on TVs

Install on 2018 TV:
```bash
ares-install --device tv2018 ./dist/*.ipk
```

Install on 2024 TV:
```bash
ares-install --device tv2024 ./dist/*.ipk
```

### 6. Launch the App

On 2018 TV:
```bash
ares-launch --device tv2018 com.yourdomain.yourapp
```

On 2024 TV:
```bash
ares-launch --device tv2024 com.yourdomain.yourapp
```

### 7. Debug

Inspect on 2018 TV:
```bash
ares-inspect --device tv2018 --app com.yourdomain.yourapp --open
```

Inspect on 2024 TV:
```bash
ares-inspect --device tv2024 --app com.yourdomain.yourapp --open
```

This opens Chrome DevTools for debugging.

## Development Workflow

1. **Edit Code**: Make changes to HTML, CSS, or JavaScript
2. **Package**: `ares-package . --outdir ./dist --no-minify`
3. **Install**: `ares-install --device tv2018 ./dist/*.ipk`
4. **Launch**: `ares-launch --device tv2018 com.yourdomain.yourapp`
5. **Debug**: `ares-inspect --device tv2018 --app com.yourdomain.yourapp --open`
6. **Test**: Test on both TVs to ensure compatibility

## Key Compatibility Considerations

### Event Handlers

Always use `addEventListener()`, not direct assignment:

```javascript
// ✅ CORRECT - Works on all versions
element.addEventListener('click', handleClick);

// ❌ WRONG - May not work on older versions
element.onclick = handleClick;
```

### CSS Vendor Prefixes

Include both prefixed and unprefixed properties:

```css
.item {
  display: -webkit-flex;
  display: flex;
  -webkit-transform: scale(1.05);
  transform: scale(1.05);
}
```

### Feature Detection

Use feature detection, not browser detection:

```javascript
if (CSS.supports('display', 'grid')) {
  // Use grid layout
} else {
  // Use fallback
}
```

## LG Content Store Certification Requirements

### Must-Have Features

- ✅ All navigation keys must work (UP/DOWN/LEFT/RIGHT)
- ✅ Selectable UIs controlled by 4-way navigation + OK button
- ✅ BACK button on entry page shows TV Home screen
- ✅ All objects provide visual selection effects
- ✅ Screen resolution: 1280x720 or 1920x1080

### Testing Checklist

Test on BOTH TVs:
- [ ] App launches successfully
- [ ] Navigation works with remote control
- [ ] OK button selects items
- [ ] Selection effects are visible
- [ ] BACK button returns to TV Home
- [ ] No JavaScript errors in console
- [ ] Layout looks correct at 1920x1080
- [ ] Layout looks correct at 1280x720 (if supported)

## Required Assets for Submission

Before submitting to LG Content Store, you'll need:

1. **IPK File**: Generated by `ares-package`
2. **Images**:
   - App icon (80x80 PNG)
   - Large icon (130x130 PNG)
   - Background image (specified resolution)
   - Promotional images (70% of rejections are due to wrong images!)
3. **UX Scenario**: Document describing how app works
4. **Self-Checklist**: Download from LG Developer site and complete

## Resources

- [webOS TV Developer Portal](https://webostv.developer.lge.com/)
- [Backward Compatibility Guidelines](https://webostv.developer.lge.com/develop/guides/backward-compatibility)
- [App Self Checklist](https://webostv.developer.lge.com/distribute/app-certification/app-self-checklist)
- [LG Seller Lounge](https://seller.lgappstv.com/)

## Troubleshooting

### Developer Mode Session Expired

Extend the session in the Developer Mode app on your TV before it expires.

### Connection Issues

```bash
# Check device is reachable
ares-setup-device --list

# Reconnect
ares-setup-device --modify tv2018
```

### App Won't Launch

```bash
# Check installed apps
ares-install --device tv2018 --list

# Remove and reinstall
ares-install --device tv2018 --remove com.yourdomain.yourapp
ares-install --device tv2018 ./dist/*.ipk
```

## Next Steps

1. Customize the app for your use case
2. Add your own content and features
3. Create required image assets
4. Test thoroughly on both TVs
5. Complete the self-checklist
6. Submit to LG Content Store

## License

[Your License Here]

## Support

For issues and questions:
- LG Developer Forums: https://forum.developer.lge.com/
- webOS TV Slack Community
