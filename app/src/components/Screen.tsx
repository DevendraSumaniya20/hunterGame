import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

interface Props {
  children: ReactNode;
  /** false for full-bleed screens like the map */
  padded?: boolean;
  /** inside the tab bar, which already clears the home indicator */
  tabbed?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, padded = true, tabbed = false, style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        padded && { paddingTop: insets.top + spacing(1), paddingBottom: (tabbed ? 0 : insets.bottom) + spacing(1) },
        padded && styles.padded,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing(2) },
});
