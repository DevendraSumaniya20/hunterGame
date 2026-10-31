import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useChatStore } from '../store/chatStore';
import { colors, floatingShadow, spacing, type } from '../theme';

/** Opens team chat; shows how many messages arrived while it was closed. */
export function ChatButton() {
  const unread = useChatStore(s => s.unread);
  const setOpen = useChatStore(s => s.setOpen);
  return (
    <Pressable
      testID="chat-button"
      accessibilityRole="button"
      accessibilityLabel={unread ? `Team chat, ${unread} new` : 'Team chat'}
      onPress={() => setOpen(true)}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      <Text style={styles.label}>Team chat</Text>
      {unread > 0 && (
        <View style={styles.badge} testID="chat-unread">
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    alignSelf: 'flex-start',
    backgroundColor: colors.floating,
    borderRadius: 999,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    ...floatingShadow,
  },
  pressed: { opacity: 0.7 },
  label: { ...type.headline, color: colors.tint },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
