// Sends the host's room code to e2e/multi.sh so it can start the runner devices.
const code = maestro.copiedText.replace(/^Room code /, '').replace(/\s/g, '');
http.post('http://localhost:4002/code', { body: code });
