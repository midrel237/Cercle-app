import { IsBoolean, IsString } from 'class-validator';

export class DecideJoinDto {
  /// Identifiant du GroupMember concerné par la décision.
  @IsString()
  memberId!: string;

  @IsBoolean()
  approve!: boolean;
}
