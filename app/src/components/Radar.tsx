import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, floatingShadow, radius, spacing, type } from '../theme';

/** Runner's only intel: how far the closest hunter is. */
export function Radar({ distanceM }: { distanceM: number | null }) {
  const [color, label] =
    distanceM === null
      ? [colors.secondaryLabel, 'Looking for hunters']
      : distanceM < 50
        ? [colors.red, 'Hunter right behind you. Move.']
        : distanceM < 150
          ? [colors.orange, 'Hunter nearby']
          : [colors.green, 'You’re safe for now'];
  return (
    <View style={styles.card} testID="radar">
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.text}>
        <Text style={styles.caption}>Nearest hunter</Text>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
      <Text style={styles.distance}>{distanceM === null ? '–' : `${distanceM} m`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.floating,
    borderRadius: radius.floating,
    padding: spacing(2),
    ...floatingShadow,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  text: { flex: 1, gap: 2 },
  caption: { ...type.footnote, color: colors.secondaryLabel },
  label: { ...type.headline },
  distance: { ...type.rounded, ...type.title2, color: colors.label },
});
