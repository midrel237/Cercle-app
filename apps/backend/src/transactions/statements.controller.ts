/**
 * Fichier neutralise - a supprimer physiquement (git rm) au prochain
 * passage en local.
 *
 * Le releve PDF de groupe est servi par GET /statements/group/:groupId.pdf
 * (module src/statements, generateur TS pur). Ce controleur etait le
 * doublon pdfkit (endpoint /transactions/group/:groupId/statement),
 * abandonne car il aurait exige l'ajout de dependances npm.
 */
export const STATEMENTS_CONTROLLER_DUPLICATE_REMOVED = true;
