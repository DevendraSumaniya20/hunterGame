import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, spacing, type } from '../theme';

interface Props extends TextInputProps {
  label: string;
  /** shown after the input, e.g. "s" or "m" */
  unit?: string;
}

/** Settings-style text field row for use inside a Section. */
export function InputRow({ label, unit, style, ...input }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.tertiaryLabel}
        autoCorrect={false}
        clearButtonMode="while-editing"
        selectTextOnFocus
        accessibilityLabel={label}
        {...input}
        style={[styles.input, style]}
      />
      {unit && <Text style={styles.unit}>{unit}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(2),
  },
  label: { ...type.body, color: colors.label, minWidth: 110 },
  input: { ...type.body, color: colors.label, flex: 1, textAlign: 'right', paddingVertical: spacing(1.25) },
  unit: { ...type.body, color: colors.secondaryLabel },
});
