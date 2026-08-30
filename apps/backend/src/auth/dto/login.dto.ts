import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber()
  phoneNumber!: string;

  @IsString()
  @Length(4, 6)
  pin!: string;
}
