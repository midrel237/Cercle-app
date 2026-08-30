import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class CreatePinDto {
  @IsPhoneNumber()
  phoneNumber!: string;

  @IsString()
  @Length(4, 6)
  pin!: string;
}
