// Hands the room code shown on screen to the waiting bot runner.
// copyTextFrom returns the VoiceOver label ("Room code A B C D E"), so strip it back to the code.
const code = maestro.copiedText.replace(/^Room code /, '').replace(/\s/g, '');
http.post('http://localhost:4001/join', { body: code });
