import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @MaxLength(100, { message: 'Email tối đa 100 ký tự.' })
  email: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @Length(6, 50, { message: 'Mật khẩu phải từ 6 đến 50 ký tự.' })
  password: string;

  @IsString({ message: 'Mật khẩu xác nhận phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mật khẩu xác nhận không được để trống.' })
  confirmPassword: string;

  @IsString({ message: 'Họ tên phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Họ tên không được để trống.' })
  @Length(2, 50, { message: 'Họ tên phải từ 2 đến 50 ký tự.' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự.' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự.' })
  @MaxLength(200, { message: 'Địa chỉ tối đa 200 ký tự.' })
  address?: string;
}
