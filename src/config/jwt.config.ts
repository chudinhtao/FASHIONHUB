import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'supersecretjwtkeyforfashionhubprojectin2026',
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '900s',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
