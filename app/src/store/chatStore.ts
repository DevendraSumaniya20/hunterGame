import { Keyboard } from 'react-native';
import { create } from 'zustand';
import { ChatMessage, RoomView, Team, teamOf } from '@hunt/shared';
import { gameService } from '../data/gameService';
import { socket } from '../data/socketClient';
import { useGameStore } from './gameStore';

/** A team message, or a local notice like "you joined the hunters". */
export type ChatItem = ChatMessage | { id: string; system: true; text: string; at: number };

interface ChatState {
  team: Team | null;
  /** oldest first */
  items: ChatItem[];
  unread: number;
  open: boolean;
  error: string | null;
  setOpen(open: boolean): void;
  send(text: string): Promise<void>;
}

/** The player's team, straight from the live game state (single source of truth). */
export const myTeam = (view: RoomView | null | undefined): Team | null => {
  const me = view?.players.find(p => p.id === view.me);
  return me ? teamOf(me.role) : null;
};

const merge = (items: ChatItem[], incoming: ChatMessage[]) => {
  const seen = new Set(items.map(i => i.id));
  return [...items, ...incoming.filter(m => !seen.has(m.id))].sort((a, b) => a.at - b.at);
};

export const useChatStore = create<ChatState>((set, get) => ({
  team: null,
  items: [],
  unread: 0,
  open: false,
  error: null,
  setOpen: open => {
    // Android keeps the keyboard up after the sheet closes, covering the lobby buttons.
    if (!open) Keyboard.dismiss();
    set(open ? { open, unread: 0 } : { open });
  },
  send: async text => {
    set({ error: null });
    try {
      const msg = await gameService.sendChat(text);
      set({ items: merge(get().items, [msg]) });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));

socket.on('chat:message', m => {
  const s = useChatStore.getState();
  if (m.team !== myTeam(useGameStore.getState().view)) return; // stale delivery from before a team switch
  if (s.items.some(i => i.id === m.id)) return; // already have it (send ack, reconnect)
  const mine = m.fromId === useGameStore.getState().view?.me;
  useChatStore.setState({ items: merge(s.items, [m]), unread: s.open || mine ? s.unread : s.unread + 1 });
});

async function loadHistory(team: Team) {
  try {
    const h = await gameService.chatHistory();
    if (h.team === useChatStore.getState().team) useChatStore.setState(s => ({ items: merge(s.items, h.messages) }));
  } catch {
    // history is a nicety; live messages still arrive
  }
  return team;
}

// Follow the player's team: joining a game loads its chat; getting caught moves you to the hunters' chat.
useGameStore.subscribe(({ view }) => {
  const team = myTeam(view);
  const current = useChatStore.getState().team;
  if (team === current) return;
  if (!team) {
    useChatStore.setState({ team: null, items: [], unread: 0, open: false, error: null });
    return;
  }
  const switched = current === 'runners' && team === 'hunters';
  useChatStore.setState({
    team,
    items: switched
      ? [{ id: `switch-${Date.now()}`, system: true, text: 'You were caught. You now chat with the hunters.', at: Date.now() }]
      : [],
    unread: 0,
    error: null,
  });
  loadHistory(team);
});
