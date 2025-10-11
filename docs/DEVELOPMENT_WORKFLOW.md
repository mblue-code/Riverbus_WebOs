# Development Workflow (Enact MVP)

This guide focuses on the new Enact + Luna Service architecture (`../enact-mvp`). Legacy HTML/JS instructions are summarized at the end for archival purposes.

## Prerequisites

- Node.js 14 or 16
- Enact CLI (`npm install -g @enact/cli`) or use `npx`
- webOS CLI (`npm install -g @webosose/ares-cli`)
- LG TV in developer mode or webOS TV simulator

## Initial setup

```bash
cd enact-mvp
npm install
```

## Build & package

```bash
npm run pack                             # builds dist/
cd ..
ares-package enact-mvp/dist enact-mvp/services enact-mvp/appinfo.json
```

## Install & launch

```bash
ares-install com.community.floatplane.enactmvp_0.1.0_all.ipk
ares-launch  com.community.floatplane.enactmvp
```

## Inspect logs

```bash
ares-inspect -d <device> --app com.community.floatplane.enactmvp
```

## Development tips

- Use `npm run serve` for quick UI iteration (note: LS2 services are unavailable in the dev server).
- Rebuild (`npm run pack`) and reinstall whenever the service or UI changes.
- Override the spoofed user-agent by setting `FLOATPLANE_UA` before packaging if needed.

---

## Legacy HTML workflow (archived)

The original app under `index.html`/`scripts/` can still be packaged with:

```bash
npm run build
ares-package . --outdir dist
```

Install & launch:

```bash
ares-install dist/*.ipk
ares-launch com.floatplane.webos
```

Authentication will require either Turnstile (hosted HTTPS) or the old proxy; therefore the legacy build is kept only for historical reference.
