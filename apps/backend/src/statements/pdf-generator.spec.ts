import { inflateSync } from 'node:zlib';
import { buildStatementPdf, type PdfLine } from './pdf-generator';

/**
 * Tests du générateur PDF TypeScript pur : le document produit doit être
 * structurellement valide (entête, objets, xref, EOF) et restituer le
 * texte des lignes après décompression du flux de contenu.
 */
describe('pdf-generator', () => {
  const sampleLines: PdfLine[] = [
    { text: 'Cercle', size: 18, bold: true },
    { text: 'Releve du groupe - Test', size: 13, bold: true, dy: 6 },
    { text: '01/01/2026  Robert T.              Cotisation            5 000', size: 9 },
    { text: 'Total collecte : 5 000 XAF', size: 10, bold: true },
  ];

  it('produit un document avec entete PDF et marqueur EOF', () => {
    const pdf = buildStatementPdf(sampleLines);
    const str = pdf.toString('latin1');
    expect(str.startsWith('%PDF-1.4')).toBe(true);
    expect(str.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('declare une table xref avec le bon nombre d objets', () => {
    const pdf = buildStatementPdf(sampleLines);
    const str = pdf.toString('latin1');
    // 4 objets de base (catalogue, pages, 2 fontes) + page + contenu = 6.
    expect(str).toContain('xref');
    expect(str).toContain('/Size 7');
    expect(str).toContain('/Root 1 0 R');
  });

  it('reference les fontes Helvetica standard dans les ressources de page', () => {
    const pdf = buildStatementPdf(sampleLines);
    const str = pdf.toString('latin1');
    expect(str).toContain('/BaseFont /Helvetica ');
    expect(str).toContain('/BaseFont /Helvetica-Bold');
    expect(str).toContain('/F1 3 0 R');
    expect(str).toContain('/F2 4 0 R');
  });

  it('le flux de contenu, decomprime, contient les textes des lignes', () => {
    const pdf = buildStatementPdf(sampleLines);
    const str = pdf.toString('latin1');

    // Extrait le premier stream FlateDecode et le decomprime.
    const streamMatch = str.match(/stream\n([\s\S]*?)\nendstream/);
    expect(streamMatch).not.toBeNull();
    const compressed = Buffer.from(streamMatch![1], 'binary');
    const content = inflateSync(compressed).toString('latin1');

    // Chaque ligne apparaît dans le contenu de la page (échappée).
    expect(content).toContain('(Cercle) Tj');
    expect(content).toContain('(Releve du groupe - Test) Tj');
    expect(content).toContain('5 000');
    expect(content).toContain('(Total collecte : 5 000 XAF) Tj');
  });

  it('echappe les parentheses dans le texte pour ne pas casser les operateurs', () => {
    const pdf = buildStatementPdf([
      { text: 'Groupe (Test) [et] \\ accords' },
    ]);
    const str = pdf.toString('latin1');
    const streamMatch = str.match(/stream\n([\s\S]*?)\nendstream/);
    const content = inflateSync(Buffer.from(streamMatch![1], 'binary')).toString('latin1');
    expect(content).toContain('Groupe \\(Test\\) [et] \\\\ accords');
  });

  it('pagine automatiquement au dela de la capacite d une page', () => {
    // ~53 lignes par page (745pt utiles / 14pt) : 80 lignes → 2 pages.
    const manyLines: PdfLine[] = Array.from({ length: 80 }, (_, i) => ({
      text: `Ligne ${i + 1}`,
    }));
    const pdf = buildStatementPdf(manyLines);
    const str = pdf.toString('latin1');
    expect(str).toContain('/Count 2');
    // 4 objets de base + 2 pages + 2 contenus = 8 objets.
    expect(str).toContain('/Size 9');
  });
});
