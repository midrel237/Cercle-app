import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../src/components/AppButton';
import { groupsApi } from '../../src/services/endpoints/groups';
import { colors, fonts, radii, spacing } from '../../src/theme';

interface GroupPreview {
  id: string;
  name: string;
  contributionAmount: string;
  periodicityDays: number;
  mode: 'ROTATIVE' | 'INTERNAL_LOAN' | 'MIXED';
  openToDiaspora: boolean;
  memberCount: number;
  alreadyJoined: number;
}

/**
 * Écran 27 — Rejoindre un groupe avec un code d'invitation.
 * Saisie du code → POST /groups/preview (aperçu « GROUPE TROUVÉ ») →
 * demande d'adhésion POST /groups/join (créée en attente, écran 28).
 */
export default function JoinGroupScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || searching) return;
    setError(null);
    setPreview(null);
    setSearching(true);
    try {
      const { data } = await groupsApi.previewByInviteCode(trimmed);
      setPreview(data);
    } catch {
      setError(t('joinGroup.notFoundError'));
    } finally {
      setSearching(false);
    }
  };

  const handleJoin = async () => {
    if (!preview || joining) return;
    setJoining(true);
    setError(null);
    try {
      await groupsApi.join(code.trim().toUpperCase());
      router.replace({
        pathname: '/group/join-pending',
        params: { groupName: preview.name },
      });
    } catch {
      setError(t('joinGroup.joinError'));
    } finally {
      setJoining(false);
    }
  };

  const modeLabel = () => {
    switch (preview?.mode) {
      case 'ROTATIVE':
        return t('joinGroup.modeRotative');
      case 'INTERNAL_LOAN':
        return t('joinGroup.modeLoan');
      default:
        return t('joinGroup.modeMixed');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={router.back} hitSlop={12} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{t('joinGroup.title')}</Text>
        <Text style={styles.subtitle}>{t('joinGroup.subtitle')}</Text>

        <Text style={styles.inputLabel}>{t('joinGroup.codeLabel')}</Text>
        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(raw) => {
            setCode(raw.toUpperCase());
            setPreview(null);
            setError(null);
          }}
          placeholder={t('joinGroup.codePlaceholder')}
          placeholderTextColor={colors.inkSoft}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.searchRow}>
          {searching ? (
            <ActivityIndicator size="small" color={colors.goldDark} />
          ) : (
            <AppButton
              label={t('joinGroup.searchButton')}
              variant="dark"
              onPress={handleSearch}
              disabled={!code.trim()}
              style={styles.searchButton}
            />
          )}
        </View>

        {preview ? (
          <View style={styles.foundCard}>
            <Text style={styles.foundBadge}>{t('joinGroup.foundBadge')}</Text>
            <Text style={styles.foundName}>{preview.name}</Text>
            <Text style={styles.foundMembers}>
              {t('joinGroup.membersTargeted', { count: preview.memberCount })} ·{' '}
              {t('joinGroup.membersJoined', { count: preview.alreadyJoined })}
            </Text>
            <Text style={styles.foundAmount}>
              {Number(preview.contributionAmount).toLocaleString('fr-FR')} FCFA /{' '}
              {t('joinGroup.periodicityDays', { count: preview.periodicityDays })} · {modeLabel()}
            </Text>
            {preview.openToDiaspora ? (
              <Text style={styles.foundDiaspora}>🌍 {t('joinGroup.diasporaOpen')}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <AppButton
          label={joining ? t('joinGroup.joining') : t('joinGroup.joinButton')}
          onPress={handleJoin}
          disabled={!preview || joining}
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
    marginBottom: spacing.xs + 2,
  },
  subtitle: {
    fontFamily: fonts.inter.regular,
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: 12.5,
    color: colors.navy,
    marginBottom: spacing.xs + 2,
  },
  codeInput: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 18,
    color: colors.navyDark,
    backgroundColor: colors.creamLight,
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 4,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontFamily: fonts.inter.medium,
    fontSize: 11.5,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  searchRow: {
    marginBottom: spacing.md,
  },
  searchButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  foundCard: {
    borderWidth: 1.5,
    borderColor: colors.goldDark,
    borderRadius: radii.md,
    backgroundColor: colors.cream,
    padding: spacing.md,
  },
  foundBadge: {
    fontFamily: fonts.inter.bold,
    fontSize: 10.5,
    color: colors.goldDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  foundName: {
    fontFamily: fonts.fraunces.semiBold,
    fontSize: 19,
    color: colors.navyDark,
    marginBottom: 2,
  },
  foundMembers: {
    fontFamily: fonts.inter.regular,
    fontSize: 12.5,
    color: colors.inkSoft,
    marginBottom: 2,
  },
  foundAmount: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    color: colors.navyDark,
  },
  foundDiaspora: {
    fontFamily: fonts.inter.regular,
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.md + 2,
  },
});
