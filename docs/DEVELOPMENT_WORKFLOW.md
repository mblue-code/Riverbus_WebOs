# Development Workflow Guide

Complete guide for developing, testing, and debugging webOS TV applications on both your 2018 (webOS 4.0) and 2024 (webOS 24) TVs.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Development Cycle](#development-cycle)
3. [Testing on Both TVs](#testing-on-both-tvs)
4. [Debugging](#debugging)
5. [Common Commands](#common-commands)
6. [Troubleshooting](#troubleshooting)

## Initial Setup

### 1. Install Development Tools

```bash
# Install webOS TV CLI globally
npm install -g @webosose/ares-cli

# Verify installation
ares --version

# Check available commands
ares --help
```

### 2. Enable Developer Mode on Your TVs

**On both your 2018 and 2024 LG TVs:**

1. Download "Developer Mode" app from LG Content Store
2. Launch the app
3. Turn on "Dev Mode Status"
4. Note the displayed Key Server and Device Info
5. Note the IP address shown (e.g., 192.168.1.100)

**Important:** Developer Mode sessions expire after 50 hours. Extend before expiration to avoid re-setup.

### 3. Configure Target Devices

```bash
# Interactive setup for 2018 TV
ares-setup-device

# When prompted:
name: tv2018
host: [Your 2018 TV IP]
port: 9922
username: prisoner
password: [leave blank, press Enter]
description: 2018 LG TV webOS 4.0

# Repeat for 2024 TV
ares-setup-device

# When prompted:
name: tv2024
host: [Your 2024 TV IP]
port: 9922
username: prisoner
password: [leave blank, press Enter]
description: 2024 LG TV webOS 24
```

**Verify devices:**

```bash
ares-setup-device --list
```

Output should show:
```
name         deviceinfo               connection    profile
-----------  -----------------------  ------------  -------
tv2018       prisoner@192.168.1.100   ssh           tv
tv2024       prisoner@192.168.1.101   ssh           tv
```

### 4. Test Device Connection

```bash
# List apps on 2018 TV
ares-install --device tv2018 --list

# List apps on 2024 TV
ares-install --device tv2024 --list
```

If this works, you're ready to develop!

## Development Cycle

### Standard Development Loop

```bash
# 1. Edit your code (HTML/CSS/JS)

# 2. Package the app (development mode with no minification)
ares-package . --outdir ./dist --no-minify

# 3. Install on 2018 TV
ares-install --device tv2018 ./dist/*.ipk

# 4. Launch the app
ares-launch --device tv2018 com.yourdomain.yourapp

# 5. Open DevTools for debugging
ares-inspect --device tv2018 --app com.yourdomain.yourapp --open
```

**Pro tip:** Use the `--no-minify` flag during development to make debugging easier.

### Quick Iteration Script

Create a `dev.sh` script in your project root:

```bash
#!/bin/bash
# dev.sh - Quick development iteration script

APP_ID="com.yourdomain.yourapp"
DEVICE="tv2018"  # Change to tv2024 to test on 2024 TV

echo "📦 Packaging app..."
ares-package . --outdir ./dist --no-minify

if [ $? -eq 0 ]; then
    echo "📲 Installing on $DEVICE..."
    ares-install --device $DEVICE ./dist/*.ipk

    if [ $? -eq 0 ]; then
        echo "🚀 Launching app..."
        ares-launch --device $DEVICE $APP_ID

        echo "🔍 Opening inspector..."
        ares-inspect --device $DEVICE --app $APP_ID --open
    fi
else
    echo "❌ Packaging failed!"
fi
```

Make it executable and use it:

```bash
chmod +x dev.sh
./dev.sh
```

### Fast Reload During Development

For quick CSS/HTML changes:

```bash
# One-liner: package, install, and launch
ares-package . --outdir ./dist --no-minify && \
ares-install --device tv2018 ./dist/*.ipk && \
ares-launch --device tv2018 com.yourdomain.yourapp
```

## Testing on Both TVs

### Sequential Testing Workflow

**Step 1: Test on 2018 TV (webOS 4.0) first**

```bash
# Package
ares-package . --outdir ./dist --no-minify

# Install and launch on 2018 TV
ares-install --device tv2018 ./dist/*.ipk
ares-launch --device tv2018 com.yourdomain.yourapp

# Test with remote control:
# - Navigate with arrow keys
# - Press OK to select
# - Press BACK to exit
# - Check console for errors
ares-inspect --device tv2018 --app com.yourdomain.yourapp --open
```

**Step 2: Verify on 2024 TV (webOS 24)**

```bash
# Install same IPK on 2024 TV
ares-install --device tv2024 ./dist/*.ipk
ares-launch --device tv2024 com.yourdomain.yourapp

# Verify everything works
ares-inspect --device tv2024 --app com.yourdomain.yourapp --open
```

### Testing Checklist

For each TV, verify:

- [ ] App launches without errors
- [ ] Navigation works (UP/DOWN/LEFT/RIGHT)
- [ ] OK button selects items
- [ ] Visual selection effects are visible
- [ ] BACK button exits to TV Home
- [ ] No JavaScript errors in console
- [ ] No CSS rendering issues
- [ ] Performance is acceptable
- [ ] All features work as expected

### Automated Testing Script

Create `test-both.sh`:

```bash
#!/bin/bash
# test-both.sh - Test on both TVs

APP_ID="com.yourdomain.yourapp"

echo "📦 Packaging app..."
ares-package . --outdir ./dist --no-minify

if [ $? -ne 0 ]; then
    echo "❌ Packaging failed!"
    exit 1
fi

echo ""
echo "========================================="
echo "Testing on 2018 TV (webOS 4.0)"
echo "========================================="
ares-install --device tv2018 ./dist/*.ipk
ares-launch --device tv2018 $APP_ID
echo "✅ Launched on 2018 TV - Please test manually"

echo ""
read -p "Press Enter when done testing on 2018 TV..."

echo ""
echo "========================================="
echo "Testing on 2024 TV (webOS 24)"
echo "========================================="
ares-install --device tv2024 ./dist/*.ipk
ares-launch --device tv2024 $APP_ID
echo "✅ Launched on 2024 TV - Please test manually"

echo ""
read -p "Press Enter when done testing on 2024 TV..."

echo ""
echo "✅ Testing complete on both TVs!"
```

```bash
chmod +x test-both.sh
./test-both.sh
```

## Debugging

### Opening Chrome DevTools

```bash
# For 2018 TV
ares-inspect --device tv2018 --app com.yourdomain.yourapp --open

# For 2024 TV
ares-inspect --device tv2024 --app com.yourdomain.yourapp --open
```

This opens Chrome DevTools in your default browser, connected to the running app on the TV.

### DevTools Features

**Console Tab:**
- View `console.log()` output
- Check for errors and warnings
- Execute JavaScript commands

**Elements Tab:**
- Inspect HTML structure
- View and modify CSS in real-time
- See computed styles

**Sources Tab:**
- View source files
- Set breakpoints
- Step through code execution

**Network Tab:**
- Monitor network requests
- Check loading times
- Debug API calls

**Performance Tab:**
- Profile app performance
- Identify bottlenecks
- Optimize rendering

### Adding Debug Logging

Add this to your `scripts/main.js`:

```javascript
// Debug helper
var DEBUG = true;

function debug(message, data) {
  if (DEBUG) {
    console.log('[DEBUG]', message, data || '');
  }
}

// Usage
debug('App initialized');
debug('User selected item:', currentIndex);
debug('Navigation event:', { key: keyCode, direction: 'up' });
```

### Remote Logging

For issues that only occur without DevTools open:

```javascript
// Log to on-screen div
function logToScreen(message) {
  var logDiv = document.getElementById('debug-log');
  if (!logDiv) {
    logDiv = document.createElement('div');
    logDiv.id = 'debug-log';
    logDiv.style.position = 'fixed';
    logDiv.style.top = '10px';
    logDiv.style.right = '10px';
    logDiv.style.background = 'rgba(0,0,0,0.8)';
    logDiv.style.color = '#0f0';
    logDiv.style.padding = '10px';
    logDiv.style.fontSize = '16px';
    logDiv.style.maxWidth = '400px';
    logDiv.style.maxHeight = '300px';
    logDiv.style.overflow = 'auto';
    logDiv.style.fontFamily = 'monospace';
    logDiv.style.zIndex = '9999';
    document.body.appendChild(logDiv);
  }

  var time = new Date().toLocaleTimeString();
  logDiv.innerHTML += '<div>' + time + ': ' + message + '</div>';
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Usage
logToScreen('App started');
logToScreen('Key pressed: ' + event.keyCode);
```

### Performance Debugging

Check frame rate and performance:

```javascript
// FPS counter
var fps = {
  startTime: 0,
  frameCount: 0,

  init: function() {
    this.startTime = Date.now();
    this.loop();
  },

  loop: function() {
    this.frameCount++;
    var currentTime = Date.now();

    if (currentTime > this.startTime + 1000) {
      console.log('FPS:', this.frameCount);
      logToScreen('FPS: ' + this.frameCount);
      this.frameCount = 0;
      this.startTime = Date.now();
    }

    requestAnimationFrame(this.loop.bind(this));
  }
};

// Start FPS monitoring
fps.init();
```

## Common Commands

### Package Commands

```bash
# Package with minification (for production)
ares-package . --outdir ./dist

# Package without minification (for development)
ares-package . --outdir ./dist --no-minify

# Package specific directory
ares-package ./src --outdir ./dist

# Check ROM space
ares-package . --outdir ./dist --check
```

### Device Management

```bash
# List configured devices
ares-setup-device --list

# Add new device
ares-setup-device --add

# Modify existing device
ares-setup-device --modify tv2018

# Remove device
ares-setup-device --remove tv2018

# Reset device configuration
ares-setup-device --reset
```

### Installation Commands

```bash
# Install app
ares-install --device tv2018 ./dist/*.ipk

# List installed apps
ares-install --device tv2018 --list

# Remove app
ares-install --device tv2018 --remove com.yourdomain.yourapp

# Reinstall (remove + install)
ares-install --device tv2018 --remove com.yourdomain.yourapp
ares-install --device tv2018 ./dist/*.ipk
```

### Launch Commands

```bash
# Launch app
ares-launch --device tv2018 com.yourdomain.yourapp

# Launch with parameters
ares-launch --device tv2018 com.yourdomain.yourapp --params "{'key':'value'}"

# Close running app
ares-launch --device tv2018 --close com.yourdomain.yourapp

# List running apps
ares-launch --device tv2018 --running
```

### Inspect Commands

```bash
# Open inspector
ares-inspect --device tv2018 --app com.yourdomain.yourapp --open

# List inspectable apps
ares-inspect --device tv2018 --list

# View app info
ares-inspect --device tv2018 --app com.yourdomain.yourapp
```

## Troubleshooting

### Issue: "Cannot connect to device"

**Solution:**

```bash
# Check device is on and Developer Mode is running
# Verify IP address hasn't changed
ares-setup-device --modify tv2018

# Test connection
ping [TV_IP_ADDRESS]

# Reconfigure if needed
ares-setup-device --remove tv2018
ares-setup-device --add
```

### Issue: "Developer Mode session expired"

**Solution:**

1. Open Developer Mode app on TV
2. Press "Extend" or "Refresh"
3. Session renewed for another 50 hours

### Issue: "App won't launch"

**Solution:**

```bash
# Check app is installed
ares-install --device tv2018 --list

# Check for running instances
ares-launch --device tv2018 --running

# Close and relaunch
ares-launch --device tv2018 --close com.yourdomain.yourapp
ares-launch --device tv2018 com.yourdomain.yourapp

# If still failing, reinstall
ares-install --device tv2018 --remove com.yourdomain.yourapp
ares-install --device tv2018 ./dist/*.ipk
ares-launch --device tv2018 com.yourdomain.yourapp
```

### Issue: "Inspector won't open"

**Solution:**

```bash
# Check app is running
ares-launch --device tv2018 --running

# List inspectable apps
ares-inspect --device tv2018 --list

# Try opening with explicit browser
ares-inspect --device tv2018 --app com.yourdomain.yourapp --open

# Check firewall isn't blocking connection
```

### Issue: "Changes not appearing"

**Solution:**

```bash
# Make sure you're packaging after changes
ares-package . --outdir ./dist --no-minify

# Reinstall (sometimes install alone caches old version)
ares-install --device tv2018 --remove com.yourdomain.yourapp
ares-install --device tv2018 ./dist/*.ipk

# Clear browser cache in DevTools
# Chrome DevTools → Application → Clear Storage
```

### Issue: "TV IP address changed"

**Solution:**

```bash
# Update device configuration
ares-setup-device --modify tv2018

# When prompted, enter new IP address

# Or set static IP on your TV:
# TV Settings → Network → Wi-Fi Connection → Advanced → Manual IP
```

### Issue: "Port 9922 connection refused"

**Solution:**

1. Check Developer Mode app is running on TV
2. Verify "Dev Mode Status" is ON
3. Check firewall on development machine
4. Try closing and reopening Developer Mode app

## Best Practices

1. **Always use `--no-minify` during development** - Makes debugging much easier

2. **Test on webOS 4.0 first** - If it works there, it works on webOS 24

3. **Keep Developer Mode sessions active** - Extend before expiration

4. **Use version control** - Commit working versions

5. **Keep DevTools open during testing** - Catch errors immediately

6. **Test on both TVs before major milestones** - Don't wait until the end

7. **Use static IP for TVs** - Prevents connection issues

8. **Create shell scripts for repetitive tasks** - Saves time

## Next Steps

- Review [COMPATIBILITY.md](./COMPATIBILITY.md) for cross-version compatibility
- Check [PUBLISHING.md](./PUBLISHING.md) for LG Content Store submission
- Read [LG webOS TV Developer Portal](https://webostv.developer.lge.com/)

## Resources

- [webOS TV CLI Documentation](https://www.webosose.org/docs/tools/sdk/cli/)
- [Chrome DevTools Guide](https://developer.chrome.com/docs/devtools/)
- [LG Developer Forums](https://forum.developer.lge.com/)
