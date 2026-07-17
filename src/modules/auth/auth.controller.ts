import { Controller, Post, Get, Put, Body, Req, Res, UseGuards, HttpStatus, HttpCode, UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { Response, Request } from 'express';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ErrorMessages } from '../../common/constants/error-messages.constant';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Đăng ký tài khoản khách hàng mới.
   */
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return {
      message: 'Đăng ký tài khoản thành công.',
      data: user,
    };
  }

  /**
   * Đăng nhập hệ thống bằng email và password.
   * Sử dụng LocalAuthGuard để chạy LocalStrategy.
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto, // Giữ để Swagger/Validator đọc DTO
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(req.user);

    // Lưu Refresh Token vào Cookie HttpOnly
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return {
      message: 'Đăng nhập thành công.',
      data: {
        user,
        accessToken,
      },
    };
  }

  /**
   * Đăng xuất hệ thống, xóa cookie và refresh token DB.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.id);
    
    // Xóa cookie Refresh Token
    res.clearCookie('refreshToken', {
      path: '/api/v1/auth/refresh',
    });

    return {
      message: 'Đăng xuất thành công.',
    };
  }

  /**
   * Làm mới Access Token từ Refresh Token trong Cookie.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException(ErrorMessages.AUTH.REFRESH_TOKEN_EXPIRED);
    }

    const result = await this.authService.refresh(refreshToken);
    return {
      message: 'Làm mới token thành công.',
      data: result,
    };
  }

  /**
   * Lấy thông tin tài khoản hiện tại từ Access Token.
   */
  @Get('me')
  async getMe(@Req() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.AUTH.USER_NOT_FOUND);
    }

    const { password: _, refreshToken: __, ...result } = user;
    return {
      message: 'Lấy thông tin tài khoản thành công.',
      data: result,
    };
  }

  /**
   * Cập nhật thông tin tài khoản hiện tại.
   */
  @Put('me')
  async updateMe(@Req() req: any, @Body() body: { name: string; phone?: string; address?: string }) {
    if (!body.name) {
      throw new BadRequestException('Tên không được để trống.');
    }

    const updatedUser = await this.usersService.update(req.user.id, {
      name: body.name,
      phone: body.phone,
      address: body.address,
    });

    const { password: _, refreshToken: __, ...result } = updatedUser;
    return {
      message: 'Cập nhật thông tin tài khoản thành công.',
      data: result,
    };
  }

  /**
   * Yêu cầu khôi phục mật khẩu.
   * Trả về token reset tạm thời phục vụ demo/mockup của frontend.
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      throw new BadRequestException({
        message: 'Địa chỉ email này không tồn tại trong hệ thống.',
        error: 'Bad Request',
      } as any);
    }

    // Sinh token khôi phục tạm thời (JWT có hạn dùng 15 phút)
    const resetToken = await this.jwtServiceSignResetToken(user.id, user.email);

    // Trong thực tế, gửi qua Email. Ở đây trả về luôn để Frontend Mockup lấy làm demo
    return {
      message: 'Đã gửi hướng dẫn khôi phục mật khẩu tới email của bạn. Vui lòng kiểm tra hộp thư.',
      data: {
        resetToken, // Phục vụ demo khôi phục mật khẩu
      },
    };
  }

  /**
   * Đặt lại mật khẩu mới.
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    // Xác thực token và lấy thông tin người dùng
    const payload = await this.jwtServiceVerifyResetToken(token);
    
    // Mã hóa mật khẩu mới
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Cập nhật lại mật khẩu và reset trạng thái đếm sai mật khẩu
    await this.usersService.update(payload.sub, {
      password: hashedPassword,
      failedLoginAttempts: 0,
      lockUntil: null,
    });

    return {
      message: 'Đặt lại mật khẩu thành công.',
    };
  }

  // Helper sinh token reset mật khẩu nhanh
  private async jwtServiceSignResetToken(userId: string, email: string): Promise<string> {
    const jwtSecret = process.env.JWT_SECRET || 'supersecretjwtkeyforfashionhubprojectin2026';
    // Sử dụng thư viện dynamic import hoặc helper ký chay để tránh dependency loop
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { sub: userId, email, action: 'reset-password' },
      jwtSecret,
      { expiresIn: '15m' },
    );
  }

  // Helper verify token reset mật khẩu nhanh
  private async jwtServiceVerifyResetToken(token: string): Promise<any> {
    const jwtSecret = process.env.JWT_SECRET || 'supersecretjwtkeyforfashionhubprojectin2026';
    const jwt = require('jsonwebtoken');
    try {
      return jwt.verify(token, jwtSecret);
    } catch (e) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_TOKEN);
    }
  }
}
