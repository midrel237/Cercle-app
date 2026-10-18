import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../../src/theme';

/**
 * Écran 47 — Rappel manuel à un membre en retard. Message pré-rempli
 * (nom + jours de retard), option « Envoyer aussi par SMS » (Switch).
 * POST reminder → Notification LATE_PAYMENT_ALERT + SMS si coché
 * (SmsProvider : console en dev, Africa's Talking en prod).
 */
export default function ManualReminderScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, memberId, name, days } = useLocalSearchParams<{
    id: string;
    memberId: string;
    name?: string;
    days?: string;
  }>();

  const daysLate = Number(days ?? 0);
  const [message, setMessage] = useState(
    t('membersScreen.reminderTemplate', { name: name ?? '', days: daysLate }),
  );
  const [alsoSms, setAlsoSms] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!id || !memberId || sending) return;
    setSending(true);
    setError(null);
    try {
      await groupsApi.sendReminder(id, memberId, message, alsoSms);
      router.replace({ pathname: '/group/[id]/members', params: { id } });
    } catch {
      setError(t('membersScreen.reminderError'));
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('membersScreen.reminderTitle')}</Text>
        <Text style={styles.subtitle}>
          {name ?? t('membersScreen.unnamed')} ·{' '}
          {t('membersScreen.lateDays', { count: daysLate })}
        </Text>

        <TextInput
          style={styles.messageInput}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        <View style={styles.smsRow}>
          <View style={styles.smsTextWrap}>
            <Text style={styles.smsLabel}>{t('membersScreen.alsoSmsLabel')}</Text>
            <Text style={styles.smsHint}>{t('membersScreen.alsoSmsHint')}</Text>
          </View>
          <Switch
            value={alsoSms}
            onValueChange={setAlsoSms}
            trackColor={{ false: colors.sand, true: colors.gold }}
            thumbColor={alsoSms ? colors.navyDark : colors.creamLight}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={sending ? t('membersScreen.reminderSending') : t('membersScreen.reminderSendButton')}
          onPress={handleSend}
          disabled={sending}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, paddingHorizontal: spacing.md },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: 2 },
  subtitle: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, marginBottom: spacing.lg },
  messageInput: {
    fontFamily: fonts.inter.regular, fontSize: 13.5, color: colors.navyDark, lineHeight: 20,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    minHeight: 120, marginBottom: spacing.md,
  },
  smsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  smsTextWrap: { flex: 1 },
  smsLabel: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navyDark, marginBottom: 1 },
  smsHint: { fontFamily: fonts.inter.regular, fontSize: 11, color: colors.inkSoft },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.md + 2 },
});
