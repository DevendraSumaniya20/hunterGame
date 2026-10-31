import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Board, Period } from '@hunt/shared';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { LargeTitle } from '../components/LargeTitle';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { SegmentedControl } from '../components/SegmentedControl';
import { api } from '../data/api';
import { plural } from '../format';
import { useApi } from '../hooks/useApi';
import { colors, spacing, type } from '../theme';

const BOARDS = [
  { value: 'hunters' as Board, label: 'Hunters' },
  { value: 'survivors' as Board, label: 'Survivors' },
];
const PERIODS = [
  { value: 'week' as Period, label: 'This week' },
  { value: 'all' as Period, label: 'All time' },
];

export function LeaderboardScreen() {
  const [board, setBoard] = useState<Board>('hunters');
  const [period, setPeriod] = useState<Period>('week');
  const { data, error, loading, reload } = useApi(() => api.leaderboard(board, period), [board, period]);

  const unit = (n: number) => (board === 'hunters' ? plural(n, 'catch', 'catches') : plural(n, 'escape'));

  return (
    <Screen tabbed>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        <LargeTitle title="Leaderboard" />
        <View style={styles.controls}>
          <SegmentedControl<Board> testID="board" options={BOARDS} value={board} onChange={setBoard} />
          <SegmentedControl<Period> testID="period" options={PERIODS} value={period} onChange={setPeriod} />
        </View>
        {error ? (
          <EmptyState title="Couldn’t load the leaderboard" message={`${error}. Pull down to try again.`} />
        ) : data?.length === 0 ? (
          <EmptyState
            testID="leaderboard-empty"
            title="No one here yet"
            message={board === 'hunters' ? 'Catch a runner to get on the board.' : 'Escape a chase to get on the board.'}
          />
        ) : (
          <Section
            footer={
              board === 'hunters'
                ? 'Ranked by runners caught, as hunter or helper.'
                : 'Ranked by chases survived without being caught.'
            }>
            {data?.map(r => (
              <Row
                key={r.rank}
                testID={`rank-${r.rank}`}
                leading={
                  <View style={styles.leading}>
                    <Text style={[styles.rank, r.rank <= 3 && styles.podium]}>{r.rank}</Text>
                    <Avatar name={r.name} color={r.color} size={30} />
                  </View>
                }
                title={r.isMe ? `${r.name} (you)` : r.name}
                subtitle={plural(r.games, 'game')}
                value={unit(r.value)}
              />
            ))}
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(4) },
  controls: { gap: spacing(1) },
  leading: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  rank: { ...type.headline, ...type.rounded, width: 24, textAlign: 'center', color: colors.secondaryLabel },
  podium: { color: colors.label },
});
