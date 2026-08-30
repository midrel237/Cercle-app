import { IsBoolean, IsUUID } from 'class-validator';

export class DecideGroupExitDto {
  @IsUUID()
  memberId!: string;

  @IsBoolean()
  approve!: boolean;
}
