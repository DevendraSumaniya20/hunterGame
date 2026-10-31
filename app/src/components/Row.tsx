import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  value?: string;
  /** replaces `value` on the trailing side */
  trailing?: ReactNode;
  leading?: ReactNode;
  /** makes the row tappable and adds a disclosure chevron */
  onPress?(): void;
  /** let long titles wrap instead of truncating */
  multiline?: boolean;
  testID?: string;
}

/** One line in a Section: title on the left, value or control on the right. */
export function Row({ title, subtitle, value, trailing, leading, onPress, multiline, testID }: Props) {
  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={multiline ? undefined : 1}>
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {trailing ?? (value !== undefined && <Text style={styles.value}>{value}</Text>)}
      {onPress && <Text style={styles.chevron}>›</Text>}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
  },
  pressed: { backgroundColor: colors.fill },
  text: { flex: 1, gap: 2 },
  title: { ...type.body, color: colors.label },
  subtitle: { ...type.footnote, color: colors.secondaryLabel },
  value: { ...type.body, color: colors.secondaryLabel },
  chevron: { fontSize: 22, color: colors.tertiaryLabel, marginLeft: -spacing(0.5) },
});
