import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Phase } from '@hunt/shared';
import { formatClock, useCountdown } from '../hooks/useCountdown';
import { colors, floatingShadow, radius, spacing, type } from '../theme';

const TITLES: Record<Phase, string> = {
  lobby: 'Waiting',
  headstart: 'Head start',
  chase: 'Chase',
  ended: 'Game over',
};

interface Props {
  phase: Phase;
  endsAt: number | null;
  subtitle?: string;
}

export function PhaseBanner({ phase, endsAt, subtitle }: Props) {
  const secs = useCountdown(endsAt);
  const urgent = phase === 'chase' && secs <= 30;
  return (
    <View style={styles.card} testID="phase-banner">
      <View style={styles.text}>
        <Text style={styles.title}>{TITLES[phase]}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {endsAt && (
        <Text
          testID="phase-clock"
          accessibilityLabel={`${secs} seconds left`}
          style={[styles.clock, urgent && { color: colors.red }]}>
          {formatClock(secs)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.floating,
    borderRadius: radius.floating,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    ...floatingShadow,
  },
  text: { flex: 1, gap: 2 },
  title: { ...type.headline, color: colors.label },
  subtitle: { ...type.subheadline, color: colors.secondaryLabel },
  clock: { ...type.rounded, fontSize: 34, fontWeight: '800', color: colors.label },
});
