import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { groupsApi } from '../../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface ExitPreview {
  rotationReceived: boolean;
  rotationCycleNumber: number | null;
  contributionsPaid: string;
  outstandingDebt: string;
  amountToRefund: string;
  amountToSettle: string;
}

/**
 * Écran 50 — Quitter le groupe. Montants calculés par le serveur
 * (GET exit-preview) : tour non passé → cotisations remboursées après
 * validation admin ; tour déjà reçu → solde dû à régler. Le motif est
 * saisi libre (maquette : « Déménagement, je ne pourrai plus cotiser… »).
 */
export default function ExitRequestScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [preview, setPreview] = useState<ExitPreview | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await groupsApi.exitPreview(id);
        if (!cancelled) setPreview(data);
      } catch {
        if (!cancelled) setError(t('membersScreen.exitPreviewError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const handleLeave = async () => {
    if (!id || sending) return;
    setSending(true);
    setError(null);
    try {
      const finalReason = reason.trim() || t('membersScreen.exitDefaultReason');
      await groupsApi.requestExit(id, finalReason);
      const amount = preview?.rotationReceived
        ? Number(preview.amountToSettle)
        : Number(preview?.amountToRefund ?? 0);
      router.replace({
        pathname: '/group/[id]/exit-pending',
        params: {
          id,
          amount: String(amount),
          received: String(preview?.rotationReceived ?? false),
        },
      });
    } catch {
      setError(t('membersScreen.exitRequestError'));
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <>
            <Text style={styles.title}>{t('membersScreen.leaveTitle')}</Text>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('membersScreen.exitRotation')}</Text>
                <Text style={styles.detailValue}>
                  {preview?.rotationReceived
                    ? t('membersScreen.rotationAlreadyReceived', {
                        cycle: preview.rotationCycleNumber ?? '',
                      })
                    : t('membersScreen.rotationNotPassed')}
                </Text>
              </View>
              <View style={[styles.detailRow, styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>{t('membersScreen.exitContributionsPaid')}</Text>
                <Text style={styles.detailValue}>
                  {Number(preview?.contributionsPaid ?? 0).toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            </View>

            <Text style={styles.explain}>
              {preview?.rotationReceived
                ? t('membersScreen.exitExplainSettle', {
                    amount: Number(preview.amountToSettle).toLocaleString('fr-FR'),
                  })
                : t('membersScreen.exitExplainRefund', {
                    amount: Number(preview?.amountToRefund ?? 0).toLocaleString('fr-FR'),
                  })}
            </Text>

            <Text style={styles.reasonLabel}>{t('membersScreen.exitReasonLabel')}</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder={t('membersScreen.exitReasonPlaceholder')}
              placeholderTextColor={colors.inkSoft}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton label={t('common.cancel')} variant="ghost" onPress={router.back} disabled={sending} />
        <AppButton
          label={sending ? t('membersScreen.exitSending') : t('membersScreen.leaveConfirm')}
          onPress={handleLeave}
          disabled={sending || loading}
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
  spinner: { marginVertical: spacing.xl },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.lg },
  detailCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, marginBottom: spacing.md,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  detailLabel: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft },
  detailValue: { fontFamily: fonts.mono.medium, fontSize: 12.5, color: colors.navyDark },
  explain: { fontFamily: fonts.inter.regular, fontSize: 12, color: colors.inkSoft, lineHeight: 17, marginBottom: spacing.lg },
  reasonLabel: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navy, marginBottom: spacing.xs + 2 },
  reasonInput: {
    fontFamily: fonts.inter.regular, fontSize: 13.5, color: colors.navyDark,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    minHeight: 90,
  },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.md + 2, gap: spacing.sm },
});
