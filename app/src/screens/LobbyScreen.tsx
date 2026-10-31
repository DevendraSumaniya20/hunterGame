import React from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { ChatButton } from '../components/ChatButton';
import { formatClock } from '../hooks/useCountdown';
import { PlayerList } from '../components/PlayerList';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { selectIsHost, useGameStore } from '../store/gameStore';
import { colors, radius, spacing, type } from '../theme';

export function LobbyScreen({ locationError }: { locationError: string | null }) {
  const view = useGameStore(s => s.view)!;
  const isHost = useGameStore(selectIsHost);
  const { startGame, leave, busy, error } = useGameStore();
  const runnerCount = view.players.filter(p => p.role === 'runner').length;
  const { headStartSec, durationSec, catchRadiusM } = view.settings;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.codeCard}>
          <Text style={styles.codeCaption}>Room code</Text>
          <Text style={styles.code} testID="room-code" selectable accessibilityLabel={`Room code ${view.code.split('').join(' ')}`}>
            {view.code}
          </Text>
          <Button
            title="Share code"
            variant="plain"
            onPress={() => Share.share({ message: `Join my Hunt game with code ${view.code}` })}
          />
        </View>

        <PlayerList
          header={`Players (${view.players.length})`}
          footer={isHost ? undefined : 'The host starts the game. Be ready to run.'}
          players={view.players}
          me={view.me}
          hostId={view.hostId}
        />

        <Section header="Rules">
          <Row title="Head start" value={`${headStartSec} s`} />
          <Row title="Game length" value={formatClock(durationSec)} />
          <Row title="Catch radius" value={`${catchRadiusM} m`} />
        </Section>

        {locationError && <Text style={styles.error}>{locationError}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <ChatButton />
        {isHost ? (
          <Button
            title={runnerCount ? `Start game` : 'Waiting for runners'}
            testID="start-button"
            onPress={startGame}
            disabled={!runnerCount}
            loading={busy}
          />
        ) : (
          <Text style={styles.waiting} testID="waiting-text">
            Waiting for the host to start
          </Text>
        )}
        <Button title="Leave game" variant="plain" testID="leave-button" onPress={leave} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(2) },
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.floating,
    paddingTop: spacing(3),
    paddingBottom: spacing(1),
    alignItems: 'center',
  },
  codeCaption: { ...type.subheadline, color: colors.secondaryLabel },
  code: { ...type.rounded, fontSize: 64, lineHeight: 76, fontWeight: '900', letterSpacing: 8, color: colors.label },
  error: { ...type.footnote, color: colors.red, textAlign: 'center' },
  waiting: { ...type.headline, color: colors.secondaryLabel, textAlign: 'center', paddingVertical: spacing(1.5) },
  footer: { gap: spacing(0.5), paddingTop: spacing(1) },
});
