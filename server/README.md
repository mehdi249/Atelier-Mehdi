# Atelier Sync Server

A lightweight local server that lets your iPhone and iPad sync designs with your Mac over Wi-Fi — no internet required.

Data is stored in **~/Documents/Atelier/** on your Mac.

## Prerequisites

- [Node.js](https://nodejs.org) (v18+) installed on your Mac

## Start the server

```bash
bash server/start.sh
```

The server installs its own dependencies on first run, then prints your Mac's local IP address:

```
Atelier sync server — port 4321

  → Enter this IP in the app:  192.168.1.42
```

## Connect from iPhone / iPad

1. Make sure all devices are on the **same Wi-Fi network**
2. Open the app → tap the Wi-Fi sync icon in the header
3. Enter the IP address printed above (e.g. `192.168.1.42`)
4. Tap **Connect** — done

The app syncs automatically in the background whenever the Mac server is reachable.

## Finding your IP manually

**System Settings → Wi-Fi → Details** (next to your network name) → IP Address field.

## Notes

- The server must be running on your Mac for sync to work
- When offline (away from home Wi-Fi), the app falls back to local IndexedDB storage silently
- All data stays on your local network — nothing goes to the internet
