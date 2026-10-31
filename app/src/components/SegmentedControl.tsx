import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, floatingShadow } from '../theme';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange(value: T): void;
  testID?: string;
}

/** iOS segmented control. */
export function SegmentedControl<T extends string>({ options, value, onChange, testID }: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist" testID={testID}>
      {options.map(o => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={testID && `${testID}-${o.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.selected]}>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: 9, padding: 2 },
  segment: { flex: 1, minHeight: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.floating, ...floatingShadow, shadowOpacity: 0.08, elevation: 2 },
  label: { fontSize: 13, fontWeight: '500', color: colors.label },
  selectedLabel: { fontWeight: '600' },
});
