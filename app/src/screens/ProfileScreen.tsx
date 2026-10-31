import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ColorPicker } from '../components/ColorPicker';
import { InputRow } from '../components/InputRow';
import { LargeTitle } from '../components/LargeTitle';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { api } from '../data/api';
import { useApi } from '../hooks/useApi';
import { formatClock } from '../hooks/useCountdown';
import { useProfileStore } from '../store/profileStore';
import { colors, spacing, type } from '../theme';

const RULES = [
  'The host is the hunter. Everyone else is a runner.',
  'When the game starts, runners get a head start while the hunter’s map stays hidden.',
  'Then the chase begins: hunters see every runner on the map.',
  'Get within the catch radius of a runner to catch them. Caught runners become helpers and hunt too.',
  'Hunters win by catching everyone. Runners win if anyone is still free when the clock runs out.',
];

export function ProfileScreen() {
  const { name, color, haptics, update } = useProfileStore();
  const [draft, setDraft] = useState(name);
  const { data, error, loading, reload } = useApi(api.profile, []);
  const s = data?.stats;
  const winRate = s && s.games ? Math.round((s.wins / s.games) * 100) : 0;

  return (
    <Screen tabbed>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        <LargeTitle title="Profile" />

        <View style={styles.hero}>
          <Avatar name={draft || '?'} color={color} size={72} />
          <Text style={styles.heroName}>{draft || 'Add your name'}</Text>
        </View>

        <Section footer="Other players see this name and colour.">
          <InputRow
            label="Name"
            testID="profile-name"
            value={draft}
            onChangeText={setDraft}
            onEndEditing={() => draft.trim() && update({ name: draft.trim() })}
            maxLength={20}
            placeholder="Required"
          />
          <ColorPicker value={color} onChange={c => update({ color: c })} />
        </Section>

        <Section header="Your stats" footer={error ? `${error}. Pull down to try again.` : undefined}>
          <Row title="Games played" value={s ? String(s.games) : '–'} testID="stat-games" />
          <Row title="Wins" value={s ? `${s.wins} (${winRate}%)` : '–'} />
          <Row title="Runners caught" value={s ? String(s.catches) : '–'} />
          <Row title="Times caught" value={s ? String(s.timesCaught) : '–'} />
          <Row title="Longest escape" value={s ? formatClock(s.bestSurvivalSec) : '–'} />
        </Section>

        <Section header="Settings">
          <Row
            title="Vibrate on catches"
            trailing={
              <Switch
                testID="haptics-switch"
                value={haptics}
                onValueChange={v => update({ haptics: v })}
                trackColor={{ true: colors.green as string }}
              />
            }
          />
        </Section>

        <Section header="How to play">
          {RULES.map((rule, i) => (
            <Row key={rule} multiline title={rule} leading={<Text style={styles.step}>{i + 1}</Text>} />
          ))}
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(4) },
  hero: { alignItems: 'center', gap: spacing(1) },
  heroName: { ...type.title2, color: colors.label },
  step: { ...type.headline, ...type.rounded, width: 18, color: colors.tint },
});
