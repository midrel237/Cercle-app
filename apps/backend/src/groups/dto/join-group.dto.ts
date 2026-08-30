import { IsString } from 'class-validator';

export class JoinGroupDto {
  @IsString()
  inviteCode!: string;
}
