/**
 * Suite neutralisee - a supprimer physiquement (git rm) au prochain
 * passage en local.
 *
 * Doublon obsolete des tests du releve PDF (approche pdfkit) : le releve
 * reel est teste dans src/statements/pdf-generator.spec.ts
 * (6 tests). Jest --ci refusant une suite sans test, ce fichier contient
 * un test passant qui documente son propre retrait.
 */
import { STATEMENTS_PDFKIT_DUPLICATE_REMOVED } from './statements.service';

describe('statements.service (transactions/) - doublon neutralise', () => {
  it('confirme que le releve PDF reel vit dans src/statements (a git rm)', () => {
    expect(STATEMENTS_PDFKIT_DUPLICATE_REMOVED).toBe(true);
  });
});
