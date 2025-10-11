# Enact + Luna Service MVP Overview

This document summarizes the current architecture and workflow for the new Floatplane webOS app implemented with Enact and a bundled Luna Service.

---

## Motivation

The legacy HTML/CSS app could not set the HTTP `User-Agent`, forcing us to rely on Cloudflare Turnstile or external proxies to satisfy Floatplane login requirements. The Enact MVP packages a Node.js Luna Service together with the Enact UI, giving us full control over outbound requests in a self-contained `.ipk`.

---

## Components

### 1. Enact UI (`enact-mvp/src/`)
- **LoginForm** – collects credentials, calls LS2 service (`login` & `factor`) via `@enact/webos/service`.
- **App** – Moonstone Panels with login + placeholder Home panel (ready for creators/videos once ported).
- **Styles** – Minimal LESS entrypoint that imports Moonstone base styles.

### 2. Luna Service (`enact-mvp/services/login-service/`)
- Node.js service registered as `com.community.floatplane.login.service`.
- Endpoints:
  - `/login` → `https://www.floatplane.com/api/v2/auth/login`
  - `/factor` → `https://www.floatplane.com/api/v2/auth/checkFor2faLogin`
- Sets trusted `User-Agent` (`Hydravion 1.0 (AndroidTV), CFNetwork`) with optional override via `FLOATPLANE_UA`.
- Returns JSON responses + cookie headers to the UI.

### 3. Packaging (`enact-mvp/appinfo.json`)
- Combines the Enact UI (built into `dist/`) and the Luna service.
- Provides metadata (app id, icons) for the webOS launcher.

---

## Development workflow

1. **Install dependencies**
   ```bash
   cd enact-mvp
   npm install
   ```
2. **Build UI**
   ```bash
   npm run pack   # outputs dist/
   ```
3. **Package app + service**
   ```bash
   cd ..
   ares-package enact-mvp/dist enact-mvp/services enact-mvp/appinfo.json
   ```
4. **Install & launch**
   ```bash
   ares-install com.community.floatplane.enactmvp_0.1.0_all.ipk
   ares-launch  com.community.floatplane.enactmvp
   ```
5. **Inspect logs**
   ```bash
   ares-inspect -d <device> --app com.community.floatplane.enactmvp
   ```

> `npm run serve` runs a browser preview but cannot communicate with the Luna service. Use it for basic UI tweaks only.

---

## Next steps

- Port the home/catalog experience (creators/videos) from the legacy app.
- Integrate playback (AVPlay or Shaka/native fallback) once the player strategy is final.
- Add offline/sample mode and chat features.
- Persist session cookies if desired.

---

## Legacy reference

The legacy HTML app (`index.html`, `scripts/`, `styles/`) and proxy (`cors-proxy.js`) remain in the repository for historical purposes but are no longer maintained. All active work should happen under `enact-mvp/`.

---

## FAQ

**Why not continue with the old proxy?**  
The LS2 service gives us the same header control while keeping the app self-contained. No external infrastructure required.

**Do we need the native/Qt SDK?**  
Not for this MVP. The public SDK centres on web apps; native SDK access is partner-only.

**Can we still serve the app over `file://`?**  
Yes. Because the Luna service makes the network call, we no longer depend on a hosted HTTPS origin or Turnstile.

---

This document will evolve as we flesh out the Enact experience and add playback/chat. For detailed packaging steps see the top-level `README.md`.
