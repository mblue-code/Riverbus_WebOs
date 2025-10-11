# webOS Luna Services and Enact Development Guide

Complete guide for developing webOS TV applications using Enact framework and Luna Services (LS2).

## Table of Contents

1. [Introduction](#introduction)
2. [Luna Service (LS2) Overview](#luna-service-ls2-overview)
3. [Enact Framework Overview](#enact-framework-overview)
4. [Project Structure](#project-structure)
5. [Developing JavaScript Luna Services](#developing-javascript-luna-services)
6. [Calling Luna Services from Enact Apps](#calling-luna-services-from-enact-apps)
7. [Configuration Files](#configuration-files)
8. [Building and Packaging](#building-and-packaging)
9. [Deployment with ares-* CLI Tools](#deployment-with-ares-cli-tools)
10. [Debugging and Testing](#debugging-and-testing)
11. [Common Issues and Solutions](#common-issues-and-solutions)
12. [Best Practices](#best-practices)
13. [Resources](#resources)

---

## Introduction

webOS TV applications can be built using the **Enact framework** (a React-based UI library) and **Luna Services** (webOS's inter-process communication system). This guide covers end-to-end development, from creating services to deploying apps on LG webOS TVs.

### What You'll Learn

- How to create JavaScript Luna Services for webOS
- How to build Enact-based UI applications
- How to integrate Luna Services with Enact apps using LS2Request
- How to package and deploy apps to webOS TV devices
- How to debug and troubleshoot common issues

---

## Luna Service (LS2) Overview

### What is Luna Service?

**Luna Service 2 (LS2)** is webOS's bus-based IPC (Inter-Process Communication) mechanism that allows components to communicate with each other. It provides a JSON-based API for accessing webOS platform features.

### Key Concepts

#### 1. Service URI
A unique address for platform services:
```
luna://<service name>
```
Example: `luna://com.webos.service.systemservice`

#### 2. Method
Specific functions provided by a service, categorized by feature:
```
luna://com.webos.service.systemservice/time/getSystemTime
```

#### 3. Parameters
JSON object with request options:
```json
{
  "subscribe": true,
  "timeout": 5000
}
```

Reserved properties:
- `subscribe`: Set to `true` to receive periodic updates
- Can include method-specific parameters

#### 4. Call Response
JSON object indicating the result:
```json
{
  "returnValue": true,
  "data": { ... }
}
```
- `returnValue: true` = Success
- `returnValue: false` = Failure (includes `errorText` and `errorCode`)

### LS2 API Usage

#### Basic Method Call (Command Line)
```bash
luna-send -n 1 -f luna://com.webos.service.systemservice/time/getSystemTime '{}'
```

#### Subscribing for Notifications
```bash
luna-send -i -f luna://com.webos.service.systemservice/time/getSystemTime '{"subscribe": true}'
```

### Security: Access Control Groups (ACG)

Luna Services use Access Control Groups to manage permissions. Each method has an ACG value that determines which apps can call it.

To find ACG values:
- Check LS2 API Reference documentation
- Each method shows its required ACG
- Add required ACGs to `requiredPermissions` in `appinfo.json`

---

## Enact Framework Overview

### What is Enact?

**Enact** is a React-based framework optimized for building TV applications on webOS and other embedded platforms. It provides:

- **Moonstone UI Library**: 50+ TV-optimized components
- **Sandstone UI Library**: Modern TV-centric UI components
- **D-pad Navigation**: Built-in remote control navigation
- **Localization**: Multi-language support
- **Performance Optimization**: Lightweight and responsive

### Why Use Enact for webOS TV?

1. **React-based**: Familiar syntax for front-end developers
2. **TV-Optimized**: Components designed for large screens and remote navigation
3. **webOS Integration**: Built-in support for Luna Services via `@enact/webos`
4. **Development Tools**: CLI tools for scaffolding, building, and testing

### Key Enact Libraries

#### @enact/core
Core utilities and higher-order components:
```javascript
import kind from '@enact/core/kind';
import {Job} from '@enact/core/util';
```

#### @enact/moonstone
TV UI components (for webOS TV 4.x - 6.x):
```javascript
import Button from '@enact/moonstone/Button';
import Input from '@enact/moonstone/Input';
import Panels from '@enact/moonstone/Panels';
```

#### @enact/sandstone
Modern TV UI components (for webOS TV 6.x+):
```javascript
import Button from '@enact/sandstone/Button';
import Input from '@enact/sandstone/Input';
```

#### @enact/webos
webOS-specific APIs:
```javascript
import LS2Request from '@enact/webos/LS2Request';
import {platformInfo} from '@enact/webos/platform';
```

---

## Project Structure

### Typical Enact + Luna Service App Structure

```
my-webos-app/
├── enact-mvp/                      # Enact UI app
│   ├── src/
│   │   ├── App/
│   │   │   └── App.js              # Main app component
│   │   ├── components/
│   │   │   └── LoginForm.js        # UI components
│   │   ├── index.js                # App entry point
│   │   └── styles/
│   │       └── main.less           # Styles
│   ├── dist/                       # Built app (generated)
│   │   ├── index.html
│   │   ├── main.js
│   │   └── main.css
│   ├── services/                   # Luna Services
│   │   ├── login-service/
│   │   │   ├── login-service.js    # Service implementation
│   │   │   ├── login-service.json  # Service metadata
│   │   │   └── package.json        # Service dependencies
│   │   └── services.json           # Service registry
│   ├── appinfo.json                # App metadata
│   ├── package.json                # Enact app dependencies
│   └── README.md
└── dist/                           # Packaged IPK files
    └── com.example.app_1.0.0_all.ipk
```

---

## Developing JavaScript Luna Services

### Step 1: Create Service Directory

```bash
mkdir -p services/my-service
cd services/my-service
```

### Step 2: Create Service Implementation

**File: `services/my-service/my-service.js`**

```javascript
const Service = require('webos-service');

// Service ID must be a subdomain of your app ID
// If app ID is com.example.myapp, service should be com.example.myapp.myservice
const service = new Service('com.example.myapp.myservice');

// Register a method
service.register('hello', (message) => {
  const name = message.payload.name || 'World';

  message.respond({
    returnValue: true,
    message: `Hello, ${name}!`
  });
});

// Register a method with parameters
service.register('getData', async (message) => {
  const {id} = message.payload;

  if (!id) {
    message.respond({
      returnValue: false,
      errorCode: 400,
      errorText: 'id parameter is required'
    });
    return;
  }

  try {
    // Perform async operation
    const data = await fetchData(id);

    message.respond({
      returnValue: true,
      data
    });
  } catch (error) {
    message.respond({
      returnValue: false,
      errorCode: 500,
      errorText: error.message
    });
  }
});

// Example: HTTP request to external API
function fetchData(id) {
  const https = require('https');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.example.com',
      port: 443,
      path: `/data/${id}`,
      method: 'GET',
      headers: {
        'User-Agent': 'webOS-Service/1.0',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timeout'));
    });

    req.end();
  });
}

module.exports = service;
```

### Step 3: Create Service Metadata

**File: `services/my-service/my-service.json`**

```json
{
  "id": "com.example.myapp.myservice",
  "version": "1.0.0",
  "vendor": "My Company",
  "type": "webos-service",
  "main": "my-service.js"
}
```

### Step 4: Create Service Package Configuration

**File: `services/my-service/package.json`**

```json
{
  "name": "my-service",
  "version": "1.0.0",
  "description": "My Luna Service",
  "main": "my-service.js",
  "dependencies": {
    "webos-service": "git+https://github.com/webosose/nodejs-module-webos-service.git"
  }
}
```

If you need external dependencies:
```bash
cd services/my-service
npm install axios  # Only if you need HTTP client
```

**Note**: For production, prefer using native Node.js modules (`https`, `http`, `fs`) to reduce bundle size.

### Step 5: Create Service Registry

**File: `services/services.json`**

```json
{
  "services": [
    {
      "description": "My custom service",
      "name": "com.example.myapp.myservice",
      "type": "js",
      "main": "my-service/my-service.js"
    }
  ]
}
```

### Important Service Naming Rules

1. **Service ID must start with app ID**:
   - App ID: `com.example.myapp`
   - Service ID: `com.example.myapp.myservice` ✅
   - Service ID: `com.example.otherservice` ❌

2. **No special characters**:
   - No hyphens (`-`) or periods followed by numbers (`.1`)
   - Use camelCase or dot notation: `com.example.myapp.loginService` ✅

3. **Consistency across files**:
   - Same service ID in `my-service.js`, `my-service.json`, and `services.json`

---

## Calling Luna Services from Enact Apps

### Method 1: Using LS2Request (Enact)

**Install Enact webOS library**:
```bash
npm install @enact/webos
```

**Usage in Component**:

```javascript
import {Component} from 'react';
import LS2Request from '@enact/webos/LS2Request';
import Button from '@enact/moonstone/Button';

class MyComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      error: null,
      loading: false
    };
  }

  callService = () => {
    this.setState({loading: true, error: null});

    const request = new LS2Request();
    request.send({
      service: 'luna://com.example.myapp.myservice',
      method: 'getData',
      parameters: {
        id: '123'
      },
      onSuccess: (response) => {
        this.setState({
          data: response.data,
          loading: false
        });
      },
      onFailure: (error) => {
        this.setState({
          error: error.errorText || 'Service call failed',
          loading: false
        });
      }
    });
  };

  render() {
    const {data, error, loading} = this.state;

    return (
      <div>
        <Button onClick={this.callService}>
          {loading ? 'Loading...' : 'Fetch Data'}
        </Button>
        {error && <p>Error: {error}</p>}
        {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      </div>
    );
  }
}

export default MyComponent;
```

### Method 2: Using Promises (Cleaner)

```javascript
import LS2Request from '@enact/webos/LS2Request';

const callLunaService = (service, method, parameters = {}) => {
  return new Promise((resolve, reject) => {
    const request = new LS2Request();
    request.send({
      service,
      method,
      parameters,
      onSuccess: resolve,
      onFailure: (error) => reject(new Error(error.errorText || 'Service call failed'))
    });
  });
};

// Usage with async/await
async function fetchData() {
  try {
    const response = await callLunaService(
      'luna://com.example.myapp.myservice',
      'getData',
      {id: '123'}
    );
    console.log('Data:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Method 3: Using webOS.service.request (Legacy)

For older webOS versions or non-Enact apps:

```javascript
const webOSTV = window.webOS;

webOSTV.service.request('luna://com.example.myapp.myservice', {
  method: 'getData',
  parameters: {
    id: '123'
  },
  onSuccess: (response) => {
    console.log('Success:', response);
  },
  onFailure: (error) => {
    console.error('Error:', error);
  }
});
```

### Method 4: Subscriptions (Real-time Updates)

```javascript
import LS2Request from '@enact/webos/LS2Request';

class LiveDataComponent extends Component {
  componentDidMount() {
    this.request = new LS2Request();
    this.request.send({
      service: 'luna://com.example.myapp.myservice',
      method: 'watchData',
      parameters: {
        subscribe: true  // Enable subscription
      },
      onSuccess: (response) => {
        // Called initially and on every update
        this.setState({data: response.data});
      },
      onFailure: (error) => {
        console.error('Subscription error:', error);
      }
    });
  }

  componentWillUnmount() {
    // Cancel subscription
    if (this.request) {
      this.request.cancel();
    }
  }

  render() {
    const {data} = this.state;
    return <div>{JSON.stringify(data)}</div>;
  }
}
```

---

## Configuration Files

### appinfo.json

Located at the root of your app, this file contains app metadata.

**Minimal Example**:
```json
{
  "id": "com.example.myapp",
  "version": "1.0.0",
  "vendor": "My Company",
  "type": "web",
  "main": "index.html",
  "title": "My WebOS App",
  "icon": "icon.png"
}
```

**Complete Example**:
```json
{
  "id": "com.example.myapp",
  "version": "1.0.0",
  "vendor": "My Company",
  "type": "web",
  "main": "index.html",
  "title": "My WebOS App",
  "icon": "icon.png",
  "largeIcon": "largeIcon.png",
  "splashBackground": "splash.png",
  "bgColor": "#000000",
  "transparent": false,
  "resolution": "1920x1080",
  "requiredVersion": "1.0.0",
  "appDescription": "My awesome webOS TV app",
  "requiredPermissions": [
    "time.query",
    "activity.operation",
    "settings.read"
  ]
}
```

**Key Properties**:

| Property | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Unique app identifier (reverse DNS format) |
| `version` | Yes | App version (e.g., "1.0.0") |
| `vendor` | No | Company or developer name |
| `type` | Yes | App type: `web`, `qml`, or `native` |
| `main` | Yes | Entry point file (`index.html` for web apps) |
| `title` | Yes | App display name |
| `icon` | Yes | App icon path (80x80 PNG) |
| `largeIcon` | No | Large icon (130x130 PNG) |
| `bgColor` | No | Background color (hex) |
| `transparent` | No | Enable transparent background |
| `resolution` | No | Target resolution (e.g., "1920x1080") |
| `requiredPermissions` | No | Array of ACG values for Luna Service access |

**Important Rules for App ID**:
- Must use reverse DNS notation: `com.company.appname`
- Lowercase letters, numbers, and periods only
- NO hyphens (`-`) if you're using JS services
- NO periods followed by numbers (`.1`)
- Cannot start with reserved prefixes like `com.palm`, `com.webos`, `com.lge`

### services.json

Located in the `services/` directory, this file registers all Luna Services.

```json
{
  "services": [
    {
      "description": "Login authentication service",
      "name": "com.example.myapp.login",
      "type": "js",
      "main": "login-service/login-service.js"
    },
    {
      "description": "Data synchronization service",
      "name": "com.example.myapp.sync",
      "type": "js",
      "main": "sync-service/sync-service.js"
    }
  ]
}
```

**Service Properties**:
- `description`: Human-readable description
- `name`: Service ID (must start with app ID)
- `type`: `js` for JavaScript services
- `main`: Path to service entry point (relative to `services/`)

### package.json (Enact App)

Standard Node.js package file for the Enact UI app.

```json
{
  "name": "my-webos-app",
  "version": "1.0.0",
  "description": "My WebOS TV App",
  "main": "src/index.js",
  "scripts": {
    "serve": "enact serve",
    "pack": "enact pack --isomorphic",
    "clean": "enact clean"
  },
  "dependencies": {
    "@enact/core": "^4.5.6",
    "@enact/moonstone": "^4.5.6",
    "@enact/webos": "^4.5.6",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@enact/cli": "^6.0.0"
  }
}
```

**Important Notes**:
- Use React 18+ for modern Enact versions
- Install `@enact/webos` for Luna Service integration
- Use Moonstone for webOS TV 4.x-6.x, Sandstone for 6.x+

---

## Building and Packaging

### Step 1: Install Dependencies

```bash
# Install Enact app dependencies
cd enact-mvp
npm install

# Install service dependencies (if any)
cd services/my-service
npm install
cd ../..
```

### Step 2: Build Enact App

```bash
cd enact-mvp
npm run pack
```

This creates a production build in `dist/`:
```
dist/
├── index.html
├── main.js
├── main.css
├── resources/
│   ├── icon.png
│   └── largeIcon.png
└── ...
```

### Step 3: Package App with Services

Use `ares-package` to create an IPK file:

```bash
# Package app + service
ares-package enact-mvp/dist enact-mvp/services/my-service -o dist

# Output: dist/com.example.myapp_1.0.0_all.ipk
```

**Important**: Package the specific service directory (`services/my-service`), NOT the parent `services/` directory.

**Common Packaging Patterns**:

```bash
# Single service
ares-package dist/ services/my-service

# Multiple services
ares-package dist/ services/service1 services/service2

# With custom output directory
ares-package dist/ services/my-service -o build/

# Without minification (for debugging)
ares-package --no-minify dist/ services/my-service
```

### Step 4: Verify Package Contents

Extract and inspect the IPK:

```bash
# Extract IPK
mkdir -p tmp-extract
cd tmp-extract
ar x ../dist/com.example.myapp_1.0.0_all.ipk
tar -xzf data.tar.gz
```

Verify service files are in:
```
usr/palm/services/com.example.myapp.myservice/
├── my-service.js
├── my-service.json
├── services.json
└── package.json
```

---

## Deployment with ares-* CLI Tools

### Prerequisites

1. **Install webOS TV SDK**:
   ```bash
   npm install -g @webos-tools/cli
   ```

2. **Enable Developer Mode on TV**:
   - Install "Developer Mode" app from LG Content Store
   - Enable Dev Mode and note the IP address
   - Enable "Key Server" for secure connection

### Step 1: Set Up Device

```bash
# Add TV as a target device
ares-setup-device --add tv2 -i "host=192.168.1.213" -i "port=9922" -i "username=prisoner"

# Verify connection
ares-device-info -d tv2

# If using key server, provide passphrase when prompted
```

**Device Configuration Options**:
- `host`: TV IP address
- `port`: SSH port (usually 9922)
- `username`: Usually `prisoner` for webOS TV

### Step 2: Install App

```bash
# Install IPK to TV
ares-install --device tv2 dist/com.example.myapp_1.0.0_all.ipk

# List installed apps
ares-install --device tv2 --list

# Remove app
ares-install --device tv2 --remove com.example.myapp
```

**Important**: Use Node 16 for ares-* tools due to compatibility issues with newer Node versions:

```bash
# Using nvm
nvm use 16
ares-install --device tv2 myapp.ipk

# Or inline
source ~/.nvm/nvm.sh && nvm use 16 && ares-install --device tv2 myapp.ipk
```

### Step 3: Launch App

```bash
# Launch app
ares-launch --device tv2 com.example.myapp

# Close app
ares-launch --device tv2 --close com.example.myapp

# List running apps
ares-launch --device tv2 --running
```

---

## Debugging and Testing

### Method 1: Web Inspector (for Enact UI)

```bash
# Start Web Inspector
ares-inspect --device tv2 --app com.example.myapp --open

# This opens Chrome DevTools at:
# http://localhost:9998/devtools/inspector.html
```

Access the Console, Network, and Elements tabs to debug your Enact app.

### Method 2: Service Inspector (for Luna Services)

```bash
# Start Service Inspector
ares-inspect --device tv2 --service com.example.myapp.myservice --open

# This opens Node.js DevTools
```

### Method 3: Command-Line Testing with luna-send

Test Luna Services directly from the TV shell:

```bash
# SSH into TV
ares-shell --device tv2

# Call service method
luna-send -n 1 -f luna://com.example.myapp.myservice/hello '{"name": "Developer"}'

# Subscribe to service
luna-send -i -f luna://com.example.myapp.myservice/watchData '{"subscribe": true}'

# Exit shell
exit
```

### Method 4: Monitor Service Logs

```bash
# View service logs in real-time
ares-shell --device tv2 "journalctl -f -u com.example.myapp.myservice"
```

### Method 5: Check Service Status

```bash
# Verify service is installed
ares-shell --device tv2 "ls /usr/palm/services | grep com.example.myapp"

# Check service status
ares-shell --device tv2 "luna-send -n 1 -f luna://com.webos.service.bus/signal/registerServiceCategory '{\"category\":\"/\",\"serviceName\":\"com.example.myapp.myservice\"}'"
```

---

## Common Issues and Solutions

### Issue 1: Service ID Mismatch Error

**Error**:
```
ares-package ERR! [Tips]: ServiceID must start with package id <com.example.myapp>
```

**Cause**: Service ID doesn't start with app ID.

**Solution**: Ensure all service IDs match across files:

1. **appinfo.json** (if services array is present):
   ```json
   "services": [{"name": "com.example.myapp.myservice"}]
   ```

2. **services/my-service/my-service.js**:
   ```javascript
   const service = new Service('com.example.myapp.myservice');
   ```

3. **services/my-service/my-service.json**:
   ```json
   {"id": "com.example.myapp.myservice"}
   ```

4. **services/services.json**:
   ```json
   {"name": "com.example.myapp.myservice"}
   ```

### Issue 2: Black/Grey Screen on TV

**Causes**:
- Missing Moonstone skin import
- React version incompatibility
- Missing dependencies

**Solutions**:

1. Import Moonstone skin in `index.js`:
   ```javascript
   import '@enact/moonstone/styles/skin.less';
   ```

2. Upgrade to React 18:
   ```bash
   npm install react@18.2.0 react-dom@18.2.0
   ```

3. Add debug banner to verify rendering:
   ```javascript
   <div style={{padding: '20px', color: '#fff'}}>
     App is running!
   </div>
   ```

### Issue 3: Luna Service Call Hangs/Fails

**Symptoms**: Login or service call shows spinner indefinitely.

**Debugging Steps**:

1. **Check if service is installed**:
   ```bash
   ares-shell -d tv2 "ls /usr/palm/services | grep com.example.myapp"
   ```

2. **Test service directly**:
   ```bash
   ares-shell -d tv2
   luna-send -n 1 -f luna://com.example.myapp.myservice/hello '{}'
   ```

3. **Check service logs**:
   ```bash
   ares-inspect --device tv2 --service com.example.myapp.myservice --open
   ```

4. **Verify service code has timeout**:
   ```javascript
   req.setTimeout(15000, () => {
     req.destroy(new Error('Request timeout'));
   });
   ```

### Issue 4: Node Version Compatibility

**Error**:
```
ares-install ERR! [syscall failure]: isDate is not a function
```

**Cause**: Node 23+ incompatibility with ares-* tools.

**Solution**: Use Node 16:
```bash
nvm use 16
ares-install --device tv2 myapp.ipk
```

### Issue 5: SSH Connection Refused

**Error**:
```
ares-install ERR! [syscall failure]: connect ECONNREFUSED
```

**Solutions**:

1. Enable Developer Mode on TV
2. Enable "Key Server" in Developer Mode app
3. Note the passphrase and use it when connecting:
   ```bash
   ares-setup-device --add tv2 -i "host=192.168.1.213"
   # Enter passphrase when prompted
   ```

### Issue 6: Service Not Found at Runtime

**Error in DevTools Console**:
```
Service does not exist: luna://com.example.myapp.myservice
```

**Causes**:
- Service not packaged correctly
- Service files missing from IPK
- Service not registered on Luna Bus

**Solutions**:

1. **Verify IPK contents**:
   ```bash
   ar x myapp.ipk
   tar -xzf data.tar.gz
   ls usr/palm/services/
   ```

2. **Repackage with correct paths**:
   ```bash
   ares-package dist/ services/my-service
   ```

3. **Force service registration**:
   ```bash
   ares-shell -d tv2 "luna-send -n 1 -f luna://com.webos.service.bus/signal/registerServerStatus '{}'"
   ```

---

## Best Practices

### 1. Service Development

- **Use native Node.js modules** (`https`, `http`, `fs`) instead of external libraries to reduce bundle size
- **Add timeouts** to all async operations (HTTP requests, database queries)
- **Validate all input parameters** before processing
- **Return consistent error responses** with `returnValue: false`, `errorCode`, and `errorText`
- **Log errors** for debugging but avoid logging sensitive data

### 2. Enact App Development

- **Use React 18+** for modern Enact versions (required for `useId` hook)
- **Import Moonstone/Sandstone skin** in your entry point
- **Handle loading and error states** in UI components
- **Cancel subscriptions** in `componentWillUnmount` to prevent memory leaks
- **Test on actual TV** instead of relying solely on simulators

### 3. Configuration

- **Keep service IDs consistent** across all config files
- **Use meaningful service and method names** (e.g., `com.example.myapp.auth/login`)
- **Document required ACG permissions** in README
- **Version your app properly** (follow semantic versioning)

### 4. Packaging and Deployment

- **Use `--no-minify` during development** for easier debugging
- **Verify IPK contents** before deploying to TV
- **Package specific service directories**, not the parent `services/` folder
- **Test on multiple webOS versions** if targeting older TVs

### 5. Debugging

- **Use DevTools extensively** (Web Inspector for UI, Service Inspector for services)
- **Test services with `luna-send`** before integrating with UI
- **Monitor service logs** during runtime
- **Add debug banners** to verify UI rendering

---

## Resources

### Official Documentation

- **webOS TV Developer Portal**: https://webostv.developer.lge.com/
- **webOS Open Source Edition**: https://www.webosose.org/
- **Enact Framework**: https://enactjs.com/
- **Enact API Documentation**: https://enactjs.com/docs/

### Key Guides

- **Luna Service Introduction**: https://webostv.developer.lge.com/develop/references/luna-service-introduction
- **LS2 API Introduction**: https://www.webosose.org/docs/guides/getting-started/introduction-to-ls2-api/
- **Developing JS Services**: https://www.webosose.org/docs/iot/tutorial/js-services/developing-js-services-iot/
- **CLI Developer Guide**: https://webostv.developer.lge.com/develop/tools/cli-dev-guide
- **appinfo.json Reference**: https://webostv.developer.lge.com/develop/references/appinfo-json

### Tools

- **webOS TV CLI**: https://github.com/webosose/ares-cli
- **Luna Service 2**: https://github.com/webosose/luna-service2
- **webos-service (Node.js module)**: https://github.com/webosose/nodejs-module-webos-service

### Community

- **webOS TV Forum**: https://forum.webostv.developer.lge.com/
- **webOS Homebrew**: https://www.webosbrew.org/
- **Enact Gitter Chat**: https://gitter.im/EnactJS/Lobby

### Sample Code

- **webOS TV App Samples**: https://github.com/webOS-TV-app-samples
- **Enact Samples**: https://github.com/enactjs/samples

---

## Quick Reference

### Common Commands

```bash
# Build Enact app
npm run pack

# Package app + service
ares-package dist/ services/my-service

# Install to TV
ares-install --device tv2 myapp.ipk

# Launch app
ares-launch --device tv2 com.example.myapp

# Inspect app
ares-inspect --device tv2 --app com.example.myapp --open

# Inspect service
ares-inspect --device tv2 --service com.example.myapp.myservice --open

# SSH into TV
ares-shell --device tv2

# Test service via luna-send
luna-send -n 1 -f luna://com.example.myapp.myservice/method '{"param":"value"}'
```

### File Checklist

Before deploying, ensure you have:

- [ ] `appinfo.json` with correct app ID
- [ ] `package.json` with Enact dependencies
- [ ] `services/services.json` with service registry
- [ ] `services/my-service/my-service.js` with service implementation
- [ ] `services/my-service/my-service.json` with service metadata
- [ ] Consistent service IDs across all files
- [ ] Built Enact app in `dist/`
- [ ] Service dependencies installed (if any)

---

## Conclusion

This guide covers the fundamentals of developing webOS TV applications using Enact and Luna Services. By following these patterns and best practices, you can build robust, performant TV apps that leverage the full power of the webOS platform.

For more advanced topics (native services, QML apps, platform services), refer to the official webOS documentation.

**Happy coding!**
