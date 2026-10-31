import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import { io as connect, Socket } from 'socket.io-client';
import type { ChatMessage, ClientToServerEvents, RoomView, ServerToClientEvents } from '@hunt/shared';
import { Room } from '../src/domain/Room';
import { publicId } from '../src/transport/publicIds';
import { attachSocket } from '../src/transport/socket';

// ---- domain ----

function room() {
  const r = new Room('CHAT1', 'h', 'Hana');
  r.join('r1', 'Ravi');
  r.join('r2', 'Mia');
  return r;
}

test('messages go to the sender team log only', () => {
  const r = room();
  assert.equal(r.say('h', 'I see you', 1).team, 'hunters');
  assert.equal(r.say('r1', 'hide behind the shop', 2).team, 'runners');
  assert.deepEqual(r.chatFor('h').messages.map(m => m.text), ['I see you']);
  assert.deepEqual(r.chatFor('r2').messages.map(m => m.text), ['hide behind the shop']);
});

test('a caught runner switches to the hunters chat and loses runner history', () => {
  const r = room();
  r.say('h', 'north side', 1);
  r.say('r1', 'runners only', 2);
  r.start('h', 3);
  r.beginChase(4);
  r.updateLocation('r1', { lat: 1, lng: 1 }, 5);
  r.updateLocation('h', { lat: 1, lng: 1 }, 6); // r1 caught -> helper
  const view = r.chatFor('r1');
  assert.equal(view.team, 'hunters');
  assert.deepEqual(view.messages.map(m => m.text), ['north side']);
  assert.equal(r.say('r1', 'Mia went east', 7).team, 'hunters');
});

test('validation: trimmed, capped at 300, empty rejected, unknown player, closed after the game', () => {
  const r = room();
  assert.equal(r.say('h', `  ${'x'.repeat(400)}  `, 1).text.length, 300);
  assert.throws(() => r.say('h', '   ', 2), /empty/);
  assert.throws(() => r.say('h', 42, 3), /empty/);
  assert.throws(() => r.say('ghost', 'hi', 4), /Not in this game/);
  r.start('h', 5);
  r.beginChase(6);
  r.timeUp();
  assert.throws(() => r.say('h', 'gg', 7), /over/);
});

test('rate limit: 5 messages per 5 s per player', () => {
  const r = room();
  for (let i = 0; i < 5; i++) r.say('h', `m${i}`, 1000 + i);
  assert.throws(() => r.say('h', 'spam', 1005), /Slow down/);
  assert.equal(r.say('r1', 'others unaffected', 1005).team, 'runners');
  assert.equal(r.say('h', 'later', 6001).text, 'later');
});

test('history keeps the last 100 per team', () => {
  const r = room();
  for (let i = 0; i < 120; i++) r.say('h', `m${i}`, i * 2000);
  const msgs = r.chatFor('h').messages;
  assert.equal(msgs.length, 100);
  assert.equal(msgs[0].text, 'm20');
});

// ---- socket delivery ----

type C = Socket<ServerToClientEvents, ClientToServerEvents>;
const http = createServer();
const { io } = attachSocket(http);
http.listen(0);
const url = `http://localhost:${(http.address() as AddressInfo).port}`;
const clients: C[] = [];
after(() => (clients.forEach(c => c.close()), io.close()));
const client = (id: string) => {
  const c: C = connect(url, { auth: { playerId: id }, forceNew: true });
  clients.push(c);
  return c;
};
const call = <T>(fn: (ack: (r: any) => void) => void) =>
  new Promise<T>((res, rej) => fn(r => (r.ok ? res(r.data) : rej(new Error(r.error)))));
const inbox = (c: C) => {
  const got: ChatMessage[] = [];
  c.on('chat:message', m => got.push(m));
  return got;
};

test('socket: each team only receives its own messages; ids are public', async () => {
  const hunter = client('chat-hunter-1');
  const r1 = client('chat-runner-1');
  const r2 = client('chat-runner-2');
  const room = await call<RoomView>(ack => hunter.emit('room:create', { name: 'Hana' }, ack));
  await call(ack => r1.emit('room:join', { code: room.code, name: 'Ravi' }, ack));
  await call(ack => r2.emit('room:join', { code: room.code, name: 'Mia' }, ack));
  const [hIn, r1In, r2In] = [inbox(hunter), inbox(r1), inbox(r2)];

  const sent = await call<ChatMessage>(ack => r1.emit('chat:send', { text: 'split up' }, ack));
  assert.equal(sent.fromId, publicId('chat-runner-1'));
  await call(ack => hunter.emit('chat:send', { text: 'hunter only' }, ack));
  await new Promise(r => setTimeout(r, 200));

  assert.deepEqual(r2In.map(m => m.text), ['split up']);
  assert.deepEqual(r1In.map(m => m.text), ['split up']);
  assert.deepEqual(hIn.map(m => m.text), ['hunter only']);
  assert.ok(!JSON.stringify([...hIn, ...r1In, ...r2In]).includes('chat-runner'), 'no secret ids');

  const history = await call<{ team: string; messages: ChatMessage[] }>(ack => r2.emit('chat:history', ack));
  assert.equal(history.team, 'runners');
  assert.deepEqual(history.messages.map(m => m.text), ['split up']);
  await assert.rejects(call(ack => client('chat-outsider').emit('chat:send', { text: 'hi' }, ack)), /Not in a game/);
});
