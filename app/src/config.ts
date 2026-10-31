// Debug builds talk to the server on your Mac over Wi-Fi (update when your LAN IP changes).
const DEV_HOST = '192.168.1.58';

// Release builds talk to the deployed server (see DEPLOY.md). Must be https: iOS blocks plain http.
// If you deploy under another name/host, change this and rebuild the release app.
export const PROD_SERVER_URL = 'https://hunter-game-dsumniya.fly.dev';

export const SERVER_URL = __DEV__ ? `http://${DEV_HOST}:3000` : PROD_SERVER_URL;
