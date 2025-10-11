# webOS CLI Setup (Updated)

1. Install the LG webOS CLI:
   ```bash
   npm install -g @webosose/ares-cli
   ```

2. Add your device (run once per device):
   ```bash
   ares-setup-device
   ```
   Provide the TV IP, port 9922, username `prisoner`.

3. Verify the device list:
   ```bash
   ares-setup-device --list
   ```

4. Common commands:
   ```bash
   ares-package <path>                # create .ipk
   ares-install --device <name> ...   # install package
   ares-launch  --device <name> ...   # launch app by id
   ares-inspect --device <name> ...   # inspect logs/DevTools
   ```

5. Developer Mode reminders:
   - Enable the “Developer Mode” app on the TV.
   - Extend the session before expiry (typically every 50 hours).
   - For simulators, use the `ares-setup-device --add` flow with the simulator IP.

6. For multi-device testing (2018 + 2024 TVs):
   - Register each TV with a distinct name (`tv2018`, `tv2024`).
   - Deploy to both as part of QA.
