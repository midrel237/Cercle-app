import { IsString } from 'class-validator';

export class RemoveMemberDto {
  /// Identifiant du GroupMember à retirer par l'administrateur.
  /// Distinct de la sortie volontaire (requestExit/decideExit) : ici la
  /// décision vient de l'admin, sans demande préalable du membre.
  @IsString()
  memberId!: string;
}
