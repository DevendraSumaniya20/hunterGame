import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';

/** Centered message for empty lists and errors. */
export function EmptyState({ title, message, testID }: { title: string; message: string; testID?: string }) {
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing(6), paddingHorizontal: spacing(3), gap: spacing(1) },
  title: { ...type.title2, color: colors.label, textAlign: 'center' },
  message: { ...type.subheadline, color: colors.secondaryLabel, textAlign: 'center' },
});
