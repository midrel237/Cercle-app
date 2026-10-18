import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../src/components/AppButton';
import { loansApi } from '../../../src/services/endpoints/loans';
import { colors, fonts, radii, spacing } from '../../../src/theme';

interface LoanDetail {
  id: string;
  groupId: string;
  amount: string;
  interestRate: string;
  status: string;
  borrower: { id: string; fullName: string | null };
  repaymentSchedule: {
    installmentNumber: number;
    dueDate: string;
    amount: string;
    status: string;
  }[];
  contract: { signedByBorrower: boolean; signedAt: string | null } | null;
}

/**
 * Écrans 62-63 — Contrat de prêt : récapitulatif (réf. = id court,
 * emprunteur, montant, durée, taux, échéancier), case « J'ai lu et
 * j'accepte les termes » puis signature (le PIN de session suffit en MVP ;
 * la signature dessinée de la maquette 62 est différée au module PDF).
 * POST /loans/:id/sign → prêt ACTIVE + LOAN_DISBURSEMENT tracé au ledger.
 */
export default function LoanContractScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      const { data } = await loansApi.getOne(id);
      setLoan(data);
      setError(null);
    } catch {
      setError(t('loansScreen.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSign = async () => {
    if (!id || !accepted || signing) return;
    setSigning(true);
    setError(null);
    try {
      await loansApi.signContract(id);
      router.replace({
        pathname: '/loan/[id]',
        params: { id, signed: 'true' },
      });
    } catch {
      setError(t('loansScreen.signError'));
      setSigning(false);
    }
  };

  const ref = (loan?.id ?? '').slice(0, 8).toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : loan ? (
          <>
            <Text style={styles.header}>
              {t('loansScreen.contractRef', { ref })} ·{' '}
              {t('loansScreen.contractApproved')}
            </Text>
            <Text style={styles.title}>{t('loansScreen.contractTitle')}</Text>

            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>{t('loansScreen.borrowerLabel')}</Text>
                <Text style={styles.cardValue}>
                  {loan.borrower?.fullName ?? t('loansScreen.unnamed')}
                </Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder]}>
                <Text style={styles.cardLabel}>{t('loansScreen.amountLabel')}</Text>
                <Text style={styles.cardValue}>
                  {Number(loan.amount).toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder]}>
                <Text style={styles.cardLabel}>{t('loansScreen.durationLabelContract')}</Text>
                <Text style={styles.cardValue}>
                  {t('loansScreen.durationValue', {
                    months: loan.repaymentSchedule.length,
                    installments: loan.repaymentSchedule.length,
                  })}
                </Text>
              </View>
              <View style={[styles.cardRow, styles.cardRowBorder]}>
                <Text style={styles.cardLabel}>{t('loansScreen.rateLabel')}</Text>
                <Text style={styles.cardValue}>
                  {t('loansScreen.rateValue', { rate: Number(loan.interestRate).toLocaleString('fr-FR') })}
                </Text>
              </View>
            </View>

            {/* Échéancier du contrat. */}
            <Text style={styles.sectionTitle}>{t('loansScreen.scheduleTitle')}</Text>
            <View style={styles.card}>
              {loan.repaymentSchedule.map((s, i) => (
                <View key={s.installmentNumber} style={[styles.cardRow, i > 0 && styles.cardRowBorder]}>
                  <Text style={styles.cardLabel}>
                    {t('loansScreen.installmentLabel', { number: s.installmentNumber })} —{' '}
                    {new Date(s.dueDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={styles.cardValue}>
                    {Number(s.amount).toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.legal}>
              {t('loansScreen.contractLegal')}
            </Text>

            {/* Acceptation + signature (maquettes 62/63). */}
            {loan.contract?.signedByBorrower ? (
              <Text style={styles.signedNote}>
                {t('loansScreen.contractSignedNote', {
                  date: loan.contract.signedAt
                    ? new Date(loan.contract.signedAt).toLocaleDateString('fr-FR')
                    : '',
                })}
              </Text>
            ) : (
              <View style={styles.acceptRow}>
                <View style={styles.acceptTextWrap}>
                  <Text style={styles.acceptText}>{t('loansScreen.acceptTermsLabel')}</Text>
                </View>
                <Switch
                  value={accepted}
                  onValueChange={setAccepted}
                  trackColor={{ false: colors.sand, true: colors.gold }}
                  thumbColor={accepted ? colors.navyDark : colors.creamLight}
                />
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        ) : (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </ScrollView>

      {loan && !loan.contract?.signedByBorrower ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <AppButton
            label={t('loansScreen.signWithPinButton')}
            onPress={handleSign}
            disabled={!accepted || signing}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  spinner: { marginVertical: spacing.xl },
  header: { fontFamily: fonts.inter.medium, fontSize: 10.5, color: colors.goldDark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginBottom: spacing.lg },
  card: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, marginBottom: spacing.md,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  cardRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  cardLabel: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, flex: 1 },
  cardValue: { fontFamily: fonts.mono.medium, fontSize: 12.5, color: colors.navyDark },
  sectionTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: spacing.sm },
  legal: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 17, marginBottom: spacing.lg },
  signedNote: { fontFamily: fonts.inter.semiBold, fontSize: 12.5, color: colors.success, marginTop: spacing.sm },
  acceptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  acceptTextWrap: { flex: 1 },
  acceptText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navyDark },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.md + 2 },
});
