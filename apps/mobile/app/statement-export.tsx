import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share as RNShare, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../src/components/AppButton';
import { groupsApi } from '../src/services/endpoints/groups';
import { transactionsApi } from '../src/services/endpoints/account';
import { colors, fonts, radii, spacing } from '../src/theme';

// Ligne du relevé — alignée sur serializeTransaction du backend
// (transactions.service.ts) : groupId et status inclus.
interface TxRow {
  id: string;
  groupId: string | null;
  groupName: string | null;
  type: string;
  status: string;
  amount: string;
  isCredit: boolean;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  CONTRIBUTION: 'Cotisation',
  EVENT_CONTRIBUTION: 'Cagnotte',
  ROTATION_PAYOUT: 'Versement rotation',
  LOAN_DISBURSEMENT: 'Prêt accordé',
  LOAN_REPAYMENT: 'Remboursement',
  MEMBER_EXIT_SETTLEMENT: 'Règlement sortie',
  EVENT_PAYOUT: 'Versement cagnotte',
};

/**
 * Écran 69 — Export du relevé : aperçu texte du relevé du groupe
 * (transactions CONFIRMED du ledger), Partager natif (texte) et
 * Télécharger le PDF — généré côté serveur (pdfkit, palette Cercle),
 * téléchargé en binaire (Bearer header via axios, aucun token en URL),
 * écrit dans le cache de l'app (expo-file-system) puis ouvert dans le
 * partage natif (expo-sharing) : l'utilisateur peut l'enregistrer,
 * l'imprimer ou l'envoyer (WhatsApp, e-mail...).
 */
export default function StatementExportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();

  const [group, setGroup] = useState<null | { id: string; name: string }>(null);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!groupId) return;
    try {
      const [groupRes, historyRes] = await Promise.all([
        groupsApi.getOne(groupId),
        transactionsApi.myHistory('ALL'),
      ]);
      setGroup(groupRes.data);
      // Le relevé du groupe = mes transactions de ce groupe (CONFIRMED).
      const mine: TxRow[] = (historyRes.data ?? [])
        .flatMap((d: { items: TxRow[] }) => d.items)
        .filter((tx: TxRow) => tx.groupId === groupId && tx.status === 'CONFIRMED');
      setRows(mine);
      setError(null);
    } catch {
      setError(t('historyScreen.statementLoadError'));
    } finally {
      setLoading(false);
    }
  }, [groupId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const total = rows.reduce((s, r) => s + (r.isCredit ? 1 : -1) * Number(r.amount), 0);

  const buildText = () => {
    const lines = rows.map(
      (r) =>
        `${new Date(r.createdAt).toLocaleDateString('fr-FR')} · ${TYPE_LABEL[r.type] ?? r.type} ${
          r.isCredit ? '+' : '-'
        }${Number(r.amount).toLocaleString('fr-FR')}`,
    );
    return [
      'Cercle',
      `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      `${(group?.name ?? '').toUpperCase()} — RELEVÉ`,
      '',
      ...lines,
      '',
      `Total : ${total.toLocaleString('fr-FR')} FCFA`,
    ].join('\n');
  };

  const handleShare = () => {
    RNShare.share({ message: buildText() });
  };

  /**
   * Télécharge le PDF du serveur (GET /transactions/group/:id/statement),
   * l'écrit dans le répertoire cache de l'app, puis ouvre le partage
   * natif — l'utilisateur choisit : enregistrer, imprimer, envoyer.
   */
  const handleDownloadPdf = async () => {
    if (!groupId || downloading) return;
    setDownloading(true);
    try {
      const { data } = await transactionsApi.downloadGroupStatement(groupId);
      const fileName = `cercle-releve-${groupId}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      // Réponse arraybuffer → base64 pour writeAsStringAsync.
      let base64: string;
      if (typeof data === 'string') {
        base64 = data;
      } else {
        const bytes = new Uint8Array(data);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64 = btoa(binary);
      }
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${group?.name ?? 'Cercle'} — relevé PDF`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Cercle', `Relevé enregistré : ${fileName}`);
      }
    } catch {
      Alert.alert('Cercle', t('historyScreen.statementDownloadError'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.brand}>Cercle</Text>
        <Text style={styles.generated}>
          {t('historyScreen.statementGeneratedOn', {
            date: new Date().toLocaleDateString('fr-FR'),
          })}
        </Text>
        <Text style={styles.groupTitle}>
          {(group?.name ?? '').toUpperCase()} — {t('historyScreen.statementTitle')}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.goldDark} style={styles.spinner} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.card}>
            {rows.length === 0 ? (
              <Text style={styles.emptyText}>{t('historyScreen.statementEmpty')}</Text>
            ) : (
              rows.map((r) => (
                <View key={r.id} style={styles.stmtRow}>
                  <Text style={styles.stmtLeft} numberOfLines={1}>
                    {new Date(r.createdAt).toLocaleDateString('fr-FR')} ·{' '}
                    {TYPE_LABEL[r.type] ?? r.type}
                  </Text>
                  <Text
                    style={[
                      styles.stmtRight,
                      r.isCredit ? { color: colors.success } : { color: colors.navyDark },
                    ]}
                  >
                    {r.isCredit ? '+' : '−'}{Number(r.amount).toLocaleString('fr-FR')}
                  </Text>
                </View>
              ))
            )}
            {rows.length > 0 ? (
              <View style={[styles.stmtRow, { borderTopWidth: 1, borderTopColor: colors.sand }]}>
                <Text style={[styles.stmtLeft, { fontFamily: fonts.inter.semiBold }]}>
                  {t('historyScreen.statementTotal')}
                </Text>
                <Text style={[styles.stmtRight, { fontFamily: fonts.mono.semiBold }]}>
                  {total.toLocaleString('fr-FR')} FCFA</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), gap: spacing.sm }]}>
        <AppButton label={t('historyScreen.shareButton')} variant="ghost" onPress={handleShare} disabled={loading || rows.length === 0} />
        <AppButton
          label={
            downloading
              ? t('historyScreen.statementDownloading')
              : t('historyScreen.downloadPdfButton')
          }
          onPress={handleDownloadPdf}
          disabled={loading || downloading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamLight },
  content: { flex: 1, paddingHorizontal: spacing.md },
  brand: { fontFamily: fonts.fraunces.semiBold, fontSize: 22, color: colors.navyDark, marginTop: spacing.md },
  generated: { fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft, marginBottom: spacing.xs },
  groupTitle: { fontFamily: fonts.inter.semiBold, fontSize: 13, color: colors.goldDark, marginBottom: spacing.lg },
  spinner: { marginVertical: spacing.xl },
  errorText: { fontFamily: fonts.inter.medium, fontSize: 11.5, color: colors.danger },
  emptyText: { fontFamily: fonts.inter.regular, fontSize: 12.5, color: colors.inkSoft, paddingVertical: spacing.md, textAlign: 'center' },
  card: {
    borderWidth: 1.5, borderColor: colors.goldDark, borderRadius: radii.md,
    backgroundColor: colors.cream, padding: spacing.md,
  },
  stmtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs + 2, gap: spacing.sm },
  stmtLeft: { flex: 1, fontFamily: fonts.inter.regular, fontSize: 11.5, color: colors.inkSoft },
  stmtRight: { fontFamily: fonts.mono.medium, fontSize: 11.5, color: colors.navyDark },
  footer: { paddingHorizontal: spacing.md + 2 },
});
