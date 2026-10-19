/**
 * Fichier neutralise - a supprimer physiquement (git rm) au prochain
 * passage en local : l'API GitHub ne permet pas la suppression.
 *
 * Le releve PDF de groupe (ecran 69) est implante dans
 * src/statements/ : generateur TypeScript pur (node:zlib, aucune
 * dependance) + endpoint GET /statements/group/:groupId.pdf (strategie
 * jwt-query, ouverture via expo-web-browser cote mobile).
 *
 * Ce fichier est un doublon obsolete (approche pdfkit abandonnee pour ne
 * pas modifier le lockfile via l'API GitHub) ; il n'est reference par
 * aucun module Nest.
 */
export const STATEMENTS_PDFKIT_DUPLICATE_REMOVED = true;
