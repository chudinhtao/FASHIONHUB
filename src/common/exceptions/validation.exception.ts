import { HttpException, HttpStatus } from '@nestjs/common';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Ngoại lệ dành cho các lỗi kiểm tra tính hợp lệ của dữ liệu đầu vào.
 * Chứa danh sách chi tiết (details) các trường bị lỗi và thông điệp tương ứng.
 * Trả về mã HTTP 400 Bad Request.
 */
export class ValidationException extends HttpException {
  constructor(details: ValidationErrorDetail[] | string, message: string = 'Validation Failed') {
    const errorDetails = typeof details === 'string' 
      ? [{ field: 'error', message: details }] 
      : details;

    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
        details: errorDetails,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
