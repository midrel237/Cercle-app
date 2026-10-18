import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../src/theme';

interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Écran 77 — Aide & support : recherche de question, FAQ dépliable
 * (retard de cotisation, sécurité Mobile Money, sortie de groupe, score
 * de fiabilité) et canaux de contact (support in-app 78, WhatsApp, appel).
 */
export default function HelpScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faq: FaqItem[] = [
    { question: t('helpScreen.faq1Question'), answer: t('helpScreen.faq1Answer') },
    { question: t('helpScreen.faq2Question'), answer: t('helpScreen.faq2Answer') },
    { question: t('helpScreen.faq3Question'), answer: t('helpScreen.faq3Answer') },
    { question: t('helpScreen.faq4Question'), answer: t('helpScreen.faq4Answer') },
  ];

  const filtered = faq.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('helpScreen.title')}</Text>

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('helpScreen.searchPlaceholder')}
          placeholderTextColor={colors.inkSoft}
          autoCorrect={false}
        />

        <Text style={styles.sectionTitle}>{t('helpScreen.faqSectionTitle')}</Text>
        <View style={styles.faqCard}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>{t('helpScreen.noResults')}</Text>
          ) : (
            filtered.map((f, i) => (
              <View key={f.question} style={[styles.faqItem, i > 0 && styles.faqItemBorder]}>
                <Pressable
                  style={styles.faqQuestionRow}
                  onPress={() => setOpenIndex(openIndex === i ? null : i)}
                >
                  <Text style={styles.faqQuestion}>{f.question}</Text>
                  <Text style={styles.faqChevron}>{openIndex === i ? '−' : '+'}</Text>
                </Pressable>
                {openIndex === i ? <Text style={styles.faqAnswer}>{f.answer}</Text> : null}
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('helpScreen.contactSectionTitle')}</Text>
        <View style={styles.contactCard}>
          <Pressable style={styles.contactRow} onPress={() => router.push('/settings/support-chat')}>
            <Text style={styles.contactLabel}>💬 {t('helpScreen.chatSupport')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={[styles.contactRow, styles.contactRowBorder]}>
            <Text style={styles.contactLabel}>🟢 {t('helpScreen.whatsappSupport')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={[styles.contactRow, styles.contactRowBorder]}>
            <Text style={styles.contactLabel}>📞 {t('helpScreen.callSupport')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Text style={styles.contactHours}>{t('helpScreen.contactHours')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, paddingHorizontal: spacing.md },
  backRow: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.md },
  backText: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navy },
  title: { fontFamily: fonts.fraunces.semiBold, fontSize: 24, color: colors.navyDark, marginBottom: spacing.md },
  searchInput: {
    fontFamily: fonts.inter.regular, fontSize: 13.5, color: colors.navyDark,
    borderWidth: 1.5, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontFamily: fonts.fraunces.semiBold, fontSize: 15, color: colors.navyDark, marginBottom: spacing.sm },
  faqCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md, marginBottom: spacing.lg,
  },
  faqItem: { paddingVertical: spacing.sm },
  faqItemBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  faqQuestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { flex: 1, fontFamily: fonts.inter.medium, fontSize: 12.5, color: colors.navyDark, lineHeight: 17 },
  faqChevron: { fontFamily: fonts.inter.semiBold, fontSize: 15, color: colors.goldDark, marginLeft: spacing.sm },
  faqAnswer: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 17, marginTop: spacing.xs },
  emptyText: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, paddingVertical: spacing.md, textAlign: 'center' },
  contactCard: {
    borderWidth: 1, borderColor: colors.sand, borderRadius: radii.md,
    backgroundColor: colors.creamLight, paddingHorizontal: spacing.md,
  },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  contactRowBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  contactLabel: { fontFamily: fonts.inter.medium, fontSize: 13, color: colors.navyDark },
  chevron: { fontFamily: fonts.inter.regular, fontSize: 16, color: colors.inkSoft },
  contactHours: { fontFamily: fonts.inter.regular, fontSize: 10.5, color: colors.inkSoft, paddingVertical: spacing.xs + 2, textAlign: 'center' },
});
