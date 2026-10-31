import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { TabIcon, TabName } from './TabIcon';

const TABS: { name: TabName; label: string }[] = [
  { name: 'play', label: 'Play' },
  { name: 'history', label: 'History' },
  { name: 'leaderboard', label: 'Leaderboard' },
  { name: 'clans', label: 'Clans' },
  { name: 'profile', label: 'Profile' },
];

/** iOS-style bottom tab bar. */
export function TabBar({ active, onChange }: { active: TabName; onChange(tab: TabName): void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {TABS.map(t => {
        const selected = t.name === active;
        const color = selected ? colors.tint : colors.gray;
        return (
          <Pressable
            key={t.name}
            testID={`tab-${t.name}`}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(t.name)}
            style={styles.item}>
            <TabIcon name={t.name} color={color} />
            <Text style={[styles.label, { color }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.floating,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  item: { flex: 1, alignItems: 'center', paddingTop: 6, paddingBottom: 4, gap: 2, minHeight: 49 },
  label: { fontSize: 10, fontWeight: '500' },
});
