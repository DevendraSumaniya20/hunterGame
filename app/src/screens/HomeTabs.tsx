import React, { useState } from 'react';
import type { ClanDetail } from '@hunt/shared';
import { StyleSheet, View } from 'react-native';
import { TabBar } from '../components/TabBar';
import type { TabName } from '../components/TabIcon';
import { ClanDetailScreen } from './ClanDetailScreen';
import { ClanFormScreen } from './ClanFormScreen';
import { ClansScreen } from './ClansScreen';
import { GameDetailScreen } from './GameDetailScreen';
import { HistoryScreen } from './HistoryScreen';
import { HomeScreen } from './HomeScreen';
import { LeaderboardScreen } from './LeaderboardScreen';
import { ProfileScreen } from './ProfileScreen';

/** Everything outside a live game. A game takes the whole screen instead. */
export function HomeTabs() {
  const [tab, setTab] = useState<TabName>('play');
  const [openGame, setOpenGame] = useState<number | null>(null);
  const [clanRoute, setClanRoute] = useState<ClanRoute>({ name: 'hub' });
  const [clanVersion, setClanVersion] = useState(0);
  const clanChanged = () => setClanVersion(v => v + 1);

  const select = (next: TabName) => {
    // Re-tapping the active tab pops back to its first screen, like iOS.
    if (next === tab && next === 'history') setOpenGame(null);
    if (next === tab && next === 'clans') setClanRoute({ name: 'hub' });
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
        {tab === 'clans' && clanRoute.name === 'hub' && (
          <ClansScreen
            version={clanVersion}
            onOpen={tag => setClanRoute({ name: 'clan', tag })}
            onCreate={() => setClanRoute({ name: 'form' })}
            onEdit={clan => setClanRoute({ name: 'form', clan })}
            onMembershipChange={clanChanged}
          />
        )}
        {tab === 'clans' && clanRoute.name === 'clan' && (
          <ClanDetailScreen tag={clanRoute.tag} onBack={() => setClanRoute({ name: 'hub' })} onMembershipChange={clanChanged} />
        )}
        {tab === 'clans' && clanRoute.name === 'form' && (
          <ClanFormScreen
            clan={clanRoute.clan}
            onCancel={() => setClanRoute({ name: 'hub' })}
            onDone={() => {
              clanChanged();
              setClanRoute({ name: 'hub' });
            }}
          />
        )}
        {tab === 'profile' && <ProfileScreen />}
      </View>
      <TabBar active={tab} onChange={select} />
    </View>
  );
}

type ClanRoute = { name: 'hub' } | { name: 'clan'; tag: string } | { name: 'form'; clan?: ClanDetail };

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flex: 1 },
});
