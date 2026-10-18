import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../../../src/components/AppButton';
import { FadeIn, PopIn, CountUp, GlowPulse } from '../../../../../src/components/motion';
import { eventsApi, GroupEventType } from '../../../../../src/services/endpoints/events';
import { paymentsApi, MobileMoneyProvider } from '../../../../../src/services/endpoints/payments';
import { useAuthStore } from '../../../../../src/store/auth.store';
import { colors, fonts, radii, spacing } from '../../../../../src/theme';

const TYPE_LABEL: Record<GroupEventType, string> = {
  DEUIL: 'Deuil',
  ANNIVERSAIRE: 'Anniversaire',
  NAISSANCE: 'Naissance',
  MARIAGE: 'Mariage',
  MALADIE: 'Maladie',
  AUTRE: 'Autre',
};

interface EventDetail {
  id: string;
  groupId: string;
  type: GroupEventType;
  customLabel: string | null;
  description: string | null;
  suggestedAmount: string | null;
  status: 'OPEN' | 'CLOSED';
  beneficiary: { id: string; fullName: string | null };
  createdBy: { id: string; fullName: string | null };
  collectedAmount: number;
  contributions: { userId: string; fullName: string | null; amount: string }[];
  waitingMembers: { userId: string; fullName: string | null }[];
}

/**
 * Écran 56 — Cotiser à l'évènement : collecté, contributeurs avec montants
 * libres, membres en attente. « Cotiser » prépare la transaction
 * EVENT_CONTRIBUTION (POST /payments/prepare avec eventId + montant saisi)
 * puis enchaîne sur le flux Mobile Money existant (écrans 32→33→40, Phase 3).
 *
 * Micro-animations : le COLLECTÉ compte de 0 à sa valeur (CountUp) dans une
 * carte à halo pulsé (GlowPulse) ; les contributions arrivent en cascade.
 */
export default function EventContributeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const user = useAuthStore((s) => s.user);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = async () => {
    if (!eventId) return;
    try {
      const { data } = await eventsApi.getOne(eventId);
      setEvent(data);
      if (data?.suggestedAmount) {
        setAmount(String(Math.round(Number(data.suggestedAmount))));
      }
      setError(null);
    } catch {
      setError(t('eventsScreen.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const amountNum = Number(amount);
  const valid = Number.isFinite(amountNum) && amountNum >= 100;
  const alreadyContributed = event?.contributions.some((c) => c.userId === user?.id);
  const isClosed = event?.status === 'CLOSED';
  const isBeneficiary = event?.beneficiary?.id === user?.id;

  const handleContribute = async () => {
    if (!id || !eventId || !valid || paying) return;
    setPaying(true);
    setError(null);
    try {
      const provider: MobileMoneyProvider = 'MTN_MOMO';
      const { data: transaction } = await paymentsApi.prepareContribution(
        id,
        provider,
        eventId,
        amountNum,
      );
      if (!transaction?.id) throw new Error('no transaction');

      await paymentsApi.initiate(transaction.id, provider, Number(transaction.amount));

      router.replace({
        pathname: '/payment/processing',
        params: {
          transactionId: transaction.id,
          amount: String(transaction.amount),
          provider,
          groupId: id,
          eventId,
        },
      });
    } catch {
      setError(t('eventsScreen.contributeError'));
      setPaying(false);
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
        ) : error && !event ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : event ? (
          <>
            <FadeIn dy={10}>
              <Text style={styles.type}>{TYPE_LABEL[event.type]}</Text>
              <Text style={styles.title}>
                {event.customLabel ?? event.beneficiary?.fullName ?? t('eventsScreen.unnamedBeneficiary')}
              </Text>
              <Text style={styles.byline}>
                {t('eventsScreen.openedByLabel', {
                  name: event.createdBy?.fullName ?? '',
                  count: event.contributions.length + event.waitingMembers.length,
                })}
              </Text>
            </FadeIn>

            <GlowPulse delay={300}>
              <View style={styles.potCard}>
                <Text style={styles.potLabel}>{t('eventsScreen.collectedTitle')}</Text>
                <CountUp
                  value={event.collectedAmount}
                  suffix=" FCFA"
                  style={styles.potValue}
                />
              </View>
            </GlowPulse>

            {/* Montant libre — la suggestion pré-remplit le champ. */}
            {!isClosed && !alreadyContributed && !isBeneficiary ? (
              <FadeIn delay={200} dy={8}>
                <Text style={styles.label}>{t('eventsScreen.yourContributionLabel')}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(raw) => setAmount(raw.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="3000"
                  placeholderTextColor={colors.inkSoft}
                />
                <Text style={styles.hint}>{t('eventsScreen.amountHint')}</Text>
              </FadeIn>
            ) : null}
            {isBeneficiary ? (
              <PopIn>
                <Text style={styles.infoText}>{t('eventsScreen.beneficiaryNoSelfContribution')}</Text>
              </PopIn>
            ) : null}
            {alreadyContributed ? (
              <PopIn>
                <Text style={styles.infoText}>{t('eventsScreen.alreadyContributed')}</Text>
              </PopIn>
            ) : null}

            {/* Contributions : cascade (Stagger-like via FadeIn décalé). */}
            <Text style={styles.sectionTitle}>{t('eventsScreen.contributionsSection')}</Text>
            <View style={styles.contribCard}>
              {event.contributions.map((c, i) => (
                <FadeIn key={c.userId} delay={280 + i * 60}>
                  <View style={[styles.contribRow, i > 0 && styles.contribRowBorder]}>
                    <Text style={styles.contribName}>{c.fullName ?? t('eventsScreen.unnamedBeneficiary')}</Text>
                    <Text style={styles.contribAmount}>
                      {Number(c.amount).toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
                </FadeIn>
              ))}
              {event.waitingMembers.map((m, i) => (
                <FadeIn key={m.userId} delay={280 + (event.contributions.length + i) * 60}>
                  <View style={[styles.contribRow, styles.contribRowBorder]}>
                    <Text style={styles.contribName}>{m.fullName ?? t('eventsScreen.unnamedBeneficiary')}</Text>
                    <Text style={styles.contribWaiting}>{t('eventsScreen.waitingLabel')}</Text>
                  </View>
                </FadeIn>
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {!isClosed && !alreadyContributed && !isBeneficiary ? (
          <AppButton
            label={
              paying
                ? t('eventsScreen.paying')
                : t('eventsScreen.contributeButton', { amount: amountNum.toLocaleString('fr-FR') })
            }
            onPress={handleContribute}
            disabled={!valid || paying}
          />
        ) : null}
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
  type: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: 2 },
  byline: { fontFamily: fonts.inter.regular, fontSize: 12, color: colors.inkSoft, marginBottom: spacing.lg },
  potCard: {
    borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg,
  },
  potLabel: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
  potValue: { fontSize: 24, color: colors.navyDark },
  label: { fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navy, marginBottom: spacing.xs + 2 },
  amountInput: {
    fontFamily: fonts.mono.semiBold, fontSize: 18, color: colors.navyDark,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  hint: { fontFamily: fonts.inter.regular, fontSize: 11, color: colors.inkSoft, marginTop: spacing.xs, marginBottom: spacing.lg },
  infoText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.goldDark, marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: spacing.sm },
  contribCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  contribRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  contribRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  contribName: { fontFamily: fonts.inter.regular, fontSize: 13, color: colors.navyDark },
  contribAmount: { fontFamily: fonts.mono.medium, fontSize: 12.5, color: colors.navyDark },
  contribWaiting: { fontFamily: fonts.inter.medium, fontSize: 12, color: colors.goldDark },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.md + 2 },
});
