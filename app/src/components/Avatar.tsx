import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Coloured circle with the player's initial. */
export function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}
      accessibilityElementsHidden
      importantForAccessibility="no">
      <Text style={[styles.initial, { fontSize: size * 0.45 }]}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontWeight: '700' },
});
