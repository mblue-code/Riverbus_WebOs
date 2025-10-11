# Compatibility Notes (Enact MVP)

The Enact + LS2 approach is primarily tested on webOS 4.0 (2018 TVs) through webOS 24 (2024 TVs). Because the Luna service handles network requests, browser-level limitations (e.g., Turnstile on `file://`) no longer apply. Key points:

- The Node service uses the standard `https` module and should work on any webOS TV firmware that supports JS services (webOS 3.x+).
- The Enact UI targets 1920×1080 layouts; Moonstone scales down to 1280×720 if needed.
- For playback integration, re-validate once the media player is ported (native AVPlay or browser fallback). Playback behaviour can differ between webOS 4 and 24, especially regarding DRM.
- Any new functionality should continue to be tested on both the 2018 and 2024 TVs before release.
