# Floatplane for webOS – Enact + Luna Service MVP

This repository started as a pure HTML/CSS Floatplane client for LG webOS TVs. That legacy version is still present, but the current direction is an Enact-based UI bundled with a Luna Service (Node.js) that forwards login requests with a trusted `User-Agent`. The new architecture avoids external proxies and plays nicely with modern webOS tooling.

---

## Repository structure

```
webos_app/
├── index.html / scripts / styles    # Legacy packaged web app (archived)
├── cors-proxy.js                    # Old proxy (not needed with new service)
└── enact-mvp/                       # ✅ Enact UI + LS2 login service (current focus)
```

Everything new lives under `enact-mvp/`. The legacy files remain for reference but are no longer maintained.

---

## Enact MVP

The MVP demonstrates:

- A Moonstone/Enact login screen (`src/`) that talks to a JS service via `@enact/webos/service`.
- A packaged Luna service (`services/login-service/`) that calls Floatplane’s login APIs with a spoofed `User-Agent`.
- A placeholder home screen confirming login success (ready for creators/videos once we port them).

### Prerequisites

- Node.js 14 or 16.
- Enact CLI (`npm install -g @enact/cli`) or use `npx`.
- LG webOS CLI tools (`ares-*`).

### Build & package

```bash
cd enact-mvp
npm install
npm run pack          # UI build -> dist/

cd ..
ares-package enact-mvp/dist enact-mvp/services enact-mvp/appinfo.json
# output: com.community.floatplane.enactmvp_0.1.0_all.ipk

ares-install com.community.floatplane.enactmvp_0.1.0_all.ipk
ares-launch com.community.floatplane.enactmvp
```

Inspect logs for UI/service output:

```bash
ares-inspect -d <device> --app com.community.floatplane.enactmvp
```

> `npm run serve` is available for browser previews but LS2 services aren’t exposed there, so login will fail in dev server mode.

---

## Login service behaviour

Located at `enact-mvp/services/login-service`:

- `login-service.js` uses Node’s `https` module and adds `User-Agent: Hydravion 1.0 (AndroidTV), CFNetwork` (override via `FLOATPLANE_UA`).
- Exposes LS2 endpoints:
  - `luna://com.community.floatplane.login.service/login`
  - `luna://com.community.floatplane.login.service/factor`
- Returns JSON bodies plus `Set-Cookie` data so the UI can persist sessions.

Enact consumes these endpoints via `@enact/webos/service.call`.

---

## Roadmap

- Port creator/video listings into Enact state/models.
- Integrate the media player (native AVPlay or browser fallback) once the playback strategy is final.
- Add offline sample mode and chat hooks to the new UI.
- Persist cookies across app launches if desired.

---

## Legacy artifacts

- `index.html`, `scripts/`, `styles/` – original HTML app (requires Turnstile or proxy to log in).
- `cors-proxy.js` – legacy workaround for spoofing the `User-Agent`.
- `native/` – early Qt/C++ experiments; paused now that the public SDK focuses on web apps.

These remain for historical context but should not be extended.

---

## License & disclaimer

MIT (if a LICENSE file is present). This is an unofficial community project, not affiliated with Floatplane Media Inc. Use responsibly and respect Floatplane’s terms of service.
