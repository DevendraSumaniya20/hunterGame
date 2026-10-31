import React from 'react';
import { ColorValue, StyleSheet, View } from 'react-native';

export type TabName = 'play' | 'history' | 'leaderboard' | 'profile';

/** Simple glyphs drawn with views, so the tab bar needs no icon font. */
export function TabIcon({ name, color }: { name: TabName; color: ColorValue }) {
  switch (name) {
    case 'play':
      return (
        <View style={styles.box}>
          <View style={[styles.triangle, { borderLeftColor: color }]} />
        </View>
      );
    case 'history':
      return (
        <View style={styles.box}>
          <View style={[styles.clock, { borderColor: color }]}>
            <View style={[styles.handUp, { backgroundColor: color }]} />
            <View style={[styles.handRight, { backgroundColor: color }]} />
          </View>
        </View>
      );
    case 'leaderboard':
      return (
        <View style={[styles.box, styles.podium]}>
          {[11, 17, 7].map(h => (
            <View key={h} style={[styles.bar, { height: h, backgroundColor: color }]} />
          ))}
        </View>
      );
    case 'profile':
      return (
        <View style={styles.box}>
          <View style={[styles.head, { backgroundColor: color }]} />
          <View style={[styles.body, { backgroundColor: color }]} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  box: { width: 26, height: 24, alignItems: 'center', justifyContent: 'center' },
  triangle: {
    marginLeft: 4,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  clock: { width: 21, height: 21, borderRadius: 10.5, borderWidth: 2.2, alignItems: 'center', justifyContent: 'center' },
  handUp: { position: 'absolute', width: 2.2, height: 7, top: 3, left: 7.2, borderRadius: 1 },
  handRight: { position: 'absolute', width: 6, height: 2.2, top: 8.4, left: 7.2, borderRadius: 1 },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, justifyContent: 'center', paddingBottom: 2 },
  bar: { width: 6, borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5 },
  head: { width: 9, height: 9, borderRadius: 4.5, marginBottom: 2 },
  body: { width: 18, height: 9, borderTopLeftRadius: 9, borderTopRightRadius: 9 },
});
