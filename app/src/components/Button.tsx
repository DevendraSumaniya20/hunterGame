import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

interface Props {
  title: string;
  onPress(): void;
  /** filled = primary action, plain = tinted text, gray = secondary on maps */
  variant?: 'filled' | 'plain' | 'gray';
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'filled', disabled, loading, testID, style }: Props) {
  const filled = variant === 'filled';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        filled && styles.filled,
        variant === 'gray' && styles.gray,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={filled ? colors.onTint : colors.tint} />
      ) : (
        <Text style={[styles.label, { color: filled ? colors.onTint : colors.tint }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(2.5),
  },
  filled: { backgroundColor: colors.tint },
  gray: { backgroundColor: colors.fill },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  label: { ...type.headline },
});
