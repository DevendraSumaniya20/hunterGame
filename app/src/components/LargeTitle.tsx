import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  testID?: string;
}

export function LargeTitle({ title, subtitle, testID }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} testID={testID} accessibilityRole="header">
        {title}
      </Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing(0.5), gap: spacing(0.5) },
  title: { ...type.largeTitle, color: colors.label },
  subtitle: { ...type.subheadline, color: colors.secondaryLabel },
});
