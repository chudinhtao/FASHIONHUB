import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '8080', 10),
  uploadPath: process.env.UPLOAD_PATH || './uploads',
}));
