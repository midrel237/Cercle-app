import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { useAuthStore } from '../../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface GroupMessage {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  user: { id: string; fullName: string | null };
}

/**
 * Écran 41 — Discussion du groupe. Chargement initial des 100 derniers
 * messages (GET /groups/:id/messages), envoi via POST, et polling léger
 * toutes les 15 s pour rafraîchir sans couche temps réel. Un vrai
 * WebSocket/SSE pourra remplacer le polling plus tard sans changer ce
 * modèle (cf. GroupMessage dans le schéma Prisma).
 *
 * En-tête conforme maquette : nom du groupe + « N membres » (clé
 * existante membersScreen.memberCount). Le « N en ligne » de la maquette
 * exige une couche présence temps réel (WebSocket) — non affiché plutôt
 * que simule.
 */
export default function GroupChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const listRef = useRef<FlatList<GroupMessage>>(null);

  const loadHeader = useCallback(async () => {
    if (!id) return;
    try {
      const [groupRes, membersRes] = await Promise.all([
        groupsApi.getOne(id),
        groupsApi.listMembers(id).catch(() => null),
      ]);
      setGroupName((groupRes.data as { name?: string })?.name ?? null);
      setMemberCount(membersRes?.data?.memberCount ?? null);
    } catch {
      // En-tête secondaire : ne pas bloquer l'écran si le chargement échoue.
    }
  }, [id]);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await groupsApi.listMessages(id, 100);
      // Le backend renvoie les messages en ordre décroissant : on inverse
      // pour l'affichage chronologique (plus ancien en haut).
      setMessages((data ?? []).slice().reverse());
      setError(null);
    } catch {
      setError(t('groupChat.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadHeader();
  }, [loadHeader]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Polling léger : rafraîchit la discussion tant que l'écran est affiché.
  useEffect(() => {
    const interval = setInterval(loadMessages, 15000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const handleSend = async () => {
    const body = input.trim();
    if (!body || !id || sending) return;
    setSending(true);
    try {
      const { data } = await groupsApi.sendMessage(id, body);
      if (data) {
        setMessages((prev) => [...prev, data]);
        setInput('');
        // Scroll vers le nouveau message.
        setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 50);
      }
    } catch {
      setError(t('groupChat.sendError'));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const headerSub =
    memberCount !== null
      ? t('membersScreen.memberCount', { count: memberCount })
      : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={router.back} hitSlop={12}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {groupName ?? t('groupChat.title')}
          </Text>
          {headerSub ? <Text style={styles.headerSub}>{headerSub}</Text> : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.goldDark} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          onLayout={() => listRef.current?.scrollToEnd?.({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.userId === user?.id;
            return (
              <View style={[styles.messageRow, mine && styles.messageRowMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  {!mine ? (
                    <Text style={styles.bubbleAuthor}>
                      {item.user.fullName ?? t('groupChat.unnamed')}
                    </Text>
                  ) : null}
                  <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextOther}>
                    {item.body}
                  </Text>
                  <Text style={mine ? styles.bubbleTimeMine : styles.bubbleTimeOther}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t('groupChat.empty')}</Text>
          }
          ListFooterComponent={
            error ? <Text style={styles.errorText}>{error}</Text> : null
          }
        />
      )}

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('groupChat.placeholder')}
          placeholderTextColor={colors.inkSoft}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={handleSend}
          disabled={sending || !input.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            (sending || !input.trim()) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed,
          ]}
        >
          <Text style={styles.sendButtonText}>{t('groupChat.send')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
    backgroundColor: colors.creamLight,
  },
  backText: {
    fontFamily: fonts.inter.medium,
    fontSize: 13,
    color: colors.navy,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 16,
    color: colors.navyDark,
  },
  headerSub: {
    fontFamily: fonts.inter.regular,
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md - 2,
  },
  bubbleMine: {
    backgroundColor: colors.navy,
  },
  bubbleOther: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  bubbleAuthor: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 11,
    color: colors.goldDark,
    marginBottom: 1,
  },
  bubbleTextMine: {
    fontFamily: fonts.inter.regular,
    fontSize: 13.5,
    color: colors.white,
    lineHeight: 19,
  },
  bubbleTextOther: {
    fontFamily: fonts.inter.regular,
    fontSize: 13.5,
    color: colors.navyDark,
    lineHeight: 19,
  },
  bubbleTimeMine: {
    fontFamily: fonts.inter.regular,
    fontSize: 9.5,
    color: colors.white,
    opacity: 0.7,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  bubbleTimeOther: {
    fontFamily: fonts.inter.regular,
    fontSize: 9.5,
    color: colors.inkSoft,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.sand,
    backgroundColor: colors.creamLight,
  },
  input: {
    flex: 1,
    fontFamily: fonts.inter.regular,
    fontSize: 13.5,
    color: colors.navyDark,
    backgroundColor: colors.creamLight,
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  sendButtonText: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 13,
    color: colors.navyDark,
  },
});
