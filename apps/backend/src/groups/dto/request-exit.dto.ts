import { IsOptional, IsString } from 'class-validator';

export class RequestGroupExitDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
