import { IsString } from 'class-validator';

/**
 * Désignation du caissier du groupe (Option A, cf. cahier des charges §7) :
 * un membre existant, qui reste par ailleurs un membre cotisant comme les
 * autres, prend en charge la collecte des cotisations et le versement au
 * bénéficiaire. Réservé à l'administrateur du groupe.
 */
export class AssignCashierDto {
  @IsString()
  memberId!: string; // id du GroupMember désigné caissier
}
