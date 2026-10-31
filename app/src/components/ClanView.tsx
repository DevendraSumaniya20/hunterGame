import React, { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { CLAN_MAX_MEMBERS, ClanDetail, ClanMember } from '@hunt/shared';
import { api } from '../data/api';
import { plural } from '../format';
import { colors, spacing, type } from '../theme';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Row } from './Row';
import { Section } from './Section';

interface Props {
  clan: ClanDetail;
  /** called with the updated clan, or null when the viewer left it */
  onChange(clan: ClanDetail | null): void;
  onEdit?(clan: ClanDetail): void;
}

/** A clan's card, stats, members and every action the viewer is allowed to take. */
export function ClanView({ clan, onChange, onEdit }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owner = clan.myRole === 'owner';

  const run = async (fn: () => Promise<ClanDetail | null>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = (title: string, message: string, action: string, fn: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: action, style: 'destructive', onPress: fn },
    ]);

  const leave = () =>
    confirm(
      `Leave ${clan.name}?`,
      owner && clan.memberCount > 1
        ? 'The member who joined first becomes the new owner.'
        : owner
          ? 'You are the last member, so the clan will be deleted.'
          : 'You can join again later with the clan code.',
      'Leave',
      () =>
        run(async () => {
          await api.leaveClan();
          return null;
        }),
    );

  const remove = (m: ClanMember) =>
    confirm(`Remove ${m.name}?`, 'They can rejoin with the clan code.', 'Remove', () =>
      run(() => api.removeMember(m.id)),
    );

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Avatar name={clan.name} color={clan.color} size={72} />
        <Text style={styles.name} testID="clan-name">
          {clan.name}
        </Text>
        {clan.description ? <Text style={styles.description}>{clan.description}</Text> : null}
        <Text style={styles.codeCaption}>Clan code</Text>
        <Text style={styles.code} testID="clan-code" selectable accessibilityLabel={`Clan code ${clan.tag.split('').join(' ')}`}>
          {clan.tag}
        </Text>
        <Button
          title="Share code"
          variant="plain"
          testID="share-clan"
          onPress={() => Share.share({ message: `Join my clan "${clan.name}" on Hunt with code ${clan.tag}` })}
        />
      </View>

      <Section header="Clan stats">
        <Row title="Members" value={`${clan.memberCount} of ${CLAN_MAX_MEMBERS}`} />
        <Row title="Points" value={String(clan.points)} />
        <Row title="Games played" value={String(clan.games)} />
        <Row title="Wins" value={String(clan.wins)} />
      </Section>

      {clan.myRole === null &&
        (clan.inOtherClan ? (
          <Text style={styles.note}>Leave your current clan to join this one.</Text>
        ) : (
          <Button
            title="Join clan"
            testID="join-clan"
            loading={busy}
            disabled={clan.memberCount >= CLAN_MAX_MEMBERS}
            onPress={() => run(() => api.joinClan(clan.tag))}
          />
        ))}

      <Section header={plural(clan.memberCount, 'member')} footer="Points: 3 per win, 1 per runner caught.">
        {clan.roster.map(m => (
          <Row
            key={m.id}
            testID={`member-${m.name}`}
            leading={<Avatar name={m.name} color={m.color} size={30} />}
            title={m.isMe ? `${m.name} (you)` : m.name}
            subtitle={`${m.role === 'owner' ? 'Owner, ' : ''}${plural(m.games, 'game')}, ${plural(m.wins, 'win')}`}
            trailing={
              owner && !m.isMe ? (
                <Button title="Remove" variant="plain" testID={`remove-${m.name}`} onPress={() => remove(m)} />
              ) : undefined
            }
          />
        ))}
      </Section>

      {error && (
        <Text style={styles.error} testID="clan-error">
          {error}
        </Text>
      )}

      {clan.myRole && (
        <View style={styles.actions}>
          {owner && onEdit && <Button title="Edit clan" variant="gray" testID="edit-clan" onPress={() => onEdit(clan)} />}
          <Button title="Leave clan" variant="plain" testID="leave-clan" loading={busy} onPress={leave} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing(3) },
  hero: { alignItems: 'center', gap: spacing(0.75) },
  name: { ...type.title2, color: colors.label, textAlign: 'center' },
  description: { ...type.subheadline, color: colors.secondaryLabel, textAlign: 'center' },
  codeCaption: { ...type.footnote, color: colors.secondaryLabel, marginTop: spacing(1) },
  code: { ...type.rounded, fontSize: 34, fontWeight: '900', letterSpacing: 6, color: colors.label },
  note: { ...type.footnote, color: colors.secondaryLabel, textAlign: 'center' },
  error: { ...type.footnote, color: colors.red, textAlign: 'center' },
  actions: { gap: spacing(1) },
});
