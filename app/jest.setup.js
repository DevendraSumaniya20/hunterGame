/* eslint-env jest */
// Native keyboard library: plain ScrollView / passthrough provider in tests.
jest.mock('react-native-keyboard-controller', () => {
  const { ScrollView } = require('react-native');
  return {
    KeyboardAwareScrollView: ScrollView,
    KeyboardProvider: ({ children }) => children,
  };
});

// In-memory stand-ins for native storage and the network, shared by all tests.
jest.mock('./src/data/storage', () => {
  const mem = new Map();
  return {
    storage: {
      getItem: async k => mem.get(k) ?? null,
      setItem: async (k, v) => {
        mem.set(k, v);
      },
    },
    readJson: async k => (mem.has(k) ? JSON.parse(mem.get(k)) : null),
    writeJson: async (k, v) => {
      mem.set(k, JSON.stringify(v));
    },
    __mem: mem,
  };
});

jest.mock('./src/data/api', () => ({
  api: {
    profile: jest.fn(),
    saveProfile: jest.fn(() => Promise.resolve()),
    history: jest.fn(),
    game: jest.fn(),
    leaderboard: jest.fn(),
    myClan: jest.fn(),
    createClan: jest.fn(),
    updateClan: jest.fn(),
    joinClan: jest.fn(),
    leaveClan: jest.fn(),
    removeMember: jest.fn(),
    clan: jest.fn(),
    searchClans: jest.fn(),
    topClans: jest.fn(),
  },
}));
