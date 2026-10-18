import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { paymentsApi } from '../../src/services/endpoints/payments';
import { colors, fonts, radii, spacing } from '../../src/theme';

type AddKind = 'mobile-money' | 'card' | 'bank-transfer';

/**
 * Écrans 35/36/37 — Ajouter un moyen de paiement (Mobile Money, carte
 * bancaire diaspora, virement diaspora). Un seul écran à onglets conforme
 * à l'arborescence de routes : POST /payments/methods persiste le moyen
 * (le backend n'accepte carte/virement que pour les membres d'un groupe
 * ouvert à la diaspora — garde côté serveur).
 */
export default function AddPaymentMethodScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { groupId, kind: kindParam } = useLocalSearchParams<{
    groupId?: string;
    kind?: string;
  }>();

  const [kind, setKind] = useState<AddKind>(
    kindParam === 'card' ? 'card' : kindParam === 'bank-transfer' ? 'bank-transfer' : 'mobile-money',
  );

  // Mobile Money
  const [provider, setProvider] = useState<'MTN_MOMO' | 'ORANGE_MONEY'>('MTN_MOMO');
  const [phone, setPhone] = useState('');
  // Carte
  const [cardBrand, setCardBrand] = useState<'Visa' | 'Mastercard'>('Visa');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  // Virement
  const [bankCountry, setBankCountry] = useState('');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = (raw: string) => raw.replace(/[^0-9]/g, '');
  const last4 = (raw: string) => digits(raw).slice(-4);

  const handleSave = async () => {
    if (saving) return;
    setError(null);

    let payload: Record<string, unknown>;
    if (kind === 'mobile-money') {
      if (digits(phone).length < 8) {
        setError(t('payment.addMethod.phoneError'));
        return;
      }
      payload = { type: 'MOBILE_MONEY', provider, phoneNumber: phone };
    } else if (kind === 'card') {
      if (digits(cardNumber).length < 12 || digits(cvv).length < 3) {
        setError(t('payment.addMethod.cardError'));
        return;
      }
      // Le PAN complet et le CVV ne sont JAMAIS envoyés ni stockés :
      // en production, la tokenisation est faite par le PSP et seule la
      // référence tokenisée + les 4 derniers chiffres remontent.
      payload = {
        type: 'BANK_CARD',
        cardBrand,
        cardLast4: last4(cardNumber),
        cardToken: `tok_${Date.now()}`, // TODO: remplacer par le token PSP réel.
      };
    } else {
      if (!bankName.trim() || digits(iban).length < 8) {
        setError(t('payment.addMethod.transferError'));
        return;
      }
      payload = {
        type: 'BANK_TRANSFER',
        bankName,
        bankCountry,
        ibanLast4: last4(iban),
      };
    }

    setSaving(true);
    try {
      await paymentsApi.addMethod(payload);
      // Retour à la liste des moyens (écran 34), ou au paiement si en cours.
      router.replace({
        pathname: '/payment/methods',
        params: { ...(groupId ? { groupId } : {}) },
      });
    } catch {
      setError(t('payment.addMethod.saveError'));
      setSaving(false);
    }
  };

  const tabs: { key: AddKind; label: string }[] = [
    { key: 'mobile-money', label: t('payment.addMethod.tabMobileMoney') },
    { key: 'card', label: t('payment.addMethod.tabCard') },
    { key: 'bank-transfer', label: t('payment.addMethod.tabTransfer') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        {/* Onglets — maquette : 3 types de moyens, diaspora 🌍 pour carte/virement. */}
        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, kind === tab.key && styles.tabActive]}
              onPress={() => {
                setKind(tab.key);
                setError(null);
              }}
            >
              <Text style={[styles.tabText, kind === tab.key && styles.tabTextActive]}>
                {tab.key !== 'mobile-money' ? '🌍 ' : ''}
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {kind === 'mobile-money' ? (
          <View>
            <Text style={styles.inputLabel}>{t('payment.addMethod.operatorLabel')}</Text>
            <View style={styles.providerRow}>
              {(['MTN_MOMO', 'ORANGE_MONEY'] as const).map((p) => (
                <Pressable
                  key={p}
                  style={[styles.providerOption, provider === p && styles.providerOptionActive]}
                  onPress={() => setProvider(p)}
                >
                  <Text style={styles.providerOptionText}>
                    {p === 'MTN_MOMO' ? 'MTN Mobile Money' : 'Orange Money'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.inputLabel}>{t('payment.addMethod.phoneLabel')}</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+237 6 XX XX XX XX"
              placeholderTextColor={colors.inkSoft}
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </View>
        ) : null}

        {kind === 'card' ? (
          <View>
            <Text style={styles.diasporaNote}>{t('payment.addMethod.cardDiasporaNote')}</Text>
            <Text style={styles.inputLabel}>{t('payment.addMethod.cardTypeLabel')}</Text>
            <View style={styles.providerRow}>
              {(['Visa', 'Mastercard'] as const).map((b) => (
                <Pressable
                  key={b}
                  style={[styles.providerOption, cardBrand === b && styles.providerOptionActive]}
                  onPress={() => setCardBrand(b)}
                >
                  <Text style={styles.providerOptionText}>{b}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.inputLabel}>{t('payment.addMethod.cardNumberLabel')}</Text>
            <TextInput
              style={styles.input}
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="•••• •••• •••• 4821"
              placeholderTextColor={colors.inkSoft}
              keyboardType="number-pad"
              maxLength={19}
            />
            <View style={styles.duoRow}>
              <View style={styles.duoItem}>
                <Text style={styles.inputLabel}>{t('payment.addMethod.expiryLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={expiry}
                  onChangeText={setExpiry}
                  placeholder="09 / 28"
                  placeholderTextColor={colors.inkSoft}
                  keyboardType="number-pad"
                  maxLength={7}
                />
              </View>
              <View style={styles.duoItem}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={setCvv}
                  placeholder="•••"
                  placeholderTextColor={colors.inkSoft}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
            </View>
          </View>
        ) : null}

        {kind === 'bank-transfer' ? (
          <View>
            <Text style={styles.diasporaNote}>{t('payment.addMethod.transferDiasporaNote')}</Text>
            <Text style={styles.inputLabel}>{t('payment.addMethod.bankCountryLabel')}</Text>
            <TextInput
              style={styles.input}
              value={bankCountry}
              onChangeText={setBankCountry}
              placeholder="🇫🇷 France"
              placeholderTextColor={colors.inkSoft}
              autoCorrect={false}
            />
            <Text style={styles.inputLabel}>{t('payment.addMethod.bankNameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="BNP Paribas"
              placeholderTextColor={colors.inkSoft}
              autoCorrect={false}
            />
            <Text style={styles.inputLabel}>IBAN</Text>
            <TextInput
              style={styles.input}
              value={iban}
              onChangeText={setIban}
              placeholder="FR76 •••• •••• •••• •••• 4821"
              placeholderTextColor={colors.inkSoft}
              autoCorrect={false}
            />
            <Text style={styles.transferDelay}>{t('payment.addMethod.transferDelay')}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={saving ? t('payment.addMethod.saving') : t('payment.addMethod.saveButton')}
          onPress={handleSave}
          disabled={saving}
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
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.creamLight,
  },
  tabActive: {
    borderColor: colors.goldDark,
    backgroundColor: colors.cream,
  },
  tabText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.navyDark,
    fontFamily: fonts.inter.semiBold,
  },
  inputLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.navy,
    marginBottom: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  input: {
    fontFamily: fonts.inter.regular,
    fontSize: 14,
    color: colors.navyDark,
    backgroundColor: colors.creamLight,
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
  },
  providerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  providerOption: {
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.creamLight,
  },
  providerOptionActive: {
    borderColor: colors.goldDark,
    backgroundColor: colors.cream,
  },
  providerOptionText: {
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.navyDark,
  },
  duoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  duoItem: {
    flex: 1,
  },
  diasporaNote: {
    fontFamily: fonts.inter.regular,
    fontSize: 11.5,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  transferDelay: {
    fontFamily: fonts.inter.regular,
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
