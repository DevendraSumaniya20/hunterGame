import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TabBar } from '../components/TabBar';
import type { TabName } from '../components/TabIcon';
import { GameDetailScreen } from './GameDetailScreen';
import { HistoryScreen } from './HistoryScreen';
import { HomeScreen } from './HomeScreen';
import { LeaderboardScreen } from './LeaderboardScreen';
import { ProfileScreen } from './ProfileScreen';

/** Everything outside a live game. A game takes the whole screen instead. */
export function HomeTabs() {
  const [tab, setTab] = useState<TabName>('play');
  const [openGame, setOpenGame] = useState<number | null>(null);

  const select = (next: TabName) => {
    if (next === tab && next === 'history') setOpenGame(null); // re-tap pops to the list, like iOS
    setTab(next);
  };

  return (
    <View style={styles.root}>
      <View style={styles.page}>
        {tab === 'play' && <HomeScreen />}
        {tab === 'history' &&
          (openGame === null ? (
            <HistoryScreen onOpen={setOpenGame} />
          ) : (
            <GameDetailScreen gameId={openGame} onBack={() => setOpenGame(null)} />
          ))}
        {tab === 'leaderboard' && <LeaderboardScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </View>
      <TabBar active={tab} onChange={select} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flex: 1 },
});
