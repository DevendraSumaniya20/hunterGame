import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { connectSocket } from './src/data/socketClient';
import { useLocationTracking } from './src/hooks/useLocationTracking';
import { GameScreen } from './src/screens/GameScreen';
import { HomeTabs } from './src/screens/HomeTabs';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { useGameStore } from './src/store/gameStore';
import { useProfileStore } from './src/store/profileStore';

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
    case 'lobby':
      return <LobbyScreen locationError={error} />;
    case 'ended':
      return <ResultScreen />;
    default:
      return <GameScreen position={position} locationError={error} />;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="default" />
      <Root />
    </SafeAreaProvider>
  );
}
