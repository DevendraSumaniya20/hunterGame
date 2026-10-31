import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AvatarProps, GiftedChat, IMessage } from 'react-native-gifted-chat';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHAT_MAX_LENGTH, DEFAULT_COLOR, PlayerColor } from '@hunt/shared';
import { Avatar } from '../components/Avatar';
import { myTeam, useChatStore } from '../store/chatStore';
import { useGameStore } from '../store/gameStore';
import { colors, spacing, type } from '../theme';

/** Full-screen team chat. Mounted once by the game screens; visible while the chat store says open. */
export function ChatSheet() {
  const open = useChatStore(s => s.open);
  const setOpen = useChatStore(s => s.setOpen);
  return (
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      {/* Modals render outside the app's providers on some platforms. */}
      <SafeAreaProvider>
        <ChatScreen />
      </SafeAreaProvider>
    </Modal>
  );
}

function ChatScreen() {
  const { items, error, send, setOpen } = useChatStore();
  const team = useGameStore(s => myTeam(s.view));
  const me = useGameStore(s => s.view?.me ?? '');
  const insets = useSafeAreaInsets();
  const [headerBottom, setHeaderBottom] = useState(insets.top + 56);

  // GiftedChat wants newest first.
  const messages = useMemo<IMessage[]>(
    () =>
      [...items].reverse().map(i =>
        'system' in i
          ? { _id: i.id, text: i.text, createdAt: i.at, system: true, user: { _id: 'system' } }
          : {
              _id: i.id,
              text: i.text,
              createdAt: i.at,
              user: { _id: i.fromId, name: i.name },
            },
      ),
    [items],
  );

  const colorOf = useMemo(() => {
    const map = new Map<string, PlayerColor>();
    items.forEach(i => 'fromId' in i && map.set(i.fromId, i.color));
    return map;
  }, [items]);
  const renderAvatar = useCallback(
    ({ currentMessage }: AvatarProps<IMessage>) => {
      const u = currentMessage?.user;
      return <Avatar name={u?.name ?? '?'} color={colorOf.get(String(u?._id)) ?? DEFAULT_COLOR} size={32} />;
    },
    [colorOf],
  );

  return (
    <View style={styles.root}>
      <View
        style={[styles.header, { paddingTop: insets.top + spacing(1) }]}
        onLayout={e => setHeaderBottom(e.nativeEvent.layout.height)}>
        <View style={styles.headerText}>
          <Text style={styles.title} testID="chat-title">
            {team === 'hunters' ? 'Hunter team' : 'Runner team'}
          </Text>
          <Text style={styles.subtitle}>Only your team can see these messages.</Text>
        </View>
        <Pressable onPress={() => setOpen(false)} accessibilityRole="button" testID="chat-done" hitSlop={12}>
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </View>
      {error && (
        <Text style={styles.error} testID="chat-error">
          {error}
        </Text>
      )}
      <GiftedChat
        messages={messages}
        user={{ _id: me }}
        onSend={sent => sent.forEach(m => send(m.text))}
        isUsernameVisible
        renderAvatar={renderAvatar}
        textInputProps={{ placeholder: 'Message your team', maxLength: CHAT_MAX_LENGTH, testID: 'chat-input' }}
        keyboardAvoidingViewProps={{ keyboardVerticalOffset: headerBottom }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingBottom: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(1.5),
    backgroundColor: colors.floating,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  headerText: { flex: 1, gap: 2 },
  title: { ...type.headline, color: colors.label },
  subtitle: { ...type.footnote, color: colors.secondaryLabel },
  done: { ...type.headline, color: colors.tint },
  error: { ...type.footnote, color: colors.red, textAlign: 'center', paddingVertical: spacing(0.75) },
});
