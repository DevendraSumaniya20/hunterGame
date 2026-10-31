import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { Role, Winner } from '@hunt/shared';
import { Button } from '../components/Button';
import { LargeTitle } from '../components/LargeTitle';
import { PlayerList } from '../components/PlayerList';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { selectMe, useGameStore } from '../store/gameStore';
import { spacing } from '../theme';

export function ResultScreen() {
  const view = useGameStore(s => s.view)!;
  const me = useGameStore(selectMe);
  const leave = useGameStore(s => s.leave);

  const headline = view.winner === 'hunters' ? 'Hunters win!' : 'Runners escaped!';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <LargeTitle title={headline} subtitle={me && view.winner ? outcome(me.role, view.winner) : undefined} testID="result-title" />

        <Section header="Catches" footer={view.catches.length ? undefined : 'Nobody was caught.'}>
          {view.catches.map(c => (
            <Row key={c.runnerId} title={`${c.byName} caught ${c.runnerName}`} />
          ))}
        </Section>

        <PlayerList header="Final teams" players={view.players} me={view.me} hostId={view.hostId} />
      </ScrollView>
      <Button title="Done" testID="home-button" onPress={leave} />
    </Screen>
  );
}

// Caught runners switch teams, so spell out what happened to them instead of a plain won/lost.
export function outcome(role: Role, winner: Winner): string {
  if (role === 'runner') return 'You escaped.';
  if (role === 'helper')
    return winner === 'hunters'
      ? 'You were caught and joined the hunters. They won.'
      : 'You were caught, but the other runners escaped.';
  return winner === 'hunters' ? 'You caught every runner.' : 'The runners got away this time.';
}

const styles = StyleSheet.create({
  content: { gap: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(2) },
});
