# Legacy webOS 4.0 Migration Status

## Current Snapshot
- ✅ Forked the Enact MVP into `legacy-webos4-enact1/` to isolate legacy changes from the modern app.
- ✅ Downgraded dependencies in `legacy-webos4-enact1/package.json` to Enact 1.13 and React 15, added legacy-friendly ESLint config, and committed to Node 10 via `.nvmrc`.
- ✅ Preserved existing source, services, and resources as a starting point for Enact 1.x refactoring.
- ✅ Reworked `src/App/App.js` and `src/components/LoginForm.js` to drop React 16+ features (fragments, `createRef`, optional chaining) and switch Moonstone control handlers to `onTap`.
- ✅ Converted class field/arrow property syntax to constructor-bound methods and swapped the unsupported `VirtualGridList` for a `Scroller` + spottable grid that works with Enact 1.x Spotlight.
- ✅ Added webpack aliases in `enact.config.js` to force React/ReactDOM imports to resolve to the app’s 15.6.2 copies rather than the CLI’s bundled React 16 builds.

## Immediate Next Steps
- Re-run `npm install` under Node 10 whenever `package.json` changes, then commit the resulting `package-lock.json` to stabilize builds.
- Audit remaining utilities/styles for modern JavaScript features (e.g., object spread in service code) and convert them to Babel-6-friendly patterns.
- Review Luna service usage: ensure `services/login-service/` works with the downgraded runtime and adjust any `Service` identifiers if a separate legacy package name is required.
- Rebuild and smoke-test on a webOS 4.0 device/emulator once the initial component conversions are complete.
- Confirm layout/styling for the manual video grid on real hardware and consider lightweight virtualization or pagination if performance drops vs. the removed `VirtualGridList`.
- Run `./node_modules/.bin/enact pack` with Node 10 and confirm the resulting IPK no longer throws `ReactCurrentDispatcher` errors on device; if issues remain, inspect webpack stats for stray React 16 modules.
- Confirm Enact 1.x alternatives for newer UI widgets (e.g., `VirtualGridList`) or replace with legacy-friendly implementations.

## References
- Migration playbook: `docs/MIGRATION_GUIDE_ENACT_1.md`
- Legacy project root: `legacy-webos4-enact1/`
