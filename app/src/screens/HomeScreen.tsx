import React, { useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { DEFAULT_SETTINGS } from '@hunt/shared';
import { Button } from '../components/Button';
import { InputRow } from '../components/InputRow';
import { KeyboardScroll } from '../components/KeyboardScroll';
import { LargeTitle } from '../components/LargeTitle';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { useGameStore } from '../store/gameStore';
import { useProfileStore } from '../store/profileStore';
import { colors, spacing, type } from '../theme';

export function HomeScreen() {
  const { createRoom, joinRoom, busy, error, connected } = useGameStore();
  const [name, setName] = useState(() => useProfileStore.getState().name);
  const [code, setCode] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [headStart, setHeadStart] = useState(
    String(DEFAULT_SETTINGS.headStartSec),
  );
  const [minutes, setMinutes] = useState(
    String(DEFAULT_SETTINGS.durationSec / 60),
  );
  const [radius, setRadius] = useState(String(DEFAULT_SETTINGS.catchRadiusM));

  const hasName = name.trim().length > 0;
  const onCreate = () =>
    createRoom(name.trim(), {
      headStartSec: Number(headStart),
      durationSec: Number(minutes) * 60,
      catchRadiusM: Number(radius),
    });

  return (
    <Screen tabbed>
      <KeyboardScroll contentContainerStyle={styles.content}>
        <LargeTitle
          title="Hunt"
          subtitle="Outdoor tag for your phone. Caught runners join the hunters."
        />

        <Section footer="Other players see this name.">
          <InputRow
            label="Name"
            testID="name-input"
            value={name}
            onChangeText={setName}
            maxLength={20}
            placeholder="Required"
            textContentType="nickname"
          />
        </Section>

        <Section
          header="Join a game"
          footer="Ask the host for the 5-character room code."
        >
          <InputRow
            label="Room code"
            testID="code-input"
            value={code}
            // Rewriting text while typing breaks Android IME composition; the server uppercases codes.
            onChangeText={setCode}
            autoCapitalize="characters"
            autoComplete="off"
            keyboardType={
              Platform.OS === 'android' ? 'visible-password' : 'default'
            }
            maxLength={5}
            placeholder="ABCDE"
          />
        </Section>
        <Button
          title="Join game"
          testID="join-button"
          onPress={() => joinRoom(code.trim().toUpperCase(), name.trim())}
          disabled={!hasName || code.trim().length !== 5}
          loading={busy}
        />

        <Section
          header="Host a game"
          footer="You start as the hunter. Everyone else runs."
        >
          {showSettings && (
            <InputRow
              label="Head start"
              testID="headstart-input"
              unit="s"
              value={headStart}
              onChangeText={setHeadStart}
              keyboardType="number-pad"
            />
          )}
          {showSettings && (
            <InputRow
              label="Game length"
              unit="min"
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
            />
          )}
          {showSettings && (
            <InputRow
              label="Catch radius"
              unit="m"
              value={radius}
              onChangeText={setRadius}
              keyboardType="number-pad"
            />
          )}
          <Button
            title={showSettings ? 'Hide game settings' : 'Game settings'}
            variant="plain"
            onPress={() => setShowSettings(s => !s)}
          />
        </Section>
        <Button
          title="Create game"
          testID="create-button"
          onPress={onCreate}
          disabled={!hasName}
          loading={busy}
          variant="gray"
        />

        {error && (
          <Text style={styles.error} testID="error-text">
            {error}
          </Text>
        )}
        {!connected && (
          <Text style={styles.status}>Connecting to the game server…</Text>
        )}
      </KeyboardScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing(2.5),
    paddingTop: spacing(2),
    paddingBottom: spacing(4),
  },
  error: { ...type.footnote, color: colors.red, textAlign: 'center' },
  status: {
    ...type.footnote,
    color: colors.secondaryLabel,
    textAlign: 'center',
  },
});
