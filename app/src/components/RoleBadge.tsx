import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Role } from '@hunt/shared';
import { roleColor, roleLabel, spacing, type } from '../theme';

/** Coloured dot plus role name, the way iOS marks status. */
export function RoleBadge({ role, testID }: { role: Role; testID?: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: roleColor[role] }]} />
      <Text testID={testID} style={[styles.text, { color: roleColor[role] }]}>
        {roleLabel[role]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { ...type.subheadline, fontWeight: '600' },
});
