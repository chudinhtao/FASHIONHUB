import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'supersecretjwtkeyforfashionhubprojectin2026',
    });
  }

  async validate(payload: any) {
    // Giá trị trả về này sẽ được gán vào request.user
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
