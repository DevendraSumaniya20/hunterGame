import React from 'react';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';
import { spacing } from '../theme';

/**
 * Scroll view for any screen with text fields: when the keyboard opens it scrolls the focused field
 * into view above it (iOS and Android). Drag down to dismiss the keyboard.
 */
export function KeyboardScroll({
  children,
  ...props
}: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={spacing(3)}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
