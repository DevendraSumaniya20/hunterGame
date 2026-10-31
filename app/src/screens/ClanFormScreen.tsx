import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { CLAN_DESCRIPTION_MAX, CLAN_NAME_LIMITS, ClanDetail, DEFAULT_COLOR, PlayerColor } from '@hunt/shared';
import { Button } from '../components/Button';
import { ColorPicker } from '../components/ColorPicker';
import { InputRow } from '../components/InputRow';
import { LargeTitle } from '../components/LargeTitle';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { api } from '../data/api';
import { colors, spacing, type } from '../theme';

interface Props {
  /** edit this clan; omit to create a new one */
  clan?: ClanDetail;
  onDone(clan: ClanDetail): void;
  onCancel(): void;
}

export function ClanFormScreen({ clan, onDone, onCancel }: Props) {
  const [name, setName] = useState(clan?.name ?? '');
  const [description, setDescription] = useState(clan?.description ?? '');
  const [color, setColor] = useState<PlayerColor>(clan?.color ?? DEFAULT_COLOR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [min] = CLAN_NAME_LIMITS;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const input = { name: name.trim(), description: description.trim(), color };
      onDone(await (clan ? api.updateClan(input) : api.createClan(input)));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen tabbed>
      <Pressable onPress={onCancel} accessibilityRole="button" testID="cancel-clan" hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>Cancel</Text>
      </Pressable>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <LargeTitle title={clan ? 'Edit clan' : 'New clan'} />
          <Section footer={`${min}–${CLAN_NAME_LIMITS[1]} characters. Names are unique.`}>
            <InputRow label="Name" testID="clan-name-input" value={name} onChangeText={setName} maxLength={CLAN_NAME_LIMITS[1]} placeholder="Required" />
          </Section>
          <Section footer={`Optional, up to ${CLAN_DESCRIPTION_MAX} characters.`}>
            <InputRow
              label="About"
              testID="clan-description-input"
              value={description}
              onChangeText={setDescription}
              maxLength={CLAN_DESCRIPTION_MAX}
              placeholder="What your clan is about"
            />
          </Section>
          <Section header="Colour">
            <ColorPicker value={color} onChange={setColor} testIDPrefix="clan-color" />
          </Section>
          {error && (
            <Text style={styles.error} testID="clan-form-error">
              {error}
            </Text>
          )}
          <Button
            title={clan ? 'Save changes' : 'Create clan'}
            testID="save-clan"
            onPress={save}
            loading={busy}
            disabled={name.trim().length < min}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { alignSelf: 'flex-start', paddingVertical: spacing(0.5) },
  backText: { ...type.body, color: colors.tint },
  content: { gap: spacing(3), paddingTop: spacing(1), paddingBottom: spacing(4) },
  error: { ...type.footnote, color: colors.red, textAlign: 'center' },
});
