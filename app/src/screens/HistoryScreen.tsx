import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { LargeTitle } from '../components/LargeTitle';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { api } from '../data/api';
import { formatWhen, gameSubtitle, gameTitle, plural } from '../format';
import { useApi } from '../hooks/useApi';
import { colors, spacing } from '../theme';

export function HistoryScreen({ onOpen }: { onOpen(gameId: number): void }) {
  const { data, error, loading, reload } = useApi(api.history, []);

  return (
    <Screen tabbed>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        <LargeTitle title="History" />
        {error ? (
          <EmptyState title="Couldn’t load your games" message={`${error}. Pull down to try again.`} />
        ) : data?.length === 0 ? (
          <EmptyState
            testID="history-empty"
            title="No games yet"
            message="Finished games show up here. Start one from the Play tab."
          />
        ) : (
          <Section header={data ? plural(data.length, 'game') : undefined}>
            {data?.map(g => (
              <Row
                key={g.id}
                testID={`game-${g.id}`}
                leading={<View style={[styles.dot, { backgroundColor: g.won ? colors.green : colors.red }]} />}
                title={gameTitle(g)}
                subtitle={`${formatWhen(g.endedAt)}\n${gameSubtitle(g)}`}
                onPress={() => onOpen(g.id)}
              />
            ))}
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(4) },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
