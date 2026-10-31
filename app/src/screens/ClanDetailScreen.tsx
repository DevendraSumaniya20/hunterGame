import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { ClanDetail } from '@hunt/shared';
import { ClanView } from '../components/ClanView';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';
import { api } from '../data/api';
import { useApi } from '../hooks/useApi';
import { colors, spacing, type } from '../theme';

interface Props {
  tag: string;
  onBack(): void;
  /** my clan changed (joined or left) */
  onMembershipChange(clan: ClanDetail | null): void;
}

export function ClanDetailScreen({ tag, onBack, onMembershipChange }: Props) {
  const { data, error, reload } = useApi(() => api.clan(tag), [tag]);

  return (
    <Screen tabbed>
      <Pressable onPress={onBack} accessibilityRole="button" testID="back-button" hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>‹ Clans</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        {error && <EmptyState title="Couldn’t load this clan" message={error} />}
        {data && (
          <ClanView
            clan={data}
            onChange={c => {
              onMembershipChange(c);
              reload();
            }}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', paddingVertical: spacing(0.5) },
  backText: { ...type.body, color: colors.tint },
  content: { gap: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(4) },
});
