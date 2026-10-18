import { IsString, MaxLength } from 'class-validator';

export class SendGroupMessageDto {
  /// Corps du message (limite volontairement stricte pour un chat MVP).
  @IsString()
  @MaxLength(500)
  body!: string;
}
