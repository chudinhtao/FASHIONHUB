import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cấu hình prefix cho API
  app.setGlobalPrefix('api/v1');

  // Bảo mật ứng dụng
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Hỗ trợ frontend hiển thị ảnh tĩnh từ server
  }));
  app.use(cookieParser());

  // Cấu hình CORS
  app.enableCors({
    origin: true, // Tự động lấy origin của client gửi lên trong môi trường dev
    credentials: true, // Cho phép truyền và nhận cookie refresh token
  });

  // Tự động kiểm tra tính hợp lệ dữ liệu (DTO)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ thuộc tính không khai báo trong DTO
      transform: true, // Tự động map kiểu dữ liệu (ví dụ: query string sang number)
      forbidNonWhitelisted: true, // Báo lỗi khi gửi dữ liệu thừa
    }),
  );

  // Đăng ký filter và interceptor toàn cục
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
