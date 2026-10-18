import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { paymentsApi } from '../../src/services/endpoints/payments';
import { colors, fonts, radii, spacing } from '../../src/theme';

interface PaymentMethod {
  id: string;
  type: 'MOBILE_MONEY' | 'BANK_CARD' | 'BANK_TRANSFER';
  provider: string | null;
  phoneNumber: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  bankName: string | null;
  ibanLast4: string | null;
  isDefault: boolean;
}

/**
 * Écran 34 — Moyens de paiement (comptes liés). Liste GET /payments/methods
 * et propose l'ajout (écran 35). Sélection d'un moyen → retour au paiement
 * en cours si `groupId`/`transactionId` sont en paramètres (relance du
 * flux), sinon simple consultation depuis les paramètres du profil.
 */
export default function PaymentMethodsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { groupId, eventId, amount } = useLocalSearchParams<{
    groupId?: string;
    eventId?: string;
    amount?: string;
  }>();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await paymentsApi.listMethods();
      setMethods(data ?? []);
      setError(null);
    } catch {
      setError(t('payment.methods.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const labelFor = (m: PaymentMethod) => {
    if (m.type === 'MOBILE_MONEY') {
      return m.provider === 'ORANGE_MONEY' ? 'Orange Money' : 'MTN MoMo';
    }
    if (m.type === 'BANK_CARD') return `${m.cardBrand ?? 'Carte'} ••${m.cardLast4 ?? ''}`;
    return `${m.bankName ?? 'Virement'} ••${m.ibanLast4 ?? ''}`;
  };

  const sublabelFor = (m: PaymentMethod) => {
    if (m.type === 'MOBILE_MONEY') return m.phoneNumber ?? '';
    if (m.type === 'BANK_CARD') return t('payment.methods.cardLabel');
    return t('payment.methods.transferLabel');
  };

  const handleSelect = (m: PaymentMethod) => {
    // Retour au paiement en cours avec ce moyen si un groupe est en jeu.
    if (groupId) {
      router.replace({
        pathname: '/payment/pin-prompt',
        params: {
          groupId,
          ...(eventId ? { eventId } : {}),
          ...(amount ? { amount } : {}),
          provider: m.provider === 'ORANGE_MONEY' ? 'ORANGE_MONEY' : 'MTN_MOMO',
        },
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('payment.methods.title')}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : (
          <View style={styles.methodList}>
            {methods.map((m) => (
              <Pressable
                key={m.id}
                style={styles.methodRow}
                onPress={() => handleSelect(m)}
                disabled={!groupId}
              >
                <View style={styles.methodTextWrap}>
                  <Text style={styles.methodLabel}>{labelFor(m)}</Text>
                  <Text style={styles.methodSub}>{sublabelFor(m)}</Text>
                </View>
                {m.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>{t('payment.methods.defaultLabel')}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
            {methods.length === 0 ? (
              <Text style={styles.emptyText}>{t('payment.methods.empty')}</Text>
            ) : null}
          </View>
        )}

        <Text style={styles.securityNote}>{t('payment.methods.securityNote')}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={t('payment.methods.addButton')}
          onPress={() =>
            router.push({
              pathname: '/payment/add-method',
              params: { ...(groupId ? { groupId } : {}) },
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamLight,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  backText: {
    fontFamily: fonts.inter.medium,
    fontSize: 13,
    color: colors.navy,
  },
  title: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 24,
    color: colors.navyDark,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  spinner: {
    marginVertical: spacing.xl,
  },
  methodList: {
    gap: spacing.sm,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.creamLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  methodTextWrap: {
    flex: 1,
  },
  methodLabel: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 14,
    color: colors.navyDark,
    marginBottom: 1,
  },
  methodSub: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    color: colors.inkSoft,
  },
  defaultBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  defaultText: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 10,
    color: colors.success,
  },
  emptyText: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.inkSoft,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  securityNote: {
    fontFamily: fonts.inter.regular,
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
