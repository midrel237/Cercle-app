import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { groupsApi } from '../../src/services/endpoints/groups';
import { paymentsApi, MobileMoneyProvider } from '../../src/services/endpoints/payments';
import { colors, fonts, radii, spacing } from '../../src/theme';

const PROVIDER_LABEL: Record<MobileMoneyProvider, string> = {
  MTN_MOMO: 'MTN Mobile Money',
  ORANGE_MONEY: 'Orange Money',
};

/**
 * Écran 32 — Confirmation via l'opérateur. Reçoit `groupId` de l'écran 31
 * (« Payer ma cotisation ») et `eventId` éventuel (cotisation cagnotte).
 * POST /payments/prepare crée la transaction PENDING (serveur : montant
 * repris du groupe, jamais du client), puis l'utilisateur saisit son code
 * PIN opérateur (fictif côté app : le vrai PIN est saisi sur le téléphone
 * via l'USSD/push de l'opérateur, jamais envoyé à Cercle).
 * POST /payments/initiate déclenche la collecte → écran 33 (processing).
 */
export default function PaymentPinPromptScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { groupId, eventId, amount: amountParam, provider: providerParam } =
    useLocalSearchParams<{
      groupId?: string;
      eventId?: string;
      amount?: string;
      provider?: string;
    }>();

  const [provider, setProvider] = useState<MobileMoneyProvider>(
    providerParam === 'ORANGE_MONEY' ? 'ORANGE_MONEY' : 'MTN_MOMO',
  );
  const [amount, setAmount] = useState<number | null>(
    amountParam ? Number(amountParam) : null,
  );
  const [pin, setPin] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Montant de la cotisation : chargé depuis le groupe si absent du
  // paramètre de navigation (relance directe de l'écran).
  useEffect(() => {
    let cancelled = false;
    if (amount !== null || !groupId) return;
    (async () => {
      try {
        const { data } = await groupsApi.getOne(groupId);
        if (!cancelled && data?.contributionAmount) {
          setAmount(Number(data.contributionAmount));
        }
      } catch {
        if (!cancelled) setError(t('payment.pin.loadError'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [amount, groupId, t]);

  const handleConfirm = async () => {
    if (!groupId || pin.length < 4 || preparing) return;
    setPreparing(true);
    setError(null);
    try {
      // 1. Transaction PENDING côté serveur (montant = celui du groupe).
      const { data: transaction } = await paymentsApi.prepareContribution(
        groupId,
        provider,
        eventId,
      );
      if (!transaction?.id) throw new Error('no transaction');

      // 2. Collecte via l'agrégateur : le vrai PIN opérateur sera demandé
      //    sur le téléphone de l'utilisateur (USSD/push), pas dans l'app.
      //    amount est un Decimal sérialisé en string → conversion number.
      await paymentsApi.initiate(transaction.id, provider, Number(transaction.amount));

      // 3. Écran 33 : en attente de la confirmation opérateur (webhook).
      router.replace({
        pathname: '/payment/processing',
        params: {
          transactionId: transaction.id,
          amount: String(Number(transaction.amount)),
          provider,
          groupId,
          ...(eventId ? { eventId } : {}),
        },
      });
    } catch {
      setError(t('payment.pin.prepareError'));
      setPreparing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.providerBadge}>
          <Text style={styles.providerText}>{PROVIDER_LABEL[provider]}</Text>
        </View>

        <Text style={styles.title}>{t('payment.pin.title')}</Text>
        <Text style={styles.subtitle}>
          {t('payment.pin.subtitle', { amount: (amount ?? 0).toLocaleString('fr-FR') })}
        </Text>

        {/* Sélecteur d'opérateur — maquette : MTN par défaut, Orange possible. */}
        <View style={styles.providerRow}>
          {(Object.keys(PROVIDER_LABEL) as MobileMoneyProvider[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.providerOption, provider === p && styles.providerOptionActive]}
              onPress={() => setProvider(p)}
            >
              <Text style={[styles.providerOptionText, provider === p && styles.providerOptionTextActive]}>
                {PROVIDER_LABEL[p]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.pinLabel}>{t('payment.pin.pinLabel')}</Text>
        <TextInput
          style={styles.pinInput}
          value={pin}
          onChangeText={(raw) => setPin(raw.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          secureTextEntry
          placeholder="••••"
          placeholderTextColor={colors.inkSoft}
          maxLength={6}
        />
        <Text style={styles.hint}>{t('payment.pin.hint')}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {preparing ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton label={t('payment.pin.confirmButton')} variant="dark" onPress={handleConfirm} disabled={preparing || pin.length < 4} />
        <AppButton
          label={t('common.cancel')}
          variant="ghost"
          onPress={() => {
            if (groupId) {
              router.replace({ pathname: '/group/[id]', params: { id: groupId } });
            } else {
              router.back();
            }
          }}
          disabled={preparing}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navyDark,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  providerBadge: {
    backgroundColor: colors.gold,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  providerText: {
    fontFamily: fonts.inter.bold,
    fontSize: 12,
    color: colors.navyDark,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 22,
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 13,
    color: colors.lavender,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  providerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  providerOption: {
    borderWidth: 1.5,
    borderColor: colors.navyLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.navy,
  },
  providerOptionActive: {
    borderColor: colors.gold,
    backgroundColor: colors.navyMedium,
  },
  providerOptionText: {
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.lavender,
  },
  providerOptionTextActive: {
    color: colors.white,
  },
  pinLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 12,
    color: colors.lavender,
    marginBottom: spacing.xs + 2,
  },
  pinInput: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 22,
    color: colors.white,
    letterSpacing: 8,
    backgroundColor: colors.navy,
    borderWidth: 1.5,
    borderColor: colors.navyLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    width: 180,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.inter.regular,
    fontSize: 10.5,
    color: colors.lavenderSoft,
    marginTop: spacing.xs + 2,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.gold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  spinner: {
    marginTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
    gap: spacing.sm,
  },
});
