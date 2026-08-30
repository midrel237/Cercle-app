import { IsString } from 'class-validator';

export class SubmitKycDto {
  @IsString()
  documentType!: string; // carte_identite | passeport | ...

  @IsString()
  rectoUrl!: string;

  @IsString()
  versoUrl?: string;

  @IsString()
  selfieUrl!: string;
}
