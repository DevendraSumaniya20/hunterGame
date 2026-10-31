import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ClanDetail, ClanSummary, Period } from '@hunt/shared';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ClanView } from '../components/ClanView';
import { EmptyState } from '../components/EmptyState';
import { InputRow } from '../components/InputRow';
import { LargeTitle } from '../components/LargeTitle';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { SegmentedControl } from '../components/SegmentedControl';
import { api } from '../data/api';
import { plural } from '../format';
import { useApi } from '../hooks/useApi';
import { colors, spacing, type } from '../theme';

type Segment = 'mine' | 'top' | 'search';

const SEGMENTS = [
  { value: 'mine' as Segment, label: 'My clan' },
  { value: 'top' as Segment, label: 'Top clans' },
  { value: 'search' as Segment, label: 'Search' },
];
const PERIODS = [
  { value: 'week' as Period, label: 'This week' },
  { value: 'all' as Period, label: 'All time' },
];

interface Props {
  /** bump to refetch my clan after it changed elsewhere */
  version: number;
  onOpen(tag: string): void;
  onCreate(): void;
  onEdit(clan: ClanDetail): void;
  onMembershipChange(clan: ClanDetail | null): void;
}

export function ClansScreen({ version, onOpen, onCreate, onEdit, onMembershipChange }: Props) {
  const [segment, setSegment] = useState<Segment>('mine');
  const mine = useApi(api.myClan, [version]);

  return (
    <Screen tabbed>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={false} onRefresh={mine.reload} />}>
        <LargeTitle title="Clans" />
        <SegmentedControl<Segment> testID="clans-segment" options={SEGMENTS} value={segment} onChange={setSegment} />
        {segment === 'mine' &&
          (mine.error ? (
            <EmptyState title="Couldn’t load your clan" message={`${mine.error}. Pull down to try again.`} />
          ) : mine.data ? (
            <ClanView clan={mine.data} onChange={onMembershipChange} onEdit={onEdit} />
          ) : (
            !mine.loading && <NoClan onCreate={onCreate} onJoined={onMembershipChange} />
          ))}
        {segment === 'top' && <TopClans onOpen={onOpen} />}
        {segment === 'search' && <SearchClans onOpen={onOpen} />}
      </ScrollView>
    </Screen>
  );
}

function NoClan({ onCreate, onJoined }: { onCreate(): void; onJoined(c: ClanDetail): void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      onJoined(await api.joinClan(code.trim().toUpperCase()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.block}>
      <EmptyState testID="no-clan" title="You’re not in a clan" message="Team up with friends: your wins and catches earn points for the clan." />
      <Button title="Create a clan" testID="create-clan" onPress={onCreate} />
      <Section header="Have a code?" footer={error ?? 'Ask a clan member for their 6-character code.'}>
        <InputRow
          label="Clan code"
          testID="clan-code-input"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={6}
          placeholder="ABC123"
        />
      </Section>
      <Button title="Join with code" variant="gray" testID="join-with-code" onPress={join} loading={busy} disabled={code.trim().length !== 6} />
    </View>
  );
}

function ClanRow({ clan, rank, isMine, onOpen }: { clan: ClanSummary; rank?: number; isMine?: boolean; onOpen(tag: string): void }) {
  return (
    <Row
      testID={`clan-${clan.tag}`}
      leading={
        <View style={styles.leading}>
          {rank !== undefined && <Text style={[styles.rank, rank <= 3 && styles.podium]}>{rank}</Text>}
          <Avatar name={clan.name} color={clan.color} size={30} />
        </View>
      }
      title={isMine ? `${clan.name} (yours)` : clan.name}
      subtitle={plural(clan.memberCount, 'member')}
      value={plural(clan.points, 'pt', 'pts')}
      onPress={() => onOpen(clan.tag)}
    />
  );
}

function TopClans({ onOpen }: { onOpen(tag: string): void }) {
  const [period, setPeriod] = useState<Period>('week');
  const { data, error } = useApi(() => api.topClans(period), [period]);
  return (
    <View style={styles.block}>
      <SegmentedControl<Period> testID="clan-period" options={PERIODS} value={period} onChange={setPeriod} />
      {error ? (
        <EmptyState title="Couldn’t load clans" message={error} />
      ) : data?.length === 0 ? (
        <EmptyState title="No clans yet" message="Create the first one from My clan." />
      ) : (
        <Section footer="Points: 3 per win, 1 per runner caught, by current members.">
          {data?.map(c => <ClanRow key={c.tag} clan={c} rank={c.rank} isMine={c.isMine} onOpen={onOpen} />)}
        </Section>
      )}
    </View>
  );
}

function SearchClans({ onOpen }: { onOpen(tag: string): void }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);
  const { data, error, loading } = useApi(() => (debounced ? api.searchClans(debounced) : Promise.resolve([])), [debounced]);

  return (
    <View style={styles.block}>
      <Section>
        <InputRow label="Search" testID="clan-search-input" value={query} onChangeText={setQuery} placeholder="Name or code" returnKeyType="search" autoComplete="off" />
      </Section>
      {error ? (
        <EmptyState title="Search failed" message={error} />
      ) : debounced && !loading && data?.length === 0 ? (
        <EmptyState testID="no-results" title="No clans found" message={`Nothing matches “${debounced}”.`} />
      ) : (
        <Section>{data?.map(c => <ClanRow key={c.tag} clan={c} onOpen={onOpen} />)}</Section>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(4) },
  block: { gap: spacing(2) },
  leading: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  rank: { ...type.headline, ...type.rounded, width: 24, textAlign: 'center', color: colors.secondaryLabel },
  podium: { color: colors.label },
});
