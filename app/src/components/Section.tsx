import React, { Children, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

interface Props {
  header?: string;
  footer?: string;
  children: ReactNode;
}

/** iOS grouped inset list section: rows share one rounded surface with hairline separators. */
export function Section({ header, footer, children }: Props) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.wrap}>
      {header && <Text style={styles.header}>{header}</Text>}
      {rows.length > 0 && (
        <View style={styles.group}>
          {rows.map((row, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.separator} />}
              {row}
            </View>
          ))}
        </View>
      )}
      {footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing(0.75) },
  header: { ...type.footnote, color: colors.secondaryLabel, paddingHorizontal: spacing(2) },
  footer: { ...type.footnote, color: colors.secondaryLabel, paddingHorizontal: spacing(2) },
  group: { backgroundColor: colors.surface, borderRadius: radius.group, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: spacing(2) },
});
