import { deflateSync } from 'node:zlib';

/**
 * Générateur PDF minimal en TypeScript pur — aucune dépendance externe.
 * Produit un PDF 1.4 valide : catalogue, pages, fontes Helvetica standard
 * (aucune incorporation nécessaire), flux de contenu compressé (FlateDecode).
 *
 * Usage : relevé du groupe (écran 69). Largement suffisant pour un document
 * tabulaire en texte — pour des maquettes PDF complexes, on migrera vers
 * une vraie lib (pdfkit) quand le lockfile sera gérable autrement que par
 * l'API GitHub (ajout de dépendances npm impossible sans regeneration).
 */

const PAGE_WIDTH = 595.28; // A4 en points (595 x 842)
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const LINE_HEIGHT = 14;

export interface PdfLine {
  text: string;
  /** Taille de police, défaut 10. */
  size?: number;
  /** Gras (Helvetica-Bold). */
  bold?: boolean;
  /** Décalage vertical avant la ligne, défaut 0. */
  dy?: number;
}

/** Échappe les caractères spéciaux PDF dans une chaîne de contenu. */
function escapePdf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    // Caractères hors Latin-1 (accents inclus sont en Latin-1 : OK en
    // Helvetica standard avec WinAnsiEncoding) remplacés par '?'.
    .replace(/[^\x20-\xFF]/g, '?');
}

/**
 * Construit un PDF monopage (ou multipage si les lignes débordent) à partir
 * d'une liste de lignes de texte. Retourne le buffer PDF complet.
 */
export function buildStatementPdf(lines: PdfLine[]): Buffer {
  // Découpage en pages : chaque page tient (hauteur utile / interligne).
  const usableHeight = PAGE_HEIGHT - 2 * MARGIN;
  const pages: PdfLine[][] = [];
  let currentPage: PdfLine[] = [];
  let currentY = 0;
  for (const line of lines) {
    const height = LINE_HEIGHT + (line.dy ?? 0);
    if (currentY + height > usableHeight) {
      pages.push(currentPage);
      currentPage = [];
      currentY = 0;
    }
    currentPage.push(line);
    currentY += height;
  }
  if (currentPage.length > 0) pages.push(currentPage);

  // Objets du PDF : 1 catalogue, 2 pages-tree, 3 fontes (regular/bold),
  // puis pour chaque page : contenu + annotations de page.
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  // Contenu de chaque page → flux compressé.
  const contentStreams = pages.map((pageLines) => {
    let y = PAGE_HEIGHT - MARGIN;
    const ops: string[] = [];
    for (line of pageLines) {
      const size = line.size ?? 10;
      y -= LINE_HEIGHT + (line.dy ?? 0);
      ops.push(
        `BT /${line.bold ? 'F2' : 'F1'} ${size} Tf ` +
          `1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm (${escapePdf(line.text)}) Tj ET`,
      );
    }
    return ops.join('\n');
  });

  // Construction des objets numérotés (offsets calculés après).
  // Format d'objet : "N 0 obj ... endobj".
  // Les IDs: 1=catalogue, 2=pages, 3=Helvetica, 4=Helvetica-Bold,
  // puis par page i (0-based): (5+2i)=page, (6+2i)=contenu.
  const body: string[] = [];
  const addObj = (content: string) => {
    body.push(content);
  };

  // Placeholders remplis après coup pour les refs entre objets.
  // Catalogue (1) : renvoie vers le pages-tree (2).
  addObj(`<< /Type /Catalog /Pages 2 0 R >>`);
  const pageRefs = pages.map((_, i) => `${5 + 2 * i} 0 R`).join(' ');
  addObj(`<< /Type /Pages /Kids [ ${pageRefs} ] /Count ${pages.length} >>`);
  addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);

  contentStreams.forEach((stream, i) => {
    const compressed = deflateSync(Buffer.from(stream, 'latin1')).toString('binary');
    const pageId = 5 + 2 * i;
    const contentId = 6 + 2 * i;
    addObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    addObj(
      `<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n${compressed}\nendstream`,
    );
  });

  // Assemblage : entête + objets avec offsets + xref + trailer.
  const header = '%PDF-1.4\n';
  const chunks: Buffer[] = [Buffer.from(header, 'latin1')];
  const offsets: number[] = [];
  let position = header.length;
  body.forEach((obj, index) => {
    const id = index + 1;
    offsets[id] = position;
    const serialized = `${id} 0 obj\n${obj}\nendobj\n`;
    const buf = Buffer.from(serialized, 'latin1');
    chunks.push(buf);
    position += buf.length;
    pageObjectIds.push(id);
  });

  const xrefStart = position;
  const count = body.length;
  let xref = `xref\n0 ${count + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= count; i++) {
    xref += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }
  chunks.push(Buffer.from(xref, 'latin1'));
  const trailer =
    `trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  chunks.push(Buffer.from(trailer, 'latin1'));

  return Buffer.concat(chunks);
}
