import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../src/theme';

interface ChatMessage {
  from: 'me' | 'support';
  text: string;
  time: string;
}

/**
 * Écran 78 — Discussion avec le support : bulles de discussion type chat.
 * Le vrai canal (ticket backend) est différé ; l'écran affiche le flux
 * d'accueil du support et gère le clavier (suivi Phase 4 écran 41).
 */
export default function SupportChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: 'support',
      text: t('supportChat.welcomeMessage'),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [draft, setDraft] = useState('');
  const [supportTyping, setSupportTyping] = useState(false);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        from: 'me',
        text,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setDraft('');
    setSupportTyping(true);
    setTimeout(() => {
      setSupportTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          from: 'support',
          text: t('supportChat.autoReply'),
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={router.back} hitSlop={12}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('supportChat.headerTitle')}</Text>
          <Text style={styles.headerHint}>{t('supportChat.headerHint')}</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      <View style={styles.messages}>
        <Text style={styles.dayLabel}>{t('supportChat.today')}</Text>
        {messages.map((m, i) => (
          <View
            key={i}
            style={[styles.bubbleRow, m.from === 'me' ? styles.bubbleRowMe : styles.bubbleRowSupport]}
          >
            <View style={[styles.bubble, m.from === 'me' ? styles.bubbleMe : styles.bubbleSupport]}>
              <Text style={[styles.bubbleText, m.from === 'me' && styles.bubbleTextMe]}>
                {m.text}
              </Text>
            </View>
            <Text style={styles.bubbleTime}>{m.time}</Text>
          </View>
        ))}
        {supportTyping ? (
          <Text style={styles.typingText}>{t('supportChat.typing')}</Text>
        ) : null}
      </View>

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('supportChat.placeholder')}
          placeholderTextColor={colors.inkSoft}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={handleSend} hitSlop={8}>
          <Text style={styles.sendText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.sand,
  },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: fonts.inter.semiBold, fontSize: 14, color: colors.navyDark },
  headerHint: { fontFamily: fonts.inter.regular, fontSize: 10.5, color: colors.success },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  messages: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.xs + 2 },
  dayLabel: { alignSelf: 'center', fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.inkSoft, marginBottom: spacing.sm },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowSupport: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: radii.md, padding: spacing.sm + 2 },
  bubbleSupport: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.sand },
  bubbleMe: { backgroundColor: colors.navy },
  bubbleText: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.navyDark, lineHeight: 17 },
  bubbleTextMe: { color: colors.white },
  bubbleTime: { fontFamily: fonts.inter.regular, fontSize: 9.5, color: colors.inkSoft },
  typingText: { alignSelf: 'flex-start', fontFamily: fonts.inter.regular, fontSize: 11, color: colors.inkSoft, fontStyle: 'italic' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.sand,
  },
  input: {
    flex: 1, fontFamily: fonts.inter.regular, fontSize: 13, color: colors.navyDark,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.goldDark,
    alignItems: 'center', justifyContent: 'center',
  },
  sendText: { fontFamily: fonts.inter.semiBold, fontSize: 16, color: colors.white },
});
