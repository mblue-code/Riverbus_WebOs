# webOS CLI Setup

## Installation
- Ensure Node.js and npm are installed and available in your shell.
- Install the CLI globally: `npm install -g @webos-tools/cli`
- The installer creates `~/.webos` for CLI state; if the directory cannot be created, rerun the command with elevated permissions.

## Verification
- Confirm the install using `ares -V`; a successful install reports a version (for example, `Version: 3.2.1`).
- List available helper commands with `ares --help` or `ares-help`.

## Device Configuration
- Enable Developer Mode on the LG TV, generate the developer passphrase, and note the device IP address. The passphrase expires in roughly 50 minutes.
- Make sure the development machine and the TV share the same network (or connect via Ethernet for best stability).
- Add the TV as a target: `ares-setup-device -a my-tv -i <IP> -p <passphrase> -t tv`
- Confirm the target appears with `ares-setup-device -l`; the default entry is the emulator (`developer@127.0.0.1:6622`).
- Test connectivity: `ares-novacom --device my-tv --session ls /media/developer`

## Common Tasks
- Package apps: `ares-package <project-dir>`
- Install packages on the target: `ares-install --device my-tv <package.ipk>`
- Launch apps: `ares-launch --device my-tv <app-id>`
- Remove apps: `ares-uninstall --device my-tv <app-id>`

## Troubleshooting Tips
- If device discovery fails, verify network reachability (ping the IP) and confirm Developer Mode is still active.
- Renew the developer passphrase on the TV whenever it expires.
- Delete and recreate targets with `ares-setup-device -r my-tv` if credentials change.
