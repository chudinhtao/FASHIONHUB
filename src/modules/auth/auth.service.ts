import { Injectable, HttpStatus, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User, Role } from '@prisma/client';
import { ErrorMessages } from '../../common/constants/error-messages.constant';
import { BusinessException } from '../../common/exceptions';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Đăng ký tài khoản khách hàng mới.
   */
  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const { email, password, confirmPassword, name, phone, address } = registerDto;

    if (password !== confirmPassword) {
      throw new BusinessException('Mật khẩu xác nhận không khớp.', HttpStatus.BAD_REQUEST);
    }

    // Kiểm tra trùng email
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BusinessException(ErrorMessages.AUTH.EMAIL_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
    }

    // Băm mật khẩu
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Tạo mới trong DB (mặc định role là CUSTOMER)
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      name,
      phone,
      address,
      role: Role.CUSTOMER,
    });

    // Trả về thông tin ngoại trừ password
    const { password: _, ...result } = user;
    return result;
  }

  /**
   * Xác thực thông tin email và password cho LocalStrategy.
   * Xử lý cơ chế đếm số lần đăng nhập sai và khóa tài khoản chống brute-force.
   */
  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BusinessException(ErrorMessages.AUTH.USER_NOT_FOUND, HttpStatus.BAD_REQUEST);
    }

    // Kiểm tra trạng thái khóa tài khoản
    const now = new Date();
    if (user.lockUntil && now < user.lockUntil) {
      throw new BusinessException(
        'Tài khoản tạm thời bị khóa! Đã thử đăng nhập sai quá 5 lần liên tiếp. Vui lòng quay lại sau 15 phút.',
        HttpStatus.FORBIDDEN,
      );
    }

    // So khớp mật khẩu
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      // Tăng số lần đăng nhập sai
      const updatedUser = await this.usersService.incrementFailedAttempts(user.id);
      
      if (updatedUser.failedLoginAttempts >= 5) {
        // Đã sai 5 lần, tiến hành khóa trong 15 phút
        await this.usersService.lockAccount(user.id, 15);
        throw new BusinessException(
          'Tài khoản tạm thời bị khóa! Đã thử đăng nhập sai quá 5 lần liên tiếp. Vui lòng quay lại sau 15 phút.',
          HttpStatus.FORBIDDEN,
        );
      }

      throw new BusinessException(ErrorMessages.AUTH.WRONG_PASSWORD, HttpStatus.BAD_REQUEST);
    }

    // Nếu mật khẩu đúng, reset lại bộ đếm failed attempts và mở khóa (nếu có)
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      await this.usersService.resetFailedAttempts(user.id);
    }

    return user;
  }

  /**
   * Tạo cặp Access Token và Refresh Token khi đăng nhập thành công.
   */
  async login(user: User) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('jwt.accessExpiration') || '900s') as any,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: (this.configService.get<string>('jwt.refreshExpiration') || '7d') as any,
      },
    );

    // Hash refresh token để lưu vào database
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(user.id, {
      refreshToken: hashedRefreshToken,
    });

    const { password: _, refreshToken: __, ...userInfo } = user;

    return {
      user: userInfo,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Làm mới Access Token từ Refresh Token nhận được từ HttpOnly Cookie.
   */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException(ErrorMessages.AUTH.REFRESH_TOKEN_EXPIRED);
      }

      // So khớp hash của refresh token trong database
      const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException(ErrorMessages.AUTH.REFRESH_TOKEN_EXPIRED);
      }

      // Tạo Access Token mới
      const newPayload = { email: user.email, sub: user.id, role: user.role };
      const accessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: (this.configService.get<string>('jwt.accessExpiration') || '900s') as any,
      });

      return { accessToken };
    } catch (e) {
      throw new UnauthorizedException(ErrorMessages.AUTH.REFRESH_TOKEN_EXPIRED);
    }
  }

  /**
   * Đăng xuất hệ thống, xóa refresh token lưu trong database.
   */
  async logout(userId: string): Promise<void> {
    await this.usersService.update(userId, {
      refreshToken: null,
    });
  }
}
