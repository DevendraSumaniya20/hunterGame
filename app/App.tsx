import React, { useEffect } from 'react';
import { LogBox, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { connectSocket } from './src/data/socketClient';
import { useLocationTracking } from './src/hooks/useLocationTracking';
import { ChatSheet } from './src/screens/ChatScreen';
import { GameScreen } from './src/screens/GameScreen';
import { HomeTabs } from './src/screens/HomeTabs';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { useGameStore } from './src/store/gameStore';
import { useProfileStore } from './src/store/profileStore';

// react-native-gifted-chat 3.4 passes web-only dependency arrays to Reanimated hooks; harmless on native.
LogBox.ignoreLogs(['[Reanimated] Dependencies should only be used on the web']);

function Root() {
  const phase = useGameStore(s => s.view?.phase);
  const loaded = useProfileStore(s => s.loaded);
  // Track from the lobby on, so everyone has a fix before the chase starts.
  const { position, error } = useLocationTracking(!!phase && phase !== 'ended');

  useEffect(() => {
    useProfileStore.getState().load();
    connectSocket();
  }, []);

  if (!loaded) return null; // a few ms while saved name/colour load

  // Screens follow the server's game phase; no navigation stack needed.
  switch (phase) {
    case undefined:
      return <HomeTabs />;
    case 'ended':
      return <ResultScreen />;
    default:
      return (
        <>
          {phase === 'lobby' ? <LobbyScreen locationError={error} /> : <GameScreen position={position} locationError={error} />}
          <ChatSheet />
        </>
      );
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="default" />
          <Root />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
