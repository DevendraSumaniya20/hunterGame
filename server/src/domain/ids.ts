import { createHash } from 'node:crypto';

/**
 * Player ids are secrets (they unlock that player's profile, history and clan actions), so other
 * players only ever see a one-way hash of them.
 */
export const publicId = (secretId: string) => createHash('sha256').update(secretId).digest('base64url').slice(0, 12);
