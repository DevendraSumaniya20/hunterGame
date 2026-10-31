import { ColorValue, Platform, PlatformColor, TextStyle } from 'react-native';
import type { Role } from '@hunt/shared';

// iOS semantic colours adapt to light/dark automatically.
// shortcut: Android gets fixed light-mode hex values, add a dark palette if Android dark mode matters.
const sys = (ios: string, fallback: string): ColorValue =>
  Platform.OS === 'ios' ? PlatformColor(ios) : fallback;

export const colors = {
  background: sys('systemGroupedBackground', '#F2F2F7'),
  surface: sys('secondarySystemGroupedBackground', '#FFFFFF'),
  floating: sys('systemBackground', '#FFFFFF'),
  label: sys('label', '#000000'),
  secondaryLabel: sys('secondaryLabel', '#3C3C4399'),
  tertiaryLabel: sys('tertiaryLabel', '#3C3C434D'),
  separator: sys('separator', '#3C3C4349'),
  fill: sys('tertiarySystemFill', '#7676801F'),
  tint: sys('systemRed', '#FF3B30'),
  red: sys('systemRed', '#FF3B30'),
  orange: sys('systemOrange', '#FF9500'),
  green: sys('systemGreen', '#34C759'),
  blue: sys('systemBlue', '#007AFF'),
  gray: sys('systemGray', '#8E8E93'),
  onTint: '#FFFFFF',
};

export const roleColor: Record<Role, ColorValue> = {
  hunter: colors.red,
  helper: colors.orange,
  runner: colors.green,
};

// Map overlays need plain strings, not PlatformColor.
export const roleHex: Record<Role, string> = {
  hunter: '#FF3B30',
  helper: '#FF9500',
  runner: '#34C759',
};

export const roleLabel: Record<Role, string> = {
  hunter: 'Hunter',
  helper: 'Helper',
  runner: 'Runner',
};

// Apple HIG text styles (default Dynamic Type size).
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22 },
  subheadline: { fontSize: 15, lineHeight: 20 },
  footnote: { fontSize: 13, lineHeight: 18 },
  rounded: { fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export const spacing = (n: number) => n * 8;
export const radius = { group: 10, button: 12, floating: 16 };

export const floatingShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
};
