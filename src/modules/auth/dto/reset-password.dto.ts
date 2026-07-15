import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Token phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Token không được để trống.' })
  token: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @Length(6, 50, { message: 'Mật khẩu mới phải từ 6 đến 50 ký tự.' })
  password: string;
}
