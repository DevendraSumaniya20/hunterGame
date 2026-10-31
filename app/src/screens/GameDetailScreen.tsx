import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { LargeTitle } from '../components/LargeTitle';
import { RoleBadge } from '../components/RoleBadge';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { api } from '../data/api';
import { formatTime, formatWhen, plural } from '../format';
import { useApi } from '../hooks/useApi';
import { formatClock } from '../hooks/useCountdown';
import { colors, roleLabel, spacing, type } from '../theme';

export function GameDetailScreen({ gameId, onBack }: { gameId: number; onBack(): void }) {
  const { data: g, error } = useApi(() => api.game(gameId), [gameId]);

  return (
    <Screen tabbed>
      <Pressable onPress={onBack} accessibilityRole="button" testID="back-button" hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>‹ History</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        {error && <EmptyState title="Couldn’t load this game" message={error} />}
        {g && (
          <>
            <LargeTitle title={g.won ? 'You won' : 'You lost'} subtitle={formatWhen(g.endedAt)} testID="detail-title" />

            <Section header="Your game">
              <Row title="Started as" value={roleLabel[g.startRole]} />
              <Row title="Ended as" trailing={<RoleBadge role={g.finalRole} />} />
              <Row title="Catches" value={String(g.catches)} />
              {g.caughtBy && <Row title="Caught by" value={g.caughtBy} />}
              {g.survivalSec !== null && <Row title="Survived" value={formatClock(g.survivalSec)} />}
            </Section>

            <Section header="Game">
              <Row title="Winner" value={g.winner === 'hunters' ? 'Hunters' : 'Runners'} />
              <Row title="Chase length" value={formatClock(g.durationSec)} />
              <Row title="Head start" value={`${g.settings.headStartSec} s`} />
              <Row title="Catch radius" value={`${g.settings.catchRadiusM} m`} />
            </Section>

            <Section header="Catches" footer={g.timeline.length ? undefined : 'Nobody was caught.'}>
              {g.timeline.map(t => (
                <Row key={t.at + t.runnerName} title={`${t.byName} caught ${t.runnerName}`} value={formatTime(t.at)} />
              ))}
            </Section>

            <Section header={plural(g.roster.length, 'player')}>
              {g.roster.map(p => (
                <Row
                  key={p.name + p.startRole}
                  leading={<Avatar name={p.name} color={p.color} size={28} />}
                  title={p.isMe ? `${p.name} (you)` : p.name}
                  subtitle={p.catches ? plural(p.catches, 'catch', 'catches') : undefined}
                  trailing={<RoleBadge role={p.finalRole} />}
                />
              ))}
            </Section>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', paddingVertical: spacing(0.5) },
  backText: { ...type.body, color: colors.tint },
  content: { gap: spacing(3), paddingTop: spacing(1), paddingBottom: spacing(4) },
});
