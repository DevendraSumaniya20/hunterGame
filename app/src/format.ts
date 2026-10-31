import type { GameSummary } from '@hunt/shared';
import { formatClock } from './hooks/useCountdown';

/** "31 Oct, 14:02" in the device locale. */
export const formatWhen = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** "14:02:31" in the device locale. */
export const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Headline for a past game, from the player's point of view. */
export function gameTitle(g: GameSummary): string {
  if (g.startRole === 'runner') return g.caughtBy ? `Caught by ${g.caughtBy}` : 'Escaped';
  return g.won ? 'Caught everyone' : 'Runners got away';
}

/** Second line: what you did. */
export function gameSubtitle(g: GameSummary): string {
  if (g.startRole === 'hunter') return `Hunter, ${plural(g.catches, 'catch', 'catches')}`;
  const survived = g.survivalSec !== null ? `, survived ${formatClock(g.survivalSec)}` : '';
  return `Runner${survived}${g.catches ? `, then ${plural(g.catches, 'catch', 'catches')} as helper` : ''}`;
}
