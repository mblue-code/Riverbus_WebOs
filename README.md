# Floatplane for webOS

An Enact-based Floatplane client for LG webOS TVs (2021+) with Luna Service integration for authentication and API communication.

## Quick Start

The complete application lives in the `enact-mvp/` directory. See **[enact-mvp/README.md](enact-mvp/README.md)** for:

- Full setup and installation instructions
- Prerequisites (LG Developer account, webOS TV SDK, Node.js)
- Build, packaging, and deployment workflow
- Development guide and troubleshooting
- Architecture documentation

## Features

- Full Floatplane authentication with 2FA support
- Creator browsing and video playback (including encrypted HLS streams)
- Luna Service for server-side API calls (bypasses CORS restrictions)
- Remote control navigation optimized for TV
- Video progress tracking and resume playback

## Platform Requirements

- **Supported:** webOS 6.0+ (2021+ LG TVs)
- **Not supported:** webOS 4.0-5.0 (2018-2020 models)

See [enact-mvp/docs/WEBOS_COMPATIBILITY.md](enact-mvp/docs/WEBOS_COMPATIBILITY.md) for platform compatibility details.

## Quick Build

```bash
cd enact-mvp
npm install
npm run pack

# Package and deploy
cd ..
ares-package enact-mvp/dist enact-mvp/services
ares-install --device <device-name> com.community.floatplane.enactmvp_0.1.0_all.ipk
ares-launch --device <device-name> com.community.floatplane.enactmvp
```

## Documentation

- **[enact-mvp/README.md](enact-mvp/README.md)** - Main documentation
- **[enact-mvp/docs/WEBOS_COMPATIBILITY.md](enact-mvp/docs/WEBOS_COMPATIBILITY.md)** - Platform compatibility guide
- **[enact-mvp/docs/MIGRATION_GUIDE_ENACT_1.md](enact-mvp/docs/MIGRATION_GUIDE_ENACT_1.md)** - Guide for supporting older TVs

## License

MIT. This is an unofficial community project, not affiliated with Floatplane Media Inc.
