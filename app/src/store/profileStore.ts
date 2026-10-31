import { create } from 'zustand';
import { DEFAULT_COLOR, PlayerColor } from '@hunt/shared';
import { api } from '../data/api';
import { readJson, writeJson } from '../data/storage';

const KEY = 'profile';

interface Prefs {
  name: string;
  color: PlayerColor;
  /** vibrate when someone is caught */
  haptics: boolean;
}

interface ProfileState extends Prefs {
  loaded: boolean;
  load(): Promise<void>;
  update(patch: Partial<Prefs>): void;
}

/** Player preferences: saved on the device, name/colour also synced to the server for leaderboards. */
export const useProfileStore = create<ProfileState>((set, get) => ({
  name: '',
  color: DEFAULT_COLOR,
  haptics: true,
  loaded: false,
  load: async () => {
    const saved = await readJson<Partial<Prefs>>(KEY);
    set({ ...saved, loaded: true });
  },
  update: patch => {
    set(patch);
    const { name, color, haptics } = get();
    writeJson(KEY, { name, color, haptics }).catch(() => {});
    // Best effort: the server also learns the name/colour from the next finished game.
    if (name && (patch.name !== undefined || patch.color !== undefined)) api.saveProfile(name, color).catch(() => {});
  },
}));
