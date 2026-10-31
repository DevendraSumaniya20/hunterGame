import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import type { CatchEvent } from '@hunt/shared';
import { colors, floatingShadow, radius, spacing, type } from '../theme';

const VISIBLE_MS = 3500;

/** Drops in for each new catch, then fades out. */
export function CatchToast({ event, me }: { event: CatchEvent | null; me: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<CatchEvent | null>(null);

  useEffect(() => {
    if (!event) return;
    setShown(event);
    progress.setValue(0);
    Animated.sequence([
      Animated.spring(progress, { toValue: 1, useNativeDriver: true }),
      Animated.delay(VISIBLE_MS),
      Animated.timing(progress, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShown(null));
  }, [event, progress]);

  useEffect(() => {
    if (shown) AccessibilityInfo.announceForAccessibility(describe(shown, me).title);
  }, [shown, me]);

  if (!shown) return null;
  const { title, detail } = describe(shown, me);
  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        },
      ]}>
      <View style={styles.bar} />
      <View style={styles.text}>
        <Text testID="catch-toast" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </Animated.View>
  );
}

function describe(e: CatchEvent, me: string) {
  return e.runnerId === me
    ? { title: `${e.byName} caught you`, detail: 'You’re a helper now. Find the other runners.' }
    : { title: `${e.runnerName} was caught`, detail: `Caught by ${e.byName}. They’re hunting with you now.` };
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    gap: spacing(1.5),
    backgroundColor: colors.floating,
    borderRadius: radius.floating,
    padding: spacing(1.5),
    ...floatingShadow,
  },
  bar: { width: 4, borderRadius: 2, backgroundColor: colors.red },
  text: { flex: 1, gap: 2 },
  title: { ...type.headline, color: colors.label },
  detail: { ...type.subheadline, color: colors.secondaryLabel },
});
