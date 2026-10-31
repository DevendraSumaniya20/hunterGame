module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Reanimated 4 (used by react-native-gifted-chat) needs the worklets plugin, and it must stay last.
  plugins: ['react-native-worklets/plugin'],
};
