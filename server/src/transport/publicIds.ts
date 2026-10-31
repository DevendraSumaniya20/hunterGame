import { createHash } from 'node:crypto';
import type { CatchEvent, RoomView } from '@hunt/shared';

/**
 * Player ids are secrets (they unlock that player's profile and history), so other players only ever
 * see a one-way hash of them.
 */
export const publicId = (secretId: string) => createHash('sha256').update(secretId).digest('base64url').slice(0, 12);

export const publicCatch = (e: CatchEvent): CatchEvent => ({ ...e, runnerId: publicId(e.runnerId), byId: publicId(e.byId) });

export function publicView(v: RoomView): RoomView {
  return {
    ...v,
    hostId: publicId(v.hostId),
    me: publicId(v.me),
    players: v.players.map(p => ({ ...p, id: publicId(p.id) })),
    catches: v.catches.map(publicCatch),
  };
}
