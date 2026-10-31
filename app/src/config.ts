// Your Mac's LAN IP: reachable from simulators, emulators and real phones on the same Wi-Fi.
// shortcut: hardcoded dev host, update when your IP changes; move to build config before release.
const DEV_HOST = '192.168.1.58';

export const SERVER_URL = `http://${DEV_HOST}:3000`;
