import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PLAYER_COLORS, PlayerColor } from '@hunt/shared';
import { colors, spacing } from '../theme';

export const COLOR_NAMES: Record<PlayerColor, string> = {
  '#007AFF': 'Blue',
  '#AF52DE': 'Purple',
  '#FF2D55': 'Pink',
  '#5AC8FA': 'Teal',
  '#FFCC00': 'Yellow',
  '#8E8E93': 'Gray',
};

/** Row of colour swatches, for use inside a Section. */
export function ColorPicker({ value, onChange, testIDPrefix = 'color' }: {
  value: PlayerColor;
  onChange(c: PlayerColor): void;
  testIDPrefix?: string;
}) {
  return (
    <View style={styles.swatches} accessibilityRole="radiogroup">
      {PLAYER_COLORS.map(c => (
        <Pressable
          key={c}
          testID={`${testIDPrefix}-${COLOR_NAMES[c].toLowerCase()}`}
          accessibilityRole="radio"
          accessibilityLabel={COLOR_NAMES[c]}
          accessibilityState={{ checked: c === value, selected: c === value }} // iOS only announces "selected"
          onPress={() => onChange(c)}
          hitSlop={6}
          style={[styles.ring, c === value && styles.ringSelected]}>
          <View style={[styles.swatch, { backgroundColor: c }]} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing(2), paddingVertical: spacing(1.5) },
  ring: { padding: 3, borderRadius: 22, borderWidth: 2, borderColor: 'transparent' },
  ringSelected: { borderColor: colors.label },
  swatch: { width: 30, height: 30, borderRadius: 15 },
});
