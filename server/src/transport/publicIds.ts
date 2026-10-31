import type { CatchEvent, RoomView } from '@hunt/shared';
import { publicId } from '../domain/ids';

export { publicId };

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
